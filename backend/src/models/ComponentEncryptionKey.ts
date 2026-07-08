import mongoose, { Document, Schema } from 'mongoose';

export interface IComponentEncryptionKey extends Document {
  componentId: mongoose.Types.ObjectId;
  wrappedKey: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  createdAt: Date;
}

const ComponentEncryptionKeySchema: Schema = new Schema(
  {
    componentId: {
      type: Schema.Types.ObjectId,
      ref: 'Component',
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

export default mongoose.model<IComponentEncryptionKey>(
  'ComponentEncryptionKey',
  ComponentEncryptionKeySchema
);
