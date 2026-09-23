export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}
