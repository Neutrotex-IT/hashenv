import { encrypt, decrypt } from './primitives';
import { getComponentEncryptionKey } from './key-store';
import Component from '../models/Component';
import Project from '../models/Project';
import type { EncryptedData } from './project-crypto';

async function getComponentContext(componentId: string): Promise<{ projectId: string; organizationId: string }> {
  const component = await Component.findById(componentId).select('projectId');
  if (!component) {
    throw new Error(`Component not found: ${componentId}`);
  }

  const project = await Project.findById(component.projectId).select('organizationId');
  if (!project) {
    throw new Error(`Project not found for component: ${componentId}`);
  }

  return {
    projectId: component.projectId.toString(),
    organizationId: project.organizationId.toString(),
  };
}

export async function encryptComponentData(componentId: string, plaintext: string): Promise<EncryptedData> {
  const { projectId, organizationId } = await getComponentContext(componentId);
  const componentKey = await getComponentEncryptionKey(componentId, projectId, organizationId);

  const result = encrypt(Buffer.from(plaintext, 'utf8'), componentKey);

  return {
    encryptedData: result.ciphertext,
    iv: result.nonce,
    authTag: result.authTag,
  };
}

export async function decryptComponentData(
  componentId: string,
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer
): Promise<string> {
  const { projectId, organizationId } = await getComponentContext(componentId);
  const componentKey = await getComponentEncryptionKey(componentId, projectId, organizationId);

  const plaintext = decrypt(encryptedData, componentKey, iv, authTag);

  return plaintext.toString('utf8');
}

export async function encryptComponentDataWithContext(
  componentId: string,
  projectId: string,
  organizationId: string,
  plaintext: string
): Promise<EncryptedData> {
  const componentKey = await getComponentEncryptionKey(componentId, projectId, organizationId);

  const result = encrypt(Buffer.from(plaintext, 'utf8'), componentKey);

  return {
    encryptedData: result.ciphertext,
    iv: result.nonce,
    authTag: result.authTag,
  };
}

export async function decryptComponentDataWithContext(
  componentId: string,
  projectId: string,
  organizationId: string,
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer
): Promise<string> {
  const componentKey = await getComponentEncryptionKey(componentId, projectId, organizationId);

  const plaintext = decrypt(encryptedData, componentKey, iv, authTag);

  return plaintext.toString('utf8');
}
