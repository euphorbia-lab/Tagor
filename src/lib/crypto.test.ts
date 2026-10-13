// Tests for the end-to-end encryption in crypto.ts. These back up the privacy
// claims in the README: the key round-trips through a URL, the right key
// decrypts, and a wrong key or a tampered payload never does.

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decryptJson,
  encryptJson,
  exportKey,
  generateKey,
  importKey,
  keyFromHash,
} from './crypto';

const event = {
  title: 'Cumpleaños de Ana 🎂',
  place: 'Calle Mayor 1',
  lat: 40.4168,
  lng: -3.7038,
};

describe('encryptJson / decryptJson', () => {
  it('round-trips a value, including non-ASCII text', async () => {
    const key = await generateKey();
    const payload = await encryptJson(event, key);
    expect(await decryptJson(payload, key)).toEqual(event);
  });

  it('never puts the plaintext in the payload', async () => {
    const key = await generateKey();
    const payload = await encryptJson(event, key);
    expect(payload).not.toContain('Calle Mayor');
  });

  it('gives a different payload each time for the same input (random IV)', async () => {
    const key = await generateKey();
    const a = await encryptJson(event, key);
    const b = await encryptJson(event, key);
    expect(a).not.toBe(b);
  });

  it('refuses to decrypt with the wrong key', async () => {
    const payload = await encryptJson(event, await generateKey());
    await expect(decryptJson(payload, await generateKey())).rejects.toThrow();
  });

  it('refuses to decrypt a tampered payload', async () => {
    const key = await generateKey();
    const payload = await encryptJson(event, key);
    // Index 30 is past the 12-byte IV (16 base64 chars), inside the ciphertext.
    const i = 30;
    const swapped = payload[i] === 'A' ? 'B' : 'A';
    const tampered = payload.slice(0, i) + swapped + payload.slice(i + 1);
    await expect(decryptJson(tampered, key)).rejects.toThrow();
  });
});

describe('exportKey / importKey', () => {
  it('exports a 256-bit key as URL-safe text', async () => {
    const encoded = await exportKey(await generateKey());
    // 32 bytes in unpadded base64url is 43 characters, using only A-Z a-z 0-9 - _
    expect(encoded).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('a key that went through a link still decrypts', async () => {
    const key = await generateKey();
    const payload = await encryptJson(event, key);
    const fromLink = await importKey(await exportKey(key));
    expect(await decryptJson(payload, fromLink)).toEqual(event);
  });
});

describe('keyFromHash', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the key from the URL fragment', () => {
    vi.stubGlobal('location', { hash: '#abc123' });
    expect(keyFromHash()).toBe('abc123');
  });

  it('returns null when the link has no key', () => {
    vi.stubGlobal('location', { hash: '' });
    expect(keyFromHash()).toBeNull();
    vi.stubGlobal('location', { hash: '#' });
    expect(keyFromHash()).toBeNull();
  });
});
