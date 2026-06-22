export interface PanicButtonSettings {
  flushEnvs: boolean;
  flushSecrets: boolean;
  revokeApiTokens: boolean;
  revokeCollaborators: boolean;
  downloadEnvs: boolean;
  askConfirmation: boolean;
}

export const DEFAULT_PANIC_BUTTON_SETTINGS: PanicButtonSettings = {
  flushEnvs: false,
  flushSecrets: false,
  revokeApiTokens: false,
  revokeCollaborators: false,
  downloadEnvs: false,
  askConfirmation: true,
};

export function mergePanicButtonSettings(
  partial?: Partial<PanicButtonSettings> | null
): PanicButtonSettings {
  return {
    ...DEFAULT_PANIC_BUTTON_SETTINGS,
    ...(partial ?? {}),
  };
}

export function hasConfiguredPanicActions(settings: PanicButtonSettings): boolean {
  return (
    settings.flushEnvs ||
    settings.flushSecrets ||
    settings.revokeApiTokens ||
    settings.revokeCollaborators ||
    settings.downloadEnvs
  );
}
