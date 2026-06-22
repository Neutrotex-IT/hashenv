import mongoose, { Document, Schema } from 'mongoose';
import type { ProjectPermission } from '../lib/permissions';

export interface IProjectMember {
  userId: mongoose.Types.ObjectId;
  permission: 'read' | 'write';
  /** ABAC capabilities beyond read/write access. */
  permissions: ProjectPermission[];
}

export interface IProject extends Document {
  name: string;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  members: IProjectMember[];
  /** Allowed environment slugs for this project. */
  environments: string[];
  createdAt: Date;
}

const ProjectMemberSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [ProjectMemberSchema],
      default: [],
    },
    environments: {
      type: [String],
      default: ['dev', 'staging', 'prod'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ProjectSchema.index({ organizationId: 1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ 'members.userId': 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
