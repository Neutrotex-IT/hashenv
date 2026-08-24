import mongoose, { Document, Schema } from 'mongoose';
import { SECRET_FILE_TYPES } from '../lib/secretFiles';

export interface ISecretFile extends Document {
  projectId: mongoose.Types.ObjectId;
  componentId: mongoose.Types.ObjectId;
  environment: string;
  fileName: string;
  fileType: (typeof SECRET_FILE_TYPES)[number];
  label?: string;
  description?: string;
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  contentType?: string;
  version: number;
  uploadedBy: mongoose.Types.ObjectId;
  schemaVersion: number;
  createdAt: Date;
}

const SecretFileSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    componentId: {
      type: Schema.Types.ObjectId,
      ref: 'Component',
      required: true,
    },
    environment: {
      type: String,
      required: [true, 'Environment is required'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: 255,
    },
    fileType: {
      type: String,
      enum: SECRET_FILE_TYPES,
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [100, 'Label must be less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters'],
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
    contentType: {
      type: String,
      trim: true,
      maxlength: 100,
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
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique + latest-by-file sort (ESR: equality keys then version sort)
SecretFileSchema.index(
  { componentId: 1, environment: 1, fileName: 1, version: -1 },
  { unique: true }
);
// Aggregations: match projectId / projectId+componentId, sort version
SecretFileSchema.index({ projectId: 1, componentId: 1, version: -1 });

export default mongoose.model<ISecretFile>('SecretFile', SecretFileSchema);
