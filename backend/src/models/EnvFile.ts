import mongoose, { Document, Schema } from 'mongoose';

export interface IEnvFile extends Document {
  projectId: mongoose.Types.ObjectId;
  environment: string;
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  version: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const EnvFileSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    environment: {
      type: String,
      required: [true, 'Environment is required'],
      index: true,
    },
    encryptedData: {
      type: Buffer,
      required: true,
    },
    iv: {
      type: Buffer,
      required: true,
    },
    authTag: {
      type: Buffer,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient queries: project + environment + version
// This index supports queries for latest versions per project+environment
EnvFileSchema.index({ projectId: 1, environment: 1, version: -1 });

export default mongoose.model<IEnvFile>('EnvFile', EnvFileSchema);
