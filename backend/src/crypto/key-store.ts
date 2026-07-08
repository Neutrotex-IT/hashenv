import { generateKey, wrapKey, unwrapKey, deriveKeyFromSecret } from './primitives';
import InstanceKey from '../models/InstanceKey';
import OrganizationEncryptionKey from '../models/OrganizationEncryptionKey';
import ProjectEncryptionKey from '../models/ProjectEncryptionKey';
import ComponentEncryptionKey from '../models/ComponentEncryptionKey';

let instanceKeyCache: Buffer | null = null;
const orgKeyCache = new Map<string, Buffer>();
const projectKeyCache = new Map<string, Buffer>();
const componentKeyCache = new Map<string, Buffer>();

function getRootKey(): Buffer {
  const rootSecret = process.env.ROOT_ENCRYPTION_KEY;
  if (!rootSecret) {
    throw new Error('ROOT_ENCRYPTION_KEY environment variable is required');
  }
  return deriveKeyFromSecret(rootSecret);
}

export function getInstanceKey(): Buffer {
  if (!instanceKeyCache) {
    throw new Error('Instance key not initialized. Call initializeKeyStore() first.');
  }
  return instanceKeyCache;
}

export async function initializeKeyStore(): Promise<void> {
  const rootKey = getRootKey();
  
  let instanceKeyDoc = await InstanceKey.findOne();
  
  if (!instanceKeyDoc) {
    const newKey = generateKey();
    const wrapped = wrapKey(newKey, rootKey);
    
    instanceKeyDoc = await InstanceKey.create({
      wrappedKey: wrapped.ciphertext,
      nonce: wrapped.nonce,
      authTag: wrapped.authTag,
      keyVersion: 1,
    });
    
    instanceKeyCache = newKey;
    console.log('[Crypto] Instance key generated and stored (first boot)');
  } else {
    try {
      instanceKeyCache = unwrapKey(
        instanceKeyDoc.wrappedKey,
        rootKey,
        instanceKeyDoc.nonce,
        instanceKeyDoc.authTag
      );
      console.log('[Crypto] Instance key loaded and unwrapped successfully');
    } catch (error) {
      throw new Error('Failed to unwrap instance key. ROOT_ENCRYPTION_KEY may have changed.');
    }
  }
}

export async function createOrgEncryptionKey(organizationId: string): Promise<void> {
  const instanceKey = getInstanceKey();
  const orgKey = generateKey();
  const wrapped = wrapKey(orgKey, instanceKey);
  
  await OrganizationEncryptionKey.create({
    organizationId,
    wrappedKey: wrapped.ciphertext,
    nonce: wrapped.nonce,
    authTag: wrapped.authTag,
  });
  
  orgKeyCache.set(organizationId, orgKey);
}

export async function getOrgEncryptionKey(organizationId: string): Promise<Buffer> {
  const cached = orgKeyCache.get(organizationId);
  if (cached) return cached;
  
  const instanceKey = getInstanceKey();
  const keyDoc = await OrganizationEncryptionKey.findOne({ organizationId });
  
  if (!keyDoc) {
    throw new Error(`Organization encryption key not found: ${organizationId}`);
  }
  
  const orgKey = unwrapKey(keyDoc.wrappedKey, instanceKey, keyDoc.nonce, keyDoc.authTag);
  orgKeyCache.set(organizationId, orgKey);
  
  return orgKey;
}

export async function deleteOrgEncryptionKey(organizationId: string): Promise<void> {
  await OrganizationEncryptionKey.deleteOne({ organizationId });
  orgKeyCache.delete(organizationId);
}

export async function createProjectEncryptionKey(projectId: string, organizationId: string): Promise<void> {
  const orgKey = await getOrgEncryptionKey(organizationId);
  const projectKey = generateKey();
  const wrapped = wrapKey(projectKey, orgKey);
  
  await ProjectEncryptionKey.create({
    projectId,
    wrappedKey: wrapped.ciphertext,
    nonce: wrapped.nonce,
    authTag: wrapped.authTag,
  });
  
  projectKeyCache.set(projectId, projectKey);
}

export async function getProjectEncryptionKey(projectId: string, organizationId: string): Promise<Buffer> {
  const cached = projectKeyCache.get(projectId);
  if (cached) return cached;
  
  const orgKey = await getOrgEncryptionKey(organizationId);
  const keyDoc = await ProjectEncryptionKey.findOne({ projectId });
  
  if (!keyDoc) {
    throw new Error(`Project encryption key not found: ${projectId}`);
  }
  
  const projectKey = unwrapKey(keyDoc.wrappedKey, orgKey, keyDoc.nonce, keyDoc.authTag);
  projectKeyCache.set(projectId, projectKey);
  
  return projectKey;
}

export async function deleteProjectEncryptionKey(projectId: string): Promise<void> {
  await ProjectEncryptionKey.deleteOne({ projectId });
  projectKeyCache.delete(projectId);
}

export async function createComponentEncryptionKey(
  componentId: string,
  projectId: string,
  organizationId: string
): Promise<void> {
  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  const componentKey = generateKey();
  const wrapped = wrapKey(componentKey, projectKey);

  await ComponentEncryptionKey.create({
    componentId,
    wrappedKey: wrapped.ciphertext,
    nonce: wrapped.nonce,
    authTag: wrapped.authTag,
  });

  componentKeyCache.set(componentId, componentKey);
}

export async function getComponentEncryptionKey(
  componentId: string,
  projectId: string,
  organizationId: string
): Promise<Buffer> {
  const cached = componentKeyCache.get(componentId);
  if (cached) return cached;

  const projectKey = await getProjectEncryptionKey(projectId, organizationId);
  const keyDoc = await ComponentEncryptionKey.findOne({ componentId });

  if (!keyDoc) {
    throw new Error(`Component encryption key not found: ${componentId}`);
  }

  const componentKey = unwrapKey(keyDoc.wrappedKey, projectKey, keyDoc.nonce, keyDoc.authTag);
  componentKeyCache.set(componentId, componentKey);

  return componentKey;
}

export async function deleteComponentEncryptionKey(componentId: string): Promise<void> {
  await ComponentEncryptionKey.deleteOne({ componentId });
  componentKeyCache.delete(componentId);
}

export function clearKeyCache(): void {
  instanceKeyCache = null;
  orgKeyCache.clear();
  projectKeyCache.clear();
  componentKeyCache.clear();
}

export async function reWrapInstanceKey(newRootSecret: string): Promise<number> {
  if (!instanceKeyCache) {
    throw new Error('Instance key not initialized');
  }
  
  const newRootKey = deriveKeyFromSecret(newRootSecret);
  const wrapped = wrapKey(instanceKeyCache, newRootKey);
  
  const instanceKeyDoc = await InstanceKey.findOne();
  if (!instanceKeyDoc) {
    throw new Error('Instance key document not found');
  }
  
  instanceKeyDoc.wrappedKey = wrapped.ciphertext;
  instanceKeyDoc.nonce = wrapped.nonce;
  instanceKeyDoc.authTag = wrapped.authTag;
  instanceKeyDoc.keyVersion += 1;
  await instanceKeyDoc.save();
  
  return instanceKeyDoc.keyVersion;
}
