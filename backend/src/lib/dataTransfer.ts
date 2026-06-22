import EnvFile from '../models/EnvFile';
import Secret from '../models/Secret';
import AssociatedAccount, { ACCOUNT_PROVIDERS } from '../models/AssociatedAccount';
import Organization from '../models/Organization';
import Project, { IProject } from '../models/Project';
import { decryptProjectData, encryptProjectData, createProjectEncryptionKey } from '../crypto';
import {
  getProjectEnvironments,
  MAX_ENVIRONMENTS_PER_PROJECT,
  isValidEnvSlug,
  normalizeEnvSlug,
} from './environments';
import { auditEnv, auditSecret, auditAccount } from './audit';
import type { Request } from 'express';

export const DATA_TRANSFER_FORMAT_VERSION = '1.0';

export interface ExportedEnvFile {
  environment: string;
  version: number;
  content: string;
}

export interface ExportedSecret {
  name: string;
  content: string;
}

export interface ExportedAccount {
  label: string;
  provider: string;
  providerOther?: string;
  email: string;
  loginUrl?: string;
  usesSSO: boolean;
  ssoProvider?: string;
  credentials: {
    password: string;
    notes: string;
  };
}

export interface ExportedProject {
  name: string;
  environments: string[];
  envFiles: ExportedEnvFile[];
  secrets: ExportedSecret[];
  associatedAccounts: ExportedAccount[];
}

export interface HashEnvExport {
  formatVersion: string;
  exportedAt: string;
  exportedBy?: { email: string; name?: string };
  scope: 'project' | 'organization' | 'panic';
  organization?: { name: string; slug: string; type: string };
  project?: ExportedProject;
  projects?: ExportedProject[];
}

export interface ImportSummary {
  envFilesImported: number;
  secretsCreated: number;
  secretsUpdated: number;
  secretsSkipped: number;
  accountsCreated: number;
  accountsUpdated: number;
  accountsSkipped: number;
  environmentsAdded: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
}

export interface ImportResult {
  success: boolean;
  summary: ImportSummary;
  warnings: string[];
}

async function decryptAccountCredentials(
  projectId: string,
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer
): Promise<{ password: string; notes: string }> {
  const decrypted = await decryptProjectData(projectId, encryptedData, iv, authTag);
  try {
    const parsed = JSON.parse(decrypted) as { password?: string; notes?: string };
    return { password: parsed.password || '', notes: parsed.notes || '' };
  } catch {
    return { password: decrypted, notes: '' };
  }
}

async function encryptAccountCredentials(projectId: string, password: string, notes: string) {
  const payload = JSON.stringify({ password: password || '', notes: notes || '' });
  return encryptProjectData(projectId, payload);
}

export async function exportProjectData(project: IProject): Promise<ExportedProject> {
  const projectId = project._id.toString();
  const environments = getProjectEnvironments(project);

  const allEnvFiles = await EnvFile.find({ projectId }).sort({ version: -1 });
  const latestByEnv = new Map<string, (typeof allEnvFiles)[number]>();
  for (const envFile of allEnvFiles) {
    const env = envFile.environment;
    if (!latestByEnv.has(env)) {
      latestByEnv.set(env, envFile);
    }
  }

  const envFiles: ExportedEnvFile[] = [];
  for (const [environment, envFile] of latestByEnv) {
    try {
      const content = await decryptProjectData(
        projectId,
        envFile.encryptedData,
        envFile.iv,
        envFile.authTag
      );
      envFiles.push({
        environment,
        version: envFile.version,
        content,
      });
    } catch (error) {
      console.error(`Export: failed to decrypt env ${project.name}/${environment}:`, error);
    }
  }

  const secrets = await Secret.find({ projectId });
  const exportedSecrets: ExportedSecret[] = [];
  for (const secret of secrets) {
    try {
      const content = await decryptProjectData(
        projectId,
        secret.encryptedData,
        secret.iv,
        secret.authTag
      );
      exportedSecrets.push({ name: secret.name, content });
    } catch (error) {
      console.error(`Export: failed to decrypt secret ${project.name}/${secret.name}:`, error);
    }
  }

  const accounts = await AssociatedAccount.find({ projectId });
  const exportedAccounts: ExportedAccount[] = [];
  for (const account of accounts) {
    try {
      const credentials = await decryptAccountCredentials(
        projectId,
        account.encryptedData,
        account.iv,
        account.authTag
      );
      exportedAccounts.push({
        label: account.label,
        provider: account.provider,
        providerOther: account.providerOther,
        email: account.email,
        loginUrl: account.loginUrl,
        usesSSO: account.usesSSO,
        ssoProvider: account.ssoProvider,
        credentials,
      });
    } catch (error) {
      console.error(`Export: failed to decrypt account ${project.name}/${account.label}:`, error);
    }
  }

  envFiles.sort((a, b) => a.environment.localeCompare(b.environment));
  exportedSecrets.sort((a, b) => a.name.localeCompare(b.name));
  exportedAccounts.sort((a, b) => a.label.localeCompare(b.label));

  return {
    name: project.name,
    environments,
    envFiles,
    secrets: exportedSecrets,
    associatedAccounts: exportedAccounts,
  };
}

export async function buildProjectExport(
  project: IProject,
  exportedBy?: { email: string; name?: string }
): Promise<HashEnvExport> {
  const org = await Organization.findById(project.organizationId);
  const exportedProject = await exportProjectData(project);

  return {
    formatVersion: DATA_TRANSFER_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    scope: 'project',
    organization: org
      ? { name: org.name, slug: org.slug, type: org.type }
      : undefined,
    project: exportedProject,
  };
}

export async function buildOrganizationExport(
  organizationId: string,
  projects: IProject[],
  exportedBy?: { email: string; name?: string }
): Promise<HashEnvExport> {
  const org = await Organization.findById(organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }

  const exportedProjects: ExportedProject[] = [];
  for (const project of projects) {
    exportedProjects.push(await exportProjectData(project));
  }
  exportedProjects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    formatVersion: DATA_TRANSFER_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    scope: 'organization',
    organization: { name: org.name, slug: org.slug, type: org.type },
    projects: exportedProjects,
  };
}

export function countExportedProjectItems(project: ExportedProject): number {
  return (
    (project.envFiles?.length ?? 0) +
    (project.secrets?.length ?? 0) +
    (project.associatedAccounts?.length ?? 0)
  );
}

export function countExportableItems(payload: HashEnvExport): number {
  if (payload.scope === 'project' && payload.project) {
    return countExportedProjectItems(payload.project);
  }

  const projects = payload.projects ?? [];
  return projects.reduce((sum, project) => sum + countExportedProjectItems(project), 0);
}

export async function buildPanicBackupExport(
  projects: IProject[],
  exportedBy?: { email: string; name?: string }
): Promise<HashEnvExport> {
  const exportedProjects: ExportedProject[] = [];
  for (const project of projects) {
    exportedProjects.push(await exportProjectData(project));
  }
  exportedProjects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    formatVersion: DATA_TRANSFER_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    scope: 'panic',
    projects: exportedProjects,
  };
}

function emptySummary(): ImportSummary {
  return {
    envFilesImported: 0,
    secretsCreated: 0,
    secretsUpdated: 0,
    secretsSkipped: 0,
    accountsCreated: 0,
    accountsUpdated: 0,
    accountsSkipped: 0,
    environmentsAdded: 0,
    projectsCreated: 0,
    projectsUpdated: 0,
    projectsSkipped: 0,
  };
}

export function parseImportPayload(raw: unknown): HashEnvExport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid import file: expected a JSON object');
  }

  const payload = raw as HashEnvExport;
  if (payload.formatVersion !== DATA_TRANSFER_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${payload.formatVersion ?? 'missing'}`);
  }

  if (payload.scope === 'project') {
    if (!payload.project) {
      throw new Error('Invalid project import file: missing project data');
    }
  } else if (payload.scope === 'organization' || payload.scope === 'panic') {
    if (!payload.projects || !Array.isArray(payload.projects) || payload.projects.length === 0) {
      throw new Error('Invalid import file: missing projects array');
    }
  } else if (payload.project) {
    // Allow legacy/minimal files with project only
    payload.scope = 'project';
  } else if (payload.projects?.length) {
    payload.scope = 'organization';
  } else {
    throw new Error('Invalid import file: no project data found');
  }

  return payload;
}

async function ensureProjectEnvironment(
  project: IProject,
  environment: string,
  summary: ImportSummary,
  warnings: string[]
): Promise<boolean> {
  const slug = normalizeEnvSlug(environment);
  if (!isValidEnvSlug(slug)) {
    warnings.push(`Skipped env "${environment}": invalid environment slug`);
    return false;
  }

  const environments = getProjectEnvironments(project);
  if (environments.includes(slug)) {
    return true;
  }

  if (environments.length >= MAX_ENVIRONMENTS_PER_PROJECT) {
    warnings.push(`Skipped env "${slug}": project has reached the environment limit`);
    return false;
  }

  project.environments = [...environments, slug];
  await project.save();
  summary.environmentsAdded += 1;
  return true;
}

async function importEnvFile(
  project: IProject,
  userId: string,
  envFile: ExportedEnvFile,
  summary: ImportSummary,
  warnings: string[],
  req?: Request
): Promise<void> {
  const projectId = project._id.toString();
  const allowed = await ensureProjectEnvironment(project, envFile.environment, summary, warnings);
  if (!allowed) return;

  const environment = normalizeEnvSlug(envFile.environment);
  if (!envFile.content || envFile.content.length > 50 * 1024) {
    warnings.push(`Skipped env "${environment}": content empty or exceeds 50KB`);
    return;
  }

  const latestEnvFile = await EnvFile.findOne({ projectId, environment }).sort({ version: -1 }).limit(1);
  const nextVersion = latestEnvFile ? latestEnvFile.version + 1 : 1;
  const { encryptedData, iv, authTag } = await encryptProjectData(projectId, envFile.content);

  const created = await EnvFile.create({
    projectId,
    environment,
    encryptedData,
    iv,
    authTag,
    version: nextVersion,
    uploadedBy: userId,
  });

  await auditEnv(projectId, userId, 'upload', created._id.toString(), { environment, version: nextVersion, source: 'import' }, req);
  summary.envFilesImported += 1;
}

async function importSecret(
  project: IProject,
  userId: string,
  secret: ExportedSecret,
  overwrite: boolean,
  summary: ImportSummary,
  warnings: string[],
  req?: Request
): Promise<void> {
  const projectId = project._id.toString();
  const name = secret.name?.trim();
  if (!name) {
    warnings.push('Skipped secret with empty name');
    return;
  }
  if (secret.content && secret.content.length > 50 * 1024) {
    warnings.push(`Skipped secret "${name}": content exceeds 50KB`);
    return;
  }

  const existing = await Secret.findOne({ projectId, name });
  const { encryptedData, iv, authTag } = await encryptProjectData(projectId, secret.content || '');

  if (existing) {
    if (!overwrite) {
      summary.secretsSkipped += 1;
      warnings.push(`Secret "${name}" already exists, skipped`);
      return;
    }
    existing.encryptedData = encryptedData;
    existing.iv = iv;
    existing.authTag = authTag;
    await existing.save();
    await auditSecret(projectId, userId, 'update', existing._id.toString(), { secretName: name, source: 'import' }, req);
    summary.secretsUpdated += 1;
    return;
  }

  const created = await Secret.create({
    projectId,
    name,
    encryptedData,
    iv,
    authTag,
    createdBy: userId,
  });
  await auditSecret(projectId, userId, 'create', created._id.toString(), { secretName: name, source: 'import' }, req);
  summary.secretsCreated += 1;
}

async function importAccount(
  project: IProject,
  userId: string,
  account: ExportedAccount,
  overwrite: boolean,
  summary: ImportSummary,
  warnings: string[],
  req?: Request
): Promise<void> {
  const projectId = project._id.toString();
  const label = account.label?.trim();
  if (!label) {
    warnings.push('Skipped account with empty label');
    return;
  }

  const provider = account.provider as (typeof ACCOUNT_PROVIDERS)[number];
  if (!ACCOUNT_PROVIDERS.includes(provider)) {
    warnings.push(`Skipped account "${label}": invalid provider "${account.provider}"`);
    return;
  }

  if (provider === 'other' && !account.providerOther?.trim()) {
    warnings.push(`Skipped account "${label}": providerOther required for "other"`);
    return;
  }

  if (account.usesSSO && !account.ssoProvider?.trim()) {
    warnings.push(`Skipped account "${label}": ssoProvider required when usesSSO is true`);
    return;
  }

  if (!account.usesSSO && !account.credentials?.password?.trim()) {
    warnings.push(`Skipped account "${label}": password required when SSO is not used`);
    return;
  }

  const { encryptedData, iv, authTag } = await encryptAccountCredentials(
    projectId,
    account.credentials?.password || '',
    account.credentials?.notes || ''
  );

  const existing = await AssociatedAccount.findOne({ projectId, label });
  if (existing) {
    if (!overwrite) {
      summary.accountsSkipped += 1;
      warnings.push(`Account "${label}" already exists, skipped`);
      return;
    }
    existing.provider = provider;
    existing.providerOther = provider === 'other' ? account.providerOther?.trim() : undefined;
    existing.email = account.email.trim();
    existing.loginUrl = account.loginUrl?.trim() || undefined;
    existing.usesSSO = Boolean(account.usesSSO);
    existing.ssoProvider = account.usesSSO ? account.ssoProvider?.trim() : undefined;
    existing.encryptedData = encryptedData;
    existing.iv = iv;
    existing.authTag = authTag;
    await existing.save();
    await auditAccount(projectId, userId, 'update', existing._id.toString(), { label, source: 'import' }, req);
    summary.accountsUpdated += 1;
    return;
  }

  const created = await AssociatedAccount.create({
    projectId,
    label,
    provider,
    providerOther: provider === 'other' ? account.providerOther?.trim() : undefined,
    email: account.email.trim(),
    loginUrl: account.loginUrl?.trim() || undefined,
    usesSSO: Boolean(account.usesSSO),
    ssoProvider: account.usesSSO ? account.ssoProvider?.trim() : undefined,
    encryptedData,
    iv,
    authTag,
    createdBy: userId,
  });
  await auditAccount(projectId, userId, 'create', created._id.toString(), { label, source: 'import' }, req);
  summary.accountsCreated += 1;
}

export async function importProjectPayload(
  project: IProject,
  userId: string,
  exportedProject: ExportedProject,
  options: { overwrite?: boolean; req?: Request } = {}
): Promise<ImportResult> {
  const summary = emptySummary();
  const warnings: string[] = [];
  const overwrite = options.overwrite === true;

  for (const envSlug of exportedProject.environments || []) {
    await ensureProjectEnvironment(project, envSlug, summary, warnings);
  }

  for (const envFile of exportedProject.envFiles || []) {
    await importEnvFile(project, userId, envFile, summary, warnings, options.req);
  }

  for (const secret of exportedProject.secrets || []) {
    await importSecret(project, userId, secret, overwrite, summary, warnings, options.req);
  }

  for (const account of exportedProject.associatedAccounts || []) {
    await importAccount(project, userId, account, overwrite, summary, warnings, options.req);
  }

  summary.projectsUpdated += 1;

  return { success: true, summary, warnings };
}

export interface OrgImportContext {
  organizationId: string;
  userId: string;
  canCreateProject: boolean;
  writableProjectIds: Set<string>;
  overwrite?: boolean;
  req?: Request;
}

export async function importOrganizationPayload(
  payload: HashEnvExport,
  context: OrgImportContext
): Promise<ImportResult> {
  const summary = emptySummary();
  const warnings: string[] = [];
  const projects = payload.projects || (payload.project ? [payload.project] : []);

  const orgProjects = await Project.find({ organizationId: context.organizationId });
  const projectsByName = new Map(orgProjects.map((p) => [p.name.toLowerCase(), p]));

  for (const exportedProject of projects) {
    const name = exportedProject.name?.trim();
    if (!name) {
      warnings.push('Skipped project with empty name');
      summary.projectsSkipped += 1;
      continue;
    }

    let target = projectsByName.get(name.toLowerCase());

    if (target) {
      if (!context.writableProjectIds.has(target._id.toString())) {
        warnings.push(`Skipped project "${name}": no write access`);
        summary.projectsSkipped += 1;
        continue;
      }
    } else {
      if (!context.canCreateProject) {
        warnings.push(`Skipped project "${name}": missing org:create_project permission`);
        summary.projectsSkipped += 1;
        continue;
      }

      target = await Project.create({
        name,
        organizationId: context.organizationId,
        createdBy: context.userId,
        members: [],
        environments: exportedProject.environments?.length ? [...exportedProject.environments] : undefined,
      });
      await createProjectEncryptionKey(target._id.toString(), context.organizationId);
      projectsByName.set(name.toLowerCase(), target);
      summary.projectsCreated += 1;
    }

    const projectResult = await importProjectPayload(target, context.userId, exportedProject, {
      overwrite: context.overwrite,
      req: context.req,
    });

    summary.envFilesImported += projectResult.summary.envFilesImported;
    summary.secretsCreated += projectResult.summary.secretsCreated;
    summary.secretsUpdated += projectResult.summary.secretsUpdated;
    summary.secretsSkipped += projectResult.summary.secretsSkipped;
    summary.accountsCreated += projectResult.summary.accountsCreated;
    summary.accountsUpdated += projectResult.summary.accountsUpdated;
    summary.accountsSkipped += projectResult.summary.accountsSkipped;
    summary.environmentsAdded += projectResult.summary.environmentsAdded;
    warnings.push(...projectResult.warnings);
  }

  return { success: true, summary, warnings };
}
