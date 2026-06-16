import mongoose, { Document, Schema } from 'mongoose';

export const ACCOUNT_PROVIDERS = [
  'google',
  'microsoft',
  'github',
  'aws',
  'slack',
  'stripe',
  'vercel',
  'other',
] as const;

export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number];

export interface IAssociatedAccount extends Document {
  projectId: mongoose.Types.ObjectId;
  label: string;
  provider: AccountProvider;
  providerOther?: string;
  email: string;
  loginUrl?: string;
  usesSSO: boolean;
  ssoProvider?: string;
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssociatedAccountSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    label: {
      type: String,
      required: [true, 'Account label is required'],
      trim: true,
      maxlength: [100, 'Label must be less than 100 characters'],
    },
    provider: {
      type: String,
      enum: ACCOUNT_PROVIDERS,
      required: true,
    },
    providerOther: {
      type: String,
      trim: true,
      maxlength: [50, 'Provider name must be less than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email or username is required'],
      trim: true,
      maxlength: [200, 'Email must be less than 200 characters'],
    },
    loginUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Login URL must be less than 500 characters'],
    },
    usesSSO: {
      type: Boolean,
      default: false,
    },
    ssoProvider: {
      type: String,
      trim: true,
      maxlength: [100, 'SSO provider must be less than 100 characters'],
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

AssociatedAccountSchema.index({ projectId: 1, label: 1 }, { unique: true });
AssociatedAccountSchema.index({ projectId: 1 });

export default mongoose.model<IAssociatedAccount>('AssociatedAccount', AssociatedAccountSchema);
