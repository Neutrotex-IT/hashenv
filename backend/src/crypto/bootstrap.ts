import { initializeKeyStore } from './key-store';
import InstanceKey from '../models/InstanceKey';
import SecretFile from '../models/SecretFile';
import Secret from '../models/Secret';
import AssociatedAccount from '../models/AssociatedAccount';

export interface EncryptionStatus {
  initialized: boolean;
  hasInstanceKey: boolean;
  hasEncryptedData: boolean;
  error?: string;
}

let encryptionStatus: EncryptionStatus = {
  initialized: false,
  hasInstanceKey: false,
  hasEncryptedData: false,
};

export async function bootstrapEncryption(): Promise<void> {
  try {
    const rootKey = process.env.ROOT_ENCRYPTION_KEY;
    if (!rootKey || rootKey.length < 32) {
      throw new Error('ROOT_ENCRYPTION_KEY must be set and at least 32 characters long');
    }
    
    const instanceKeyDoc = await InstanceKey.findOne();
    encryptionStatus.hasInstanceKey = !!instanceKeyDoc;
    
    const [secretFileCount, secretCount, accountCount] = await Promise.all([
      SecretFile.countDocuments(),
      Secret.countDocuments(),
      AssociatedAccount.countDocuments(),
    ]);
    encryptionStatus.hasEncryptedData = (secretFileCount + secretCount + accountCount) > 0;
    
    if (!instanceKeyDoc && encryptionStatus.hasEncryptedData) {
      throw new Error(
        'CRITICAL: Encrypted data exists but no instance key found. ' +
        'This may indicate data corruption or an incomplete database restore. ' +
        'Cannot proceed without instance key.'
      );
    }
    
    await initializeKeyStore();
    
    encryptionStatus.initialized = true;
    encryptionStatus.hasInstanceKey = true;
    console.log('[Crypto] Encryption system bootstrapped successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    encryptionStatus.error = message;
    console.error('[Crypto] Bootstrap failed:', message);
    throw error;
  }
}

export function getEncryptionStatus(): EncryptionStatus {
  return { ...encryptionStatus };
}

export function isEncryptionReady(): boolean {
  return encryptionStatus.initialized && !encryptionStatus.error;
}

/** Reset module state between integration tests after DB wipe + clearKeyCache(). */
export function resetEncryptionStatusForTests(): void {
  encryptionStatus = {
    initialized: false,
    hasInstanceKey: false,
    hasEncryptedData: false,
  };
}
