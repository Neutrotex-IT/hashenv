import mongoose, { Document, Schema } from 'mongoose';

export type ResourceType = 'env' | 'secret' | 'account' | 'project' | 'org' | 'member' | 'session' | 'api_token' | 'panic';
export type ActorType = 'user' | 'api_token';

export interface IAuditLog extends Document {
  organizationId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  resourceType: ResourceType;
  resourceId?: string;
  action: string;
  actorType: ActorType;
  actorId: mongoose.Types.ObjectId;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    resourceType: {
      type: String,
      enum: ['env', 'secret', 'account', 'project', 'org', 'member', 'session', 'api_token', 'panic'],
      required: true,
    },
    resourceId: {
      type: String,
    },
    action: {
      type: String,
      required: true,
    },
    actorType: {
      type: String,
      enum: ['user', 'api_token'],
      required: true,
      default: 'user',
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorEmail: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ projectId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
