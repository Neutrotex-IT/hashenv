import mongoose, { Document, Schema } from 'mongoose';

export interface ISecret extends Document {
  projectId: mongoose.Types.ObjectId;
  componentId: mongoose.Types.ObjectId;
  name: string;
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SecretSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    componentId: {
      type: Schema.Types.ObjectId,
      ref: 'Component',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Secret name is required'],
      trim: true,
      maxlength: [100, 'Secret name must be less than 100 characters'],
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

SecretSchema.index({ componentId: 1, name: 1 }, { unique: true });
SecretSchema.index({ projectId: 1 });

export default mongoose.model<ISecret>('Secret', SecretSchema);
