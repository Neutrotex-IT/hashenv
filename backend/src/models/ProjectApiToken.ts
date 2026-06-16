import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export type ApiTokenScope = 'read' | 'write';

export interface IProjectApiToken extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  tokenHash: string;
  tokenPrefix: string; // First 8 chars for identification (e.g., "henv_abc")
  scopes: ApiTokenScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProjectApiTokenSchema = new Schema<IProjectApiToken>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  tokenPrefix: {
    type: String,
    required: true,
  },
  scopes: {
    type: [String],
    enum: ['read', 'write'],
    required: true,
    default: ['read'],
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ProjectApiTokenSchema.index({ projectId: 1, createdAt: -1 });

/**
 * Generate a new API token
 * Format: henv_<32 random chars>
 * Returns both the plaintext token (to show user once) and the hash (to store)
 */
export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  const token = `henv_${randomPart}`;
  const hash = hashApiToken(token);
  const prefix = token.substring(0, 12); // "henv_" + first 7 chars of random part
  
  return { token, hash, prefix };
}

/**
 * Hash an API token for storage/lookup
 */
export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const ProjectApiToken = mongoose.model<IProjectApiToken>('ProjectApiToken', ProjectApiTokenSchema);
