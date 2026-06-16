import { Request } from 'express';
import AuditLog, { ResourceType, ActorType } from '../models/AuditLog';

export interface AuditOptions {
  organizationId?: string;
  projectId?: string;
  resourceType: ResourceType;
  resourceId?: string;
  action: string;
  actorType?: ActorType;
  actorId: string;
  actorEmail?: string;
  metadata?: Record<string, any>;
  req?: Request;
}

export async function audit(options: AuditOptions): Promise<void> {
  const {
    organizationId,
    projectId,
    resourceType,
    resourceId,
    action,
    actorType = 'user',
    actorId,
    actorEmail,
    metadata,
    req,
  } = options;

  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown'
      : undefined;

    const userAgent = req?.headers['user-agent']?.substring(0, 500);

    await AuditLog.create({
      organizationId,
      projectId,
      resourceType,
      resourceId,
      action,
      actorType,
      actorId,
      actorEmail,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error instanceof Error ? error.message : 'Unknown error');
  }
}

export async function auditEnv(
  projectId: string,
  actorId: string,
  action: 'upload' | 'download' | 'edit' | 'delete' | 'view',
  envFileId?: string,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    projectId,
    resourceType: 'env',
    resourceId: envFileId,
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditSecret(
  projectId: string,
  actorId: string,
  action: 'create' | 'read' | 'update' | 'delete',
  secretId?: string,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    projectId,
    resourceType: 'secret',
    resourceId: secretId,
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditAccount(
  projectId: string,
  actorId: string,
  action: 'create' | 'read' | 'update' | 'delete',
  accountId?: string,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    projectId,
    resourceType: 'account',
    resourceId: accountId,
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditProject(
  projectId: string,
  organizationId: string,
  actorId: string,
  action: 'create' | 'update' | 'delete' | 'add_member' | 'remove_member' | 'update_member',
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    organizationId,
    projectId,
    resourceType: 'project',
    resourceId: projectId,
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditOrg(
  organizationId: string,
  actorId: string,
  action: 'create' | 'update' | 'delete' | 'add_member' | 'remove_member' | 'update_member',
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    organizationId,
    resourceType: 'org',
    resourceId: organizationId,
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditSession(
  actorId: string,
  action: 'login' | 'logout' | 'refresh' | 'register',
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    resourceType: 'session',
    action,
    actorId,
    metadata,
    req,
  });
}

export async function auditPanic(
  actorId: string,
  metadata?: Record<string, any>,
  req?: Request
): Promise<void> {
  await audit({
    resourceType: 'panic',
    action: 'execute',
    actorId,
    metadata,
    req,
  });
}
