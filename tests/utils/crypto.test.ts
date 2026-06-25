import { describe, it, expect } from "vitest";
import { Buffer } from "buffer";
import { hash } from "@stellar/stellar-sdk";
import {
  parseSpkiToUncompressed,
  derToCompact,
  computeRecoveryMessageHash,
  computeRotationMessageHash,
} from "../../src/utils/crypto.js";

describe("Crypto Utilities", () => {
  describe("parseSpkiToUncompressed", () => {
    it("should parse standard 91-byte SPKI public key starting with 0x04 at offset 26", () => {
      const dummySpki = new Uint8Array(91);
      dummySpki[26] = 0x04;
      for (let i = 27; i < 91; i++) {
        dummySpki[i] = i;
      }

      const uncompressed = parseSpkiToUncompressed(dummySpki);
      expect(uncompressed.length).toBe(65);
      expect(uncompressed[0]).toBe(0x04);
      expect(uncompressed[1]).toBe(27);
    });

    it("should locate the BIT STRING (0x03) dynamically in custom SPKI formats", () => {
      const customSpki = new Uint8Array([
        0x30, 0x10, // outer Sequence
        0x03, 0x42, 0x00, // BIT STRING (0x03), length 66, 0 unused bits
        0x04, ...Array.from({ length: 64 }, (_, i) => i + 1) // 65-byte uncompressed EC public key
      ]);

      const uncompressed = parseSpkiToUncompressed(customSpki);
      expect(uncompressed.length).toBe(65);
      expect(uncompressed[0]).toBe(0x04);
      expect(uncompressed[1]).toBe(1);
      expect(uncompressed[64]).toBe(64);
    });

    it("should fall back to slicing the last 65 bytes if prefix is 0x04", () => {
      const dummySpki = new Uint8Array(70);
      dummySpki[5] = 0x04; // starts uncompressed key at index 5 (last 65 bytes)
      for (let i = 6; i < 70; i++) {
        dummySpki[i] = i;
      }

      const uncompressed = parseSpkiToUncompressed(dummySpki);
      expect(uncompressed.length).toBe(65);
      expect(uncompressed[0]).toBe(0x04);
      expect(uncompressed[1]).toBe(6);
    });

    it("should throw an error on invalid SPKI format", () => {
      const badSpki = new Uint8Array([1, 2, 3, 4, 5]);
      expect(() => parseSpkiToUncompressed(badSpki)).toThrow(
        "Invalid SPKI public key format for secp256r1. Could not locate uncompressed key prefix."
      );

      const badLengthSpki = new Uint8Array(91); // all zeroes, index 26 is 0x00 instead of 0x04
      expect(() => parseSpkiToUncompressed(badLengthSpki)).toThrow(
        "Invalid SPKI public key format for secp256r1. Could not locate uncompressed key prefix."
      );
    });
  });

  describe("derToCompact", () => {
    it("should convert a valid DER signature to a 64-byte compact (r || s) signature", () => {
      const rVal = new Uint8Array(32).fill(0x11);
      const sVal = new Uint8Array(32).fill(0x22);

      const derSig = new Uint8Array([
        0x30, 68, // SEQUENCE, length 68
        0x02, 32, ...Array.from(rVal), // INTEGER (r)
        0x02, 32, ...Array.from(sVal), // INTEGER (s)
      ]);

      const compact = derToCompact(derSig);
      expect(compact.length).toBe(64);
      expect(compact.slice(0, 32)).toEqual(rVal);
      expect(compact.slice(32, 64)).toEqual(sVal);
    });

    it("should handle DER integers with leading zeros to strip ASN.1 padding", () => {
      const rVal = new Uint8Array(32).fill(0x33);
      const sVal = new Uint8Array(32).fill(0x44);

      // In ASN.1, if the integer starts with a bit set to 1 (>= 0x80), it must be prefixed with 0x00.
      const derSig = new Uint8Array([
        0x30, 70, // SEQUENCE
        0x02, 33, 0x00, ...Array.from(rVal), // r with leading zero
        0x02, 33, 0x00, ...Array.from(sVal), // s with leading zero
      ]);

      const compact = derToCompact(derSig);
      expect(compact.length).toBe(64);
      expect(compact.slice(0, 32)).toEqual(rVal);
      expect(compact.slice(32, 64)).toEqual(sVal);
    });

    it("should normalize high-S to low-S using the SECP256R1 order", () => {
      // SECP256R1 order n:
      const n = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
      const sHigh = n - 5n; // very high-S
      const sHighHex = sHigh.toString(16).padStart(64, "0");
      const sHighBytes = Buffer.from(sHighHex, "hex");

      const rVal = new Uint8Array(32).fill(0x55);

      const derSig = new Uint8Array([
        0x30, 71,
        0x02, 32, ...Array.from(rVal),
        0x02, 33, 0x00, ...Array.from(sHighBytes), // prefixed with 0x00 as sHigh starts with 0xff
      ]);

      const compact = derToCompact(derSig);
      expect(compact.length).toBe(64);
      expect(compact.slice(0, 32)).toEqual(rVal);

      // Normalized s should be 5n
      const expectedS = new Uint8Array(32);
      expectedS[31] = 0x05;
      expect(compact.slice(32, 64)).toEqual(expectedS);
    });

    it("should throw on invalid tag or format", () => {
      // Not a sequence
      const badTag = new Uint8Array([0x31, 10, 0x02, 4, 1, 2, 3, 4, 0x02, 4, 1, 2, 3, 4]);
      expect(() => derToCompact(badTag)).toThrow(
        "Invalid DER signature format: expected SEQUENCE (0x30)"
      );

      // Incorrect INTEGER tag for r
      const badRTag = new Uint8Array([0x30, 10, 0x03, 4, 1, 2, 3, 4, 0x02, 4, 1, 2, 3, 4]);
      expect(() => derToCompact(badRTag)).toThrow(
        "Invalid DER signature format: expected INTEGER tag (0x02) for r"
      );

      // Too short
      const tooShort = new Uint8Array([0x30, 1]);
      expect(() => derToCompact(tooShort)).toThrow(
        "Invalid DER signature length: signature too short"
      );
    });

    it("should throw if signature component exceeds 32 bytes", () => {
      const tooLongComponent = new Uint8Array(33).fill(1);
      const derSig = new Uint8Array([
        0x30, 70,
        0x02, 33, ...Array.from(tooLongComponent),
        0x02, 32, ...Array.from(new Uint8Array(32).fill(2)),
      ]);

      expect(() => derToCompact(derSig)).toThrow(
        "Invalid signature component length: components must be between 1 and 32 bytes"
      );
    });
  });

  describe("Message Hash Generators", () => {
    const dummyKey1 = new Uint8Array(65).fill(0x11);
    const dummyKey2 = new Uint8Array(65).fill(0x22);

    it("should compute correct recovery message hash via SHA-256", () => {
      const hashVal = computeRecoveryMessageHash(dummyKey1, dummyKey2);
      expect(hashVal.length).toBe(32);

      const expectedMsg = new Uint8Array(130);
      expectedMsg.set(dummyKey1, 0);
      expectedMsg.set(dummyKey2, 65);
      
      const expectedHash = hash(Buffer.from(expectedMsg));
      expect(hashVal).toEqual(expectedHash);
    });

    it("should compute correct rotation message hash via SHA-256", () => {
      const hashVal = computeRotationMessageHash(dummyKey1, dummyKey2);
      expect(hashVal.length).toBe(32);
      
      const expectedMsg = new Uint8Array(130);
      expectedMsg.set(dummyKey1, 0);
      expectedMsg.set(dummyKey2, 65);

      const expectedHash = hash(Buffer.from(expectedMsg));
      expect(hashVal).toEqual(expectedHash);
    });

    it("should throw error if key lengths are not exactly 65 bytes", () => {
      const badKey = new Uint8Array(64).fill(0x11); // 64 bytes instead of 65
      expect(() => computeRecoveryMessageHash(badKey, dummyKey2)).toThrow(
        "Invalid passkey length. Passkeys must be 65-byte uncompressed public keys."
      );
      
      expect(() => computeRotationMessageHash(dummyKey1, badKey)).toThrow(
        "Invalid recovery key length. Recovery keys must be 65-byte uncompressed public keys."
      );
    });
  });
});
