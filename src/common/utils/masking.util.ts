/**
 * Masks identity/passport/SSN numbers showing only the last 4 characters.
 * Example: '1234567890' -> '••••••7890'
 */
export function maskIdentityNumber(idNumber?: string | null): string {
  if (!idNumber) return '';
  const trimmed = idNumber.trim();
  if (!trimmed) return '';
  if (trimmed.length === 4) {
    return trimmed;
  }
  if (trimmed.length < 4) {
    return '•'.repeat(trimmed.length);
  }
  const lastFour = trimmed.slice(-4);
  const maskedPrefix = '•'.repeat(trimmed.length - 4);
  return `${maskedPrefix}${lastFour}`;
}
