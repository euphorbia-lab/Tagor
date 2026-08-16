// URL-safe random identifiers using Web Crypto (no dependency).

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomId(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Public event slug. ~12 chars of base62 is unguessable enough for link-only access. */
export function newViewSlug(): string {
  return randomId(12);
}

/** Secret manage token. Longer, since it grants edit/delete. */
export function newManageToken(): string {
  return randomId(28);
}
