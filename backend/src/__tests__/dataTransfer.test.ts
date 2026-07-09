import { describe, expect, it } from 'vitest';
import {
  countExportedProjectItems,
  countExportableItems,
  DATA_TRANSFER_FORMAT_VERSION,
  parseImportPayload,
  type ExportedProject,
  type HashEnvExport,
} from '../lib/dataTransfer';

function sampleProject(overrides: Partial<ExportedProject> = {}): ExportedProject {
  return {
    name: 'Demo',
    environments: ['dev'],
    components: [
      {
        name: 'API',
        slug: 'api',
        secretFiles: [{ environment: 'dev', fileName: '.env', fileType: 'env', version: 1, content: 'A=1' }],
        secrets: [{ name: 'TOKEN', content: 'secret' }],
      },
    ],
    associatedAccounts: [
      {
        label: 'AWS',
        provider: 'aws',
        email: 'ops@example.com',
        usesSSO: false,
        credentials: { password: 'pw', notes: '' },
      },
    ],
    ...overrides,
  };
}

describe('parseImportPayload', () => {
  it('accepts valid project-scoped v2 payloads', () => {
    const payload = parseImportPayload({
      formatVersion: DATA_TRANSFER_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      scope: 'project',
      project: sampleProject(),
    });

    expect(payload.scope).toBe('project');
    expect(payload.project?.name).toBe('Demo');
  });

  it('accepts organization and panic scopes with projects array', () => {
    const payload = parseImportPayload({
      formatVersion: '2.0',
      exportedAt: new Date().toISOString(),
      scope: 'organization',
      projects: [sampleProject()],
    });

    expect(payload.scope).toBe('organization');
    expect(payload.projects).toHaveLength(1);
  });

  it('infers scope from payload shape when scope is missing', () => {
    const projectPayload = parseImportPayload({
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      project: sampleProject(),
    });
    expect(projectPayload.scope).toBe('project');

    const orgPayload = parseImportPayload({
      formatVersion: '1.0',
      exportedAt: new Date().toISOString(),
      projects: [sampleProject()],
    });
    expect(orgPayload.scope).toBe('organization');
  });

  it('rejects unsupported format versions and malformed payloads', () => {
    expect(() => parseImportPayload(null)).toThrow(/expected a JSON object/);
    expect(() => parseImportPayload({ formatVersion: '9.9', project: sampleProject() })).toThrow(
      /Unsupported format version/
    );
    expect(() =>
      parseImportPayload({ formatVersion: '2.0', scope: 'project', exportedAt: new Date().toISOString() })
    ).toThrow(/missing project data/);
    expect(() =>
      parseImportPayload({ formatVersion: '2.0', scope: 'organization', exportedAt: new Date().toISOString() })
    ).toThrow(/missing projects array/);
  });
});

describe('export item counting', () => {
  it('counts secret files, secrets, and accounts in a project export', () => {
    const project = sampleProject({
      components: [
        {
          name: 'API',
          slug: 'api',
          secretFiles: [
            { environment: 'dev', fileName: '.env', fileType: 'env', version: 1, content: 'A=1' },
            { environment: 'prod', fileName: '.env', fileType: 'env', version: 1, content: 'A=2' },
          ],
          secrets: [{ name: 'TOKEN', content: 'secret' }],
        },
      ],
      associatedAccounts: [
        {
          label: 'AWS',
          provider: 'aws',
          email: 'ops@example.com',
          usesSSO: false,
          credentials: { password: 'pw', notes: '' },
        },
      ],
    });

    expect(countExportedProjectItems(project)).toBe(4);
  });

  it('includes legacy v1 envFiles and secrets in project counts', () => {
    const project = sampleProject({
      components: [],
      envFiles: [{ environment: 'dev', version: 1, content: 'A=1' }],
      secrets: [{ name: 'LEGACY', content: 'value' }],
      associatedAccounts: [],
    });

    expect(countExportedProjectItems(project)).toBe(2);
  });

  it('counts items across project and organization exports', () => {
    const projectExport: HashEnvExport = {
      formatVersion: DATA_TRANSFER_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      scope: 'project',
      project: sampleProject(),
    };
    const orgExport: HashEnvExport = {
      formatVersion: DATA_TRANSFER_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      scope: 'organization',
      projects: [sampleProject(), sampleProject({ name: 'Other' })],
    };

    expect(countExportableItems(projectExport)).toBe(3);
    expect(countExportableItems(orgExport)).toBe(6);
  });
});
