/**
 * Client-side validation mirroring backend rules in middleware/validation.ts and routes/auth.ts
 */

export const PASSWORD_REQUIREMENTS =
  'At least 8 characters with one uppercase letter, one lowercase letter, and one number';

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
}

export function validateRegistrationName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Name is required';
  }
  if (trimmed.length > 100) {
    return 'Name must be between 1 and 100 characters';
  }
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
    return 'Name contains invalid characters';
  }
  return null;
}

export function validateRegistrationUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Username is required';
  }
  if (trimmed.length < 3 || trimmed.length > 30) {
    return 'Username must be between 3 and 30 characters';
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain lowercase letters, numbers, and underscores';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Valid email is required';
  }
  if (trimmed.length > 255) {
    return 'Email must be less than 255 characters';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Valid email is required';
  }
  return null;
}
