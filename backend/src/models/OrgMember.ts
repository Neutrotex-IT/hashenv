import mongoose, { Document, Schema } from 'mongoose';
import type { OrgPermission } from '../lib/permissions';

export type OrgRole = 'owner' | 'admin' | 'member';

export interface IOrgMember extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: OrgRole;
  /** ABAC grants beyond the member role defaults. */
  permissions: OrgPermission[];
  createdAt: Date;
}

const OrgMemberSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      required: true,
      default: 'member',
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OrgMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrgMemberSchema.index({ userId: 1 });
OrgMemberSchema.index({ organizationId: 1, role: 1 });

export default mongoose.model<IOrgMember>('OrgMember', OrgMemberSchema);
