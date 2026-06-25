import { Buffer } from "buffer";

/**
 * Converts a base64url string to a Uint8Array buffer.
 */
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts an ArrayBuffer or Uint8Array to a base64url string.
 */
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Normalizes input formats (hex string, UTF-8 string, Buffer, ArrayBuffer) into a plain Uint8Array.
 */
export function toUint8Array(val: string | Uint8Array | Buffer | ArrayBuffer): Uint8Array {
  if (Buffer.isBuffer(val)) {
    return new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
  }
  if (val instanceof Uint8Array) {
    return val;
  }
  if (val instanceof ArrayBuffer) {
    return new Uint8Array(val);
  }
  if (typeof val === "string") {
    if (/^[0-9a-fA-F]+$/.test(val)) {
      return new Uint8Array(Buffer.from(val, "hex"));
    }
    return new TextEncoder().encode(val);
  }
  throw new Error("Unsupported format. Input must be a string, Uint8Array, Buffer, or ArrayBuffer.");
}

/**
 * Normalizes a string (hex), Uint8Array, or Buffer input into a Buffer.
 * Used to format public keys before sending to the Soroban contract.
 */
export function toBuffer(val: string | Uint8Array | Buffer): Buffer {
  if (typeof val === "string") {
    const cleanHex = val.startsWith("0x") ? val.slice(2) : val;
    return Buffer.from(cleanHex, "hex");
  }
  return Buffer.from(val);
}
