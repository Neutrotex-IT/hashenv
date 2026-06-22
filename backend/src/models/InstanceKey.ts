import mongoose, { Document, Schema } from 'mongoose';

export interface IInstanceKey extends Document {
  wrappedKey: Buffer;
  nonce: Buffer;
  authTag: Buffer;
  keyVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const InstanceKeySchema: Schema = new Schema(
  {
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
    keyVersion: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IInstanceKey>('InstanceKey', InstanceKeySchema);
