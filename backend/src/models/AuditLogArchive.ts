import mongoose, { Document, Schema } from 'mongoose';
import type { ActorType, ResourceType } from './AuditLog';

/**
 * Cold archive of audit logs older than AUDIT_RETENTION_DAYS.
 * Same document shape as AuditLog; minimal indexes for rare reads.
 */
export interface IAuditLogArchive extends Document {
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
  metadata?: Record<string, unknown>;
  schemaVersion: number;
  createdAt: Date;
}

const AuditLogArchiveSchema: Schema = new Schema(
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
    },
    actorId: {
      type: Schema.Types.ObjectId,
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
    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'auditlogarchives',
  }
);

AuditLogArchiveSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLogArchive>('AuditLogArchive', AuditLogArchiveSchema);
