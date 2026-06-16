import mongoose, { Document, Schema } from 'mongoose';
import type { ProjectPermission } from '../lib/permissions';

export type ProjectInviteStatus = 'pending' | 'accepted' | 'revoked';

export interface IProjectInvite extends Document {
  projectId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  email: string;
  permission: 'read' | 'write';
  permissions: ProjectPermission[];
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  status: ProjectInviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProjectInviteSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
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
    permission: {
      type: String,
      enum: ['read', 'write'],
      required: true,
      default: 'read',
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

ProjectInviteSchema.index({ projectId: 1, email: 1, status: 1 });
ProjectInviteSchema.index({ email: 1, status: 1 });
ProjectInviteSchema.index({ token: 1 });

export default mongoose.model<IProjectInvite>('ProjectInvite', ProjectInviteSchema);
