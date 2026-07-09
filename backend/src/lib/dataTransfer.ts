import Component from '../models/Component';
import SecretFile from '../models/SecretFile';
import Secret from '../models/Secret';
import AssociatedAccount, { ACCOUNT_PROVIDERS } from '../models/AssociatedAccount';
import Organization from '../models/Organization';
import Project, { IProject } from '../models/Project';
import {
  decryptProjectData,
  encryptProjectData,
  createProjectEncryptionKey,
  createComponentEncryptionKey,
  decryptComponentData,
  encryptComponentData,
} from '../crypto';
import {
  getProjectEnvironments,
  MAX_ENVIRONMENTS_PER_PROJECT,
  isValidEnvSlug,
  normalizeEnvSlug,
} from './environments';
import { auditSecretFile, auditSecret, auditAccount } from './audit';
import { slugFromComponentName } from './components';
import { contentTypeForSecretFile, inferSecretFileType, isAllowedSecretFileName, sanitizeSecretFileName } from './secretFiles';
import type { Request } from 'express';

export const DATA_TRANSFER_FORMAT_VERSION = '2.0';

export interface ExportedSecretFile {
  environment: string;
  fileName: string;
  fileType: string;
  version: number;
  content: string;
}

export interface ExportedSecret {
  name: string;
  content: string;
}

export interface ExportedComponent {
  name: string;
  slug: string;
  description?: string;
  secretFiles: ExportedSecretFile[];
  secrets: ExportedSecret[];
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
  components: ExportedComponent[];
  associatedAccounts: ExportedAccount[];
  /** @deprecated legacy v1.0 field */
  envFiles?: Array<{ environment: string; version: number; content: string }>;
  /** @deprecated legacy v1.0 field */
  secrets?: ExportedSecret[];
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
  secretFilesImported: number;
  secretsCreated: number;
  secretsUpdated: number;
  secretsSkipped: number;
  accountsCreated: number;
  accountsUpdated: number;
  accountsSkipped: number;
  environmentsAdded: number;
  componentsCreated: number;
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
  const components = await Component.find({ projectId }).sort({ name: 1 });
  const exportedComponents: ExportedComponent[] = [];

  for (const component of components) {
    const allSecretFiles = await SecretFile.find({ componentId: component._id }).sort({ version: -1 });
    const latestByKey = new Map<string, (typeof allSecretFiles)[number]>();
    for (const secretFile of allSecretFiles) {
      const key = `${secretFile.environment}::${secretFile.fileName}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, secretFile);
      }
    }

    const secretFiles: ExportedSecretFile[] = [];
    for (const secretFile of latestByKey.values()) {
      try {
        const content = await decryptComponentData(
          component._id.toString(),
          secretFile.encryptedData,
          secretFile.iv,
          secretFile.authTag
        );
        secretFiles.push({
          environment: secretFile.environment,
          fileName: secretFile.fileName,
          fileType: secretFile.fileType,
          version: secretFile.version,
          content,
        });
      } catch (error) {
        console.error(`Export: failed to decrypt secret file ${component.name}/${secretFile.fileName}:`, error);
      }
    }

    const componentSecrets = await Secret.find({ componentId: component._id });
    const exportedSecrets: ExportedSecret[] = [];
    for (const secret of componentSecrets) {
      try {
        const content = await decryptComponentData(
          component._id.toString(),
          secret.encryptedData,
          secret.iv,
          secret.authTag
        );
        exportedSecrets.push({ name: secret.name, content });
      } catch (error) {
        console.error(`Export: failed to decrypt secret ${component.name}/${secret.name}:`, error);
      }
    }

    secretFiles.sort((a, b) => a.environment.localeCompare(b.environment) || a.fileName.localeCompare(b.fileName));
    exportedSecrets.sort((a, b) => a.name.localeCompare(b.name));

    exportedComponents.push({
      name: component.name,
      slug: component.slug,
      description: component.description,
      secretFiles,
      secrets: exportedSecrets,
    });
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

  exportedAccounts.sort((a, b) => a.label.localeCompare(b.label));

  return {
    name: project.name,
    environments,
    components: exportedComponents,
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
    organization: org ? { name: org.name, slug: org.slug, type: org.type } : undefined,
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
  const componentItems = (project.components ?? []).reduce(
    (sum, component) => sum + (component.secretFiles?.length ?? 0) + (component.secrets?.length ?? 0),
    0
  );
  const legacyItems = (project.envFiles?.length ?? 0) + (project.secrets?.length ?? 0);
  return componentItems + legacyItems + (project.associatedAccounts?.length ?? 0);
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
    secretFilesImported: 0,
    secretsCreated: 0,
    secretsUpdated: 0,
    secretsSkipped: 0,
    accountsCreated: 0,
    accountsUpdated: 0,
    accountsSkipped: 0,
    environmentsAdded: 0,
    componentsCreated: 0,
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
  if (!['1.0', '2.0'].includes(payload.formatVersion)) {
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

async function ensureComponent(
  project: IProject,
  userId: string,
  componentData: Pick<ExportedComponent, 'name' | 'slug' | 'description'>,
  summary: ImportSummary
): Promise<Component> {
  const projectId = project._id.toString();
  const slug = componentData.slug || slugFromComponentName(componentData.name);
  let component = await Component.findOne({ projectId, slug });

  if (!component) {
    component = await Component.create({
      projectId,
      name: componentData.name,
      slug,
      description: componentData.description,
      createdBy: userId,
    });
    await createComponentEncryptionKey(component._id.toString(), projectId, project.organizationId.toString());
    summary.componentsCreated += 1;
  }

  return component;
}

async function importSecretFileRecord(
  project: IProject,
  component: Component,
  userId: string,
  secretFile: ExportedSecretFile,
  summary: ImportSummary,
  warnings: string[],
  req?: Request
): Promise<void> {
  const projectId = project._id.toString();
  const allowed = await ensureProjectEnvironment(project, secretFile.environment, summary, warnings);
  if (!allowed) return;

  const environment = normalizeEnvSlug(secretFile.environment);
  const fileName = sanitizeSecretFileName(secretFile.fileName || '.env');
  if (!isAllowedSecretFileName(fileName)) {
    warnings.push(`Skipped secrets file "${secretFile.fileName}": invalid file name or extension`);
    return;
  }
  if (!secretFile.content || secretFile.content.length > 50 * 1024) {
    warnings.push(`Skipped secrets file "${fileName}" (${environment}): content empty or exceeds 50KB`);
    return;
  }

  const fileType = (secretFile.fileType as any) || inferSecretFileType(fileName);
  const latest = await SecretFile.findOne({ componentId: component._id, environment, fileName })
    .sort({ version: -1 })
    .limit(1);
  const nextVersion = latest ? latest.version + 1 : 1;
  const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), secretFile.content);

  const created = await SecretFile.create({
    projectId,
    componentId: component._id,
    environment,
    fileName,
    fileType,
    encryptedData,
    iv,
    authTag,
    contentType: contentTypeForSecretFile(fileName, fileType),
    version: nextVersion,
    uploadedBy: userId,
  });

  await auditSecretFile(
    projectId,
    userId,
    'upload',
    created._id.toString(),
    { componentId: component._id.toString(), environment, fileName, version: nextVersion, source: 'import' },
    req
  );
  summary.secretFilesImported += 1;
}

async function importSecretRecord(
  project: IProject,
  component: Component,
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

  const existing = await Secret.findOne({ componentId: component._id, name });
  const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), secret.content || '');

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
    await auditSecret(
      projectId,
      userId,
      'update',
      existing._id.toString(),
      { secretName: name, componentId: component._id.toString(), source: 'import' },
      req
    );
    summary.secretsUpdated += 1;
    return;
  }

  const created = await Secret.create({
    projectId,
    componentId: component._id,
    name,
    encryptedData,
    iv,
    authTag,
    createdBy: userId,
  });
  await auditSecret(
    projectId,
    userId,
    'create',
    created._id.toString(),
    { secretName: name, componentId: component._id.toString(), source: 'import' },
    req
  );
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

function normalizeLegacyProject(exportedProject: ExportedProject): ExportedComponent[] {
  if (exportedProject.components?.length) {
    return exportedProject.components;
  }

  const legacyComponent: ExportedComponent = {
    name: 'Default',
    slug: 'default',
    secretFiles: (exportedProject.envFiles || []).map((envFile) => ({
      environment: envFile.environment,
      fileName: '.env',
      fileType: 'env',
      version: envFile.version,
      content: envFile.content,
    })),
    secrets: exportedProject.secrets || [],
  };

  return legacyComponent.secretFiles.length || legacyComponent.secrets.length ? [legacyComponent] : [];
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

  const components = normalizeLegacyProject(exportedProject);
  for (const componentData of components) {
    const component = await ensureComponent(project, userId, componentData, summary);

    for (const secretFile of componentData.secretFiles || []) {
      await importSecretFileRecord(project, component, userId, secretFile, summary, warnings, options.req);
    }

    for (const secret of componentData.secrets || []) {
      await importSecretRecord(project, component, userId, secret, overwrite, summary, warnings, options.req);
    }
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

    summary.secretFilesImported += projectResult.summary.secretFilesImported;
    summary.secretsCreated += projectResult.summary.secretsCreated;
    summary.secretsUpdated += projectResult.summary.secretsUpdated;
    summary.secretsSkipped += projectResult.summary.secretsSkipped;
    summary.accountsCreated += projectResult.summary.accountsCreated;
    summary.accountsUpdated += projectResult.summary.accountsUpdated;
    summary.accountsSkipped += projectResult.summary.accountsSkipped;
    summary.environmentsAdded += projectResult.summary.environmentsAdded;
    summary.componentsCreated += projectResult.summary.componentsCreated;
    warnings.push(...projectResult.warnings);
  }

  return { success: true, summary, warnings };
}
