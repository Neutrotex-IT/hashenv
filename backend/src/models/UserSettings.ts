import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  flushDuration?: number | null; // Time interval in hours (1-1000), null means disabled
  lastFlushAt?: Date | null; // Last auto-flush execution time
  panicButton: {
    flushEnvs: boolean;
    flushSecrets: boolean;
    revokeApiTokens: boolean;
    revokeCollaborators: boolean;
    downloadEnvs: boolean;
    askConfirmation: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    flushDuration: {
      type: Number,
      default: null, // null means disabled
      min: [1, 'Flush duration must be at least 1 hour'],
      max: [1000, 'Flush duration must be at most 1000 hours'],
      validate: {
        validator: function(value: number | null | undefined) {
          // Allow null/undefined (disabled) or values between 1 and 1000
          return value === null || value === undefined || (value >= 1 && value <= 1000);
        },
        message: 'Flush duration must be between 1 and 1000 hours, or null to disable',
      },
    },
    lastFlushAt: {
      type: Date,
      default: null,
    },
    panicButton: {
      flushEnvs: {
        type: Boolean,
        default: false,
      },
      flushSecrets: {
        type: Boolean,
        default: false,
      },
      revokeApiTokens: {
        type: Boolean,
        default: false,
      },
      revokeCollaborators: {
        type: Boolean,
        default: false,
      },
      downloadEnvs: {
        type: Boolean,
        default: false,
      },
      askConfirmation: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Note: userId index is automatically created by unique: true

export default mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
