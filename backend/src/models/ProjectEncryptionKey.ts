import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectEncryptionKey extends Document {
  projectId: mongoose.Types.ObjectId;
  wrappedKey: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  createdAt: Date;
}

const ProjectEncryptionKeySchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
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

export default mongoose.model<IProjectEncryptionKey>('ProjectEncryptionKey', ProjectEncryptionKeySchema);
