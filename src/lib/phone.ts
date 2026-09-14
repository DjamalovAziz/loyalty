export const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/** Strip everything but digits, for tolerant matching between formats. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}
