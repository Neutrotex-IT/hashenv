import mongoose, { Document, Schema } from 'mongoose';

export type OrganizationType = 'personal' | 'team';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type: OrganizationType;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name must be less than 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Slug must be less than 100 characters'],
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    type: {
      type: String,
      enum: ['personal', 'team'],
      required: true,
      default: 'team',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OrganizationSchema.index({ createdBy: 1 });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
