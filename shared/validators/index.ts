/**
 * Shared Validator Helpers & Regex Patterns
 * Module: @shared/validators
 */

export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
} as const;

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

export function isValidUsername(username: string): boolean {
  if (!username) return false;
  return VALIDATION_PATTERNS.USERNAME.test(username);
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  return VALIDATION_PATTERNS.PHONE.test(phone);
}
