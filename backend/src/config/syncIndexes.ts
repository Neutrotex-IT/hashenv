import AssociatedAccount from '../models/AssociatedAccount';
import Component from '../models/Component';
import SecretFile from '../models/SecretFile';
import User from '../models/User';
import UserSettings from '../models/UserSettings';

/**
 * Sync indexes for models whose index definitions changed in the MongoDB audit fixes.
 * Drops obsolete indexes and creates new ones declared on the schemas.
 */
export async function syncTouchedModelIndexes(): Promise<void> {
  const models = [
    { name: 'User', model: User },
    { name: 'UserSettings', model: UserSettings },
    { name: 'SecretFile', model: SecretFile },
    { name: 'AssociatedAccount', model: AssociatedAccount },
    { name: 'Component', model: Component },
  ] as const;

  for (const { name, model } of models) {
    try {
      const dropped = await model.syncIndexes();
      if (dropped.length > 0) {
        console.log(`[Indexes] ${name}: dropped obsolete index(es): ${dropped.join(', ')}`);
      } else {
        console.log(`[Indexes] ${name}: indexes in sync`);
      }
    } catch (error) {
      console.warn(
        `[Indexes] ${name} syncIndexes warning:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
