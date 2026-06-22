import { encrypt, decrypt } from './primitives';
import { getProjectEncryptionKey } from './key-store';
import Project from '../models/Project';

export interface EncryptedData {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

async function getProjectOrgId(projectId: string): Promise<string> {
  const project = await Project.findById(projectId).select('organizationId');
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  return project.organizationId.toString();
}

export async function encryptProjectData(projectId: string, plaintext: string): Promise<EncryptedData> {
  const organizationId = await getProjectOrgId(projectId);
  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  
  const result = encrypt(Buffer.from(plaintext, 'utf8'), projectKey);
  
  return {
    encryptedData: result.ciphertext,
    iv: result.nonce,
    authTag: result.authTag,
  };
}

export async function decryptProjectData(
  projectId: string,
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer
): Promise<string> {
  const organizationId = await getProjectOrgId(projectId);
  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  
  const plaintext = decrypt(encryptedData, projectKey, iv, authTag);
  
  return plaintext.toString('utf8');
}

export async function encryptProjectDataWithOrgId(
  projectId: string,
  organizationId: string,
  plaintext: string
): Promise<EncryptedData> {
  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  
  const result = encrypt(Buffer.from(plaintext, 'utf8'), projectKey);
  
  return {
    encryptedData: result.ciphertext,
    iv: result.nonce,
    authTag: result.authTag,
  };
}

export async function decryptProjectDataWithOrgId(
  projectId: string,
  organizationId: string,
  encryptedData: Buffer,
  iv: Buffer,
  authTag: Buffer
): Promise<string> {
  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  
  const plaintext = decrypt(encryptedData, projectKey, iv, authTag);
  
  return plaintext.toString('utf8');
}
