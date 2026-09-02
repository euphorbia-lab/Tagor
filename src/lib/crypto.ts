// End-to-end encryption for event content.
//
// The browser generates a key, encrypts the event, and sends only ciphertext to
// the server. The key travels in the URL fragment (the part after '#'), which
// browsers never send in an HTTP request, so Tagor's server and database only
// ever hold an opaque blob they cannot read.
//
// Consequence to remember: lose the fragment, lose the event. There is no
// recovery path, by design.

const ALGO = 'AES-GCM';
const KEY_BITS = 256;
const IV_BYTES = 12;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// The explicit ArrayBuffer type parameter matters: Web Crypto's BufferSource
// rejects a Uint8Array that might be backed by a SharedArrayBuffer.
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGO, length: KEY_BITS }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Key as a URL-fragment-safe string. */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return toBase64Url(new Uint8Array(raw));
}

export async function importKey(encoded: string): Promise<CryptoKey> {
  const raw = fromBase64Url(encoded);
  return crypto.subtle.importKey('raw', raw, { name: ALGO }, true, ['encrypt', 'decrypt']);
}

/** Encrypt a JSON-serialisable value. The random IV is prepended to the output. */
export async function encryptJson(value: unknown, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: ALGO, iv }, key, data));
  const joined = new Uint8Array(iv.length + cipher.length);
  joined.set(iv, 0);
  joined.set(cipher, iv.length);
  return toBase64Url(joined);
}

/**
 * Decrypt a payload produced by encryptJson. Throws if the key is wrong or the
 * ciphertext was tampered with (AES-GCM authenticates as well as encrypts).
 */
export async function decryptJson<T>(payload: string, key: CryptoKey): Promise<T> {
  const joined = fromBase64Url(payload);
  const iv = joined.slice(0, IV_BYTES);
  const cipher = joined.slice(IV_BYTES);
  const plain = await crypto.subtle.decrypt({ name: ALGO, iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** The key from the current URL fragment, or null when the link is missing it. */
export function keyFromHash(): string | null {
  if (typeof location === 'undefined') return null;
  const hash = location.hash.replace(/^#/, '').trim();
  return hash.length > 0 ? hash : null;
}
