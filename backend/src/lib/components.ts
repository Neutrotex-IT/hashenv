import Component from '../models/Component';
import ComponentEncryptionKey from '../models/ComponentEncryptionKey';
import SecretFile from '../models/SecretFile';
import Secret from '../models/Secret';
import { deleteComponentEncryptionKey } from '../crypto/key-store';

const COMPONENT_SLUG_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const RESERVED_COMPONENT_SLUGS = new Set(['all', 'default', 'new']);

export function normalizeComponentSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function isValidComponentSlug(slug: string): boolean {
  const normalized = normalizeComponentSlug(slug);
  if (!COMPONENT_SLUG_PATTERN.test(normalized)) {
    return false;
  }
  if (RESERVED_COMPONENT_SLUGS.has(normalized)) {
    return false;
  }
  return true;
}

export function slugFromComponentName(name: string): string {
  const slug = normalizeComponentSlug(name);
  if (isValidComponentSlug(slug)) {
    return slug;
  }
  // Do not silently remap reserved or invalid names to a generic slug —
  // callers must reject invalid names. Returning the invalid normalized form
  // keeps isValidComponentSlug(slug) === false so create/update fail closed.
  return slug;
}

export async function deleteComponentCascade(componentId: string): Promise<void> {
  await Promise.all([
    SecretFile.deleteMany({ componentId }),
    Secret.deleteMany({ componentId }),
    ComponentEncryptionKey.deleteOne({ componentId }),
  ]);
  await deleteComponentEncryptionKey(componentId);
  await Component.findByIdAndDelete(componentId);
}

export async function deleteProjectComponents(projectId: string): Promise<void> {
  const components = await Component.find({ projectId }).select('_id');
  await Promise.all(components.map((component) => deleteComponentCascade(component._id.toString())));
}
