import mongoose, { Document, Schema } from 'mongoose';

export interface IComponent extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComponentSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Component name is required'],
      trim: true,
      maxlength: [100, 'Component name must be less than 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ComponentSchema.index({ projectId: 1, slug: 1 }, { unique: true });

export default mongoose.model<IComponent>('Component', ComponentSchema);
