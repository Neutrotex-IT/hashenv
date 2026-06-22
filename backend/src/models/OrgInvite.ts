import mongoose, { Document, Schema } from 'mongoose';
import type { OrgRole } from './OrgMember';
import type { OrgPermission } from '../lib/permissions';

export type OrgInviteStatus = 'pending' | 'accepted' | 'revoked';

export interface IOrgInvite extends Document {
  organizationId: mongoose.Types.ObjectId;
  email: string;
  role: Exclude<OrgRole, 'owner'>;
  /** ABAC permissions granted on acceptance (for member invites). */
  permissions: OrgPermission[];
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  status: OrgInviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const OrgInviteSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      required: true,
      default: 'member',
    },
    permissions: {
      type: [String],
      default: [],
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      required: true,
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OrgInviteSchema.index({ organizationId: 1, email: 1, status: 1 });
OrgInviteSchema.index({ email: 1, status: 1 });

export default mongoose.model<IOrgInvite>('OrgInvite', OrgInviteSchema);
