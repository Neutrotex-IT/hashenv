import { Request, Response } from 'express';
import User from '../models/User';
import EnvFile from '../models/EnvFile';
import Secret from '../models/Secret';
import AssociatedAccount from '../models/AssociatedAccount';
import { ProjectApiToken } from '../models/ProjectApiToken';
import { IProject } from '../models/Project';
import { auditPanic } from './audit';
import { buildPanicBackupExport, countExportableItems } from './dataTransfer';
import { PanicButtonSettings, hasConfiguredPanicActions } from './panicButton';

export interface PanicExecutionResults extends Record<string, unknown> {
  downloadEnvs: boolean;
  flushEnvs: boolean;
  flushSecrets: boolean;
  revokeApiTokens: boolean;
  revokeCollaborators: boolean;
}

export async function executePanicActions(
  userId: string,
  organizationId: string,
  projects: IProject[],
  panicButton: PanicButtonSettings,
  req?: Request
): Promise<PanicExecutionResults> {
  if (!hasConfiguredPanicActions(panicButton)) {
    throw new Error('No panic actions configured');
  }

  const {
    flushEnvs,
    flushSecrets,
    revokeApiTokens,
    revokeCollaborators,
    downloadEnvs,
  } = panicButton;

  const results: PanicExecutionResults = {
    downloadEnvs: false,
    flushEnvs: false,
    flushSecrets: false,
    revokeApiTokens: false,
    revokeCollaborators: false,
  };

  const projectIds = projects.map((project) => project._id);

  if (downloadEnvs) {
    try {
      const user = await User.findById(userId).select('name email');
      const backup = await buildPanicBackupExport(
        projects,
        user ? { email: user.email, name: user.name } : undefined
      );

      if (countExportableItems(backup) === 0) {
        results.downloadError =
          'Nothing to back up: no environment files, secrets, or associated accounts were found';
      } else {
        results.downloadEnvs = true;
        results.downloadContent = JSON.stringify(backup, null, 2);
        results.downloadFilename = `hashenv-backup-${Date.now()}.json`;
        results.downloadMimeType = 'application/json';
      }
    } catch (error) {
      console.error('Download backup error:', error);
      results.downloadError = error instanceof Error ? error.message : 'Failed to download backup';
    }
  }

  if (flushEnvs) {
    try {
      const countBefore = await EnvFile.countDocuments({ projectId: { $in: projectIds } });
      await EnvFile.deleteMany({ projectId: { $in: projectIds } });
      results.flushEnvs = true;
      results.flushedEnvCount = countBefore;
    } catch (error) {
      console.error('Flush envs error:', error);
      results.flushError = error instanceof Error ? error.message : 'Failed to flush envs';
    }
  }

  if (flushSecrets) {
    try {
      const secretCount = await Secret.countDocuments({ projectId: { $in: projectIds } });
      const accountCount = await AssociatedAccount.countDocuments({ projectId: { $in: projectIds } });
      await Secret.deleteMany({ projectId: { $in: projectIds } });
      await AssociatedAccount.deleteMany({ projectId: { $in: projectIds } });
      results.flushSecrets = true;
      results.flushedSecretCount = secretCount;
      results.flushedAccountCount = accountCount;
    } catch (error) {
      console.error('Flush secrets error:', error);
      results.flushSecretsError = error instanceof Error ? error.message : 'Failed to flush secrets';
    }
  }

  if (revokeApiTokens) {
    try {
      const tokenCount = await ProjectApiToken.countDocuments({ projectId: { $in: projectIds } });
      await ProjectApiToken.deleteMany({ projectId: { $in: projectIds } });
      results.revokeApiTokens = true;
      results.revokedTokenCount = tokenCount;
    } catch (error) {
      console.error('Revoke API tokens error:', error);
      results.revokeTokensError = error instanceof Error ? error.message : 'Failed to revoke API tokens';
    }
  }

  if (revokeCollaborators) {
    try {
      for (const project of projects) {
        project.members = [];
        await project.save();
      }
      results.revokeCollaborators = true;
    } catch (error) {
      console.error('Revoke collaborators error:', error);
      results.revokeError = error instanceof Error ? error.message : 'Failed to revoke collaborators';
    }
  }

  const panicMetadata = {
    downloadEnvs: results.downloadEnvs,
    flushEnvs: results.flushEnvs,
    flushSecrets: results.flushSecrets,
    revokeApiTokens: results.revokeApiTokens,
    revokeCollaborators: results.revokeCollaborators,
    projectCount: projects.length,
    organizationId,
  };

  await auditPanic(userId, panicMetadata, req, organizationId);

  return results;
}

export function sendPanicResponse(res: Response, results: PanicExecutionResults): void {
  res.json({
    success: true,
    results,
  });
}
