import { Buffer } from "buffer";
import { hash } from "@stellar/stellar-sdk";
import { toUint8Array } from "./encoding.js";

/**
 * Extracts the 65-byte uncompressed public key (starts with 0x04) from an SPKI DER buffer.
 */
export function parseSpkiToUncompressed(spki: Uint8Array): Uint8Array {
  let i = 0;
  while (i < spki.length) {
    if (spki[i] === 0x03) {
      if (i + 3 < spki.length && spki[i + 3] === 0x04) {
        const key = spki.slice(i + 3, i + 3 + 65);
        if (key.length === 65) {
          return key;
        }
      }
    }
    i++;
  }

  if (spki.length === 91 && spki[26] === 0x04) {
    return spki.slice(26);
  }

  if (spki.length >= 65 && spki[spki.length - 65] === 0x04) {
    return spki.slice(spki.length - 65);
  }

  throw new Error("Invalid SPKI public key format for secp256r1. Could not locate uncompressed key prefix.");
}

/**
 * Converts an ASN.1 DER signature into a 64-byte compact signature (r || s),
 * and normalizes the s-value to be low-S.
 */
export function derToCompact(der: Uint8Array): Uint8Array {
  if (der.length < 8) {
    throw new Error("Invalid DER signature length: signature too short");
  }

  let offset = 0;
  const seqTag = der[offset++];
  if (seqTag !== 0x30) {
    throw new Error("Invalid DER signature format: expected SEQUENCE (0x30)");
  }
  
  const length = der[offset++];
  if (length === undefined) {
    throw new Error("Invalid DER signature format: sequence length undefined");
  }
  
  if (length & 0x80) {
    const numOctets = length & 0x7f;
    if (offset + numOctets > der.length) {
      throw new Error("Invalid DER signature: sequence length overflow");
    }
    offset += numOctets;
  }
  
  if (offset >= der.length) {
    throw new Error("Invalid DER signature: unexpected end of buffer before r");
  }

  const rTag = der[offset++];
  if (rTag !== 0x02) {
    throw new Error("Invalid DER signature format: expected INTEGER tag (0x02) for r");
  }
  
  const rLen = der[offset++];
  if (rLen === undefined || offset + rLen > der.length) {
    throw new Error("Invalid DER signature format: r length out of bounds");
  }
  let rBytes = der.slice(offset, offset + rLen);
  offset += rLen;
  
  if (offset >= der.length) {
    throw new Error("Invalid DER signature: unexpected end of buffer before s");
  }

  const sTag = der[offset++];
  if (sTag !== 0x02) {
    throw new Error("Invalid DER signature format: expected INTEGER tag (0x02) for s");
  }
  
  const sLen = der[offset++];
  if (sLen === undefined || offset + sLen > der.length) {
    throw new Error("Invalid DER signature format: s length out of bounds");
  }
  let sBytes = der.slice(offset, offset + sLen);
  
  if (rBytes[0] === 0x00) rBytes = rBytes.slice(1);
  if (sBytes[0] === 0x00) sBytes = sBytes.slice(1);
  
  const r = new Uint8Array(32);
  const s = new Uint8Array(32);
  
  if (rBytes.length > 32 || sBytes.length > 32 || rBytes.length === 0 || sBytes.length === 0) {
    throw new Error("Invalid signature component length: components must be between 1 and 32 bytes");
  }
  
  r.set(rBytes, 32 - rBytes.length);
  s.set(sBytes, 32 - sBytes.length);
  
  const n = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
  const halfN = n / 2n;
  const sVal = BigInt("0x" + Buffer.from(s).toString("hex"));
  
  if (sVal > halfN) {
    const lowSVal = n - sVal;
    const lowSHex = lowSVal.toString(16).padStart(64, "0");
    s.set(Buffer.from(lowSHex, "hex"));
  }
  
  const compact = new Uint8Array(64);
  compact.set(r, 0);
  compact.set(s, 32);
  return compact;
}

/**
 * Computes the message hash to sign for recovering a Soul:
 * `sha256(old_passkey || new_passkey)`
 */
export function computeRecoveryMessageHash(
  oldPasskey: string | Uint8Array,
  newPasskey: string | Uint8Array
): Uint8Array {
  const oldBuffer = toUint8Array(oldPasskey);
  const newBuffer = toUint8Array(newPasskey);
  
  if (oldBuffer.length !== 65 || newBuffer.length !== 65) {
    throw new Error("Invalid passkey length. Passkeys must be 65-byte uncompressed public keys.");
  }
  
  const msg = new Uint8Array(130);
  msg.set(oldBuffer, 0);
  msg.set(newBuffer, 65);
  
  return hash(Buffer.from(msg));
}

/**
 * Computes the message hash to sign for rotating the recovery key of a Soul:
 * `sha256(recovery_pubkey || new_recovery_pubkey)`
 */
export function computeRotationMessageHash(
  oldRecoveryKey: string | Uint8Array,
  newRecoveryKey: string | Uint8Array
): Uint8Array {
  const oldBuffer = toUint8Array(oldRecoveryKey);
  const newBuffer = toUint8Array(newRecoveryKey);
  
  if (oldBuffer.length !== 65 || newBuffer.length !== 65) {
    throw new Error("Invalid recovery key length. Recovery keys must be 65-byte uncompressed public keys.");
  }
  
  const msg = new Uint8Array(130);
  msg.set(oldBuffer, 0);
  msg.set(newBuffer, 65);
  
  return hash(Buffer.from(msg));
}
