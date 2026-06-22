import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_PANIC_BUTTON_SETTINGS, PanicButtonSettings } from '../lib/panicButton';

export interface IOrganizationSettings extends Document {
  organizationId: mongoose.Types.ObjectId;
  panicButton: PanicButtonSettings;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSettingsSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    panicButton: {
      flushEnvs: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.flushEnvs,
      },
      flushSecrets: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.flushSecrets,
      },
      revokeApiTokens: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.revokeApiTokens,
      },
      revokeCollaborators: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.revokeCollaborators,
      },
      downloadEnvs: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.downloadEnvs,
      },
      askConfirmation: {
        type: Boolean,
        default: DEFAULT_PANIC_BUTTON_SETTINGS.askConfirmation,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.model<IOrganizationSettings>(
  'OrganizationSettings',
  OrganizationSettingsSchema
);
