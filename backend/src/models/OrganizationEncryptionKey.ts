import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganizationEncryptionKey extends Document {
  organizationId: mongoose.Types.ObjectId;
  wrappedKey: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  createdAt: Date;
}

const OrganizationEncryptionKeySchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    wrappedKey: {
      type: Buffer,
      required: true,
    },
    nonce: {
      type: Buffer,
      required: true,
    },
    authTag: {
      type: Buffer,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export default mongoose.model<IOrganizationEncryptionKey>('OrganizationEncryptionKey', OrganizationEncryptionKeySchema);
