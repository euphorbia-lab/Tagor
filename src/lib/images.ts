// Client-side image pipeline: shrink, re-encode, encrypt.
//
// Re-drawing through a canvas is what makes this safe as well as small. A
// canvas holds pixels only, so the re-encoded file carries none of the original
// EXIF: no GPS coordinates, no camera serial, no capture timestamp. For an app
// whose whole point is not leaking where you are, that matters as much as the
// size saving.

import { encryptJson, decryptJson } from './crypto';

export const MAX_IMAGES = 3;
/** Longest edge after resizing. Comfortably sharp on a phone, ~10x smaller. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;
/** Refuse absurd inputs before decoding, so a huge file cannot exhaust memory. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
/** Matches the bucket's own file_size_limit. */
export const MAX_ENCRYPTED_BYTES = 1024 * 1024;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Shrink and re-encode to WebP. Returns the raw bytes, EXIF-free. */
export async function compressImage(file: File): Promise<Uint8Array<ArrayBuffer>> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('unsupported-type');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('too-large');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no-canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    );
    if (!blob) throw new Error('encode-failed');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

/**
 * Encrypt image bytes with the event key. Base64 inside the same JSON envelope
 * the event payload uses, so there is exactly one crypto path to reason about.
 */
export async function encryptImage(bytes: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<string> {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return encryptJson({ b64: btoa(bin) }, key);
}

/** Decrypt back to raw image bytes. */
export async function decryptImageToBytes(
  payload: string,
  key: CryptoKey
): Promise<Uint8Array<ArrayBuffer>> {
  const { b64 } = await decryptJson<{ b64: string }>(payload, key);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Blob URL for <img src>, from decrypted bytes. Caller must revoke it. */
export function bytesToObjectUrl(bytes: Uint8Array<ArrayBuffer>): string {
  return URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
}

/** Decrypt straight to a blob URL for <img src>. Caller must revoke the URL. */
export async function decryptImageToUrl(payload: string, key: CryptoKey): Promise<string> {
  return bytesToObjectUrl(await decryptImageToBytes(payload, key));
}

/** Prepare files for upload: compress, encrypt, and reject anything oversized. */
export async function prepareImages(files: File[], key: CryptoKey): Promise<string[]> {
  const out: string[] = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    const compressed = await compressImage(file);
    const encrypted = await encryptImage(compressed, key);
    if (encrypted.length > MAX_ENCRYPTED_BYTES) throw new Error('too-large');
    out.push(encrypted);
  }
  return out;
}
