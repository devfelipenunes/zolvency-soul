import { describe, it, expect } from "vitest";
import { Buffer } from "buffer";
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  toUint8Array,
} from "../../src/utils/encoding.js";

describe("Encoding Utilities", () => {
  describe("base64UrlToBuffer & bufferToBase64Url", () => {
    it("should round-trip binary data correctly", () => {
      const input = new Uint8Array([0, 1, 127, 128, 255]);
      const base64Url = bufferToBase64Url(input);
      expect(base64Url).toBe("AAF_gP8");
      const output = base64UrlToBuffer(base64Url);
      expect(output).toEqual(input);
    });

    it("should handle padding replacement correctly", () => {
      // Input length 1
      const input1 = new Uint8Array([65]); // "A"
      const b64_1 = bufferToBase64Url(input1);
      expect(b64_1).toBe("QQ"); // base64 is "QQA=" -> base64url "QQ"
      expect(base64UrlToBuffer(b64_1)).toEqual(input1);

      // Input length 2
      const input2 = new Uint8Array([65, 66]); // "AB"
      const b64_2 = bufferToBase64Url(input2);
      expect(b64_2).toBe("QUI"); // base64 is "QUI=" -> base64url "QUI"
      expect(base64UrlToBuffer(b64_2)).toEqual(input2);
    });
  });

  describe("toUint8Array", () => {
    it("should handle Uint8Array inputs directly", () => {
      const input = new Uint8Array([1, 2, 3]);
      const output = toUint8Array(input);
      expect(output).toBe(input); // strict reference equality
    });

    it("should handle ArrayBuffer inputs", () => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view.set([10, 20, 30, 40]);
      
      const output = toUint8Array(buffer);
      expect(output).toBeInstanceOf(Uint8Array);
      expect(output).toEqual(new Uint8Array([10, 20, 30, 40]));
    });

    it("should handle Buffer inputs and convert to plain Uint8Array", () => {
      const buf = Buffer.from([100, 200]);
      const output = toUint8Array(buf);
      
      expect(output).toBeInstanceOf(Uint8Array);
      expect(Buffer.isBuffer(output)).toBe(false); // must be plain Uint8Array
      expect(output).toEqual(new Uint8Array([100, 200]));
    });

    it("should parse valid hex strings", () => {
      const hex = "abcdef0123";
      const output = toUint8Array(hex);
      expect(output).toEqual(new Uint8Array([0xab, 0xcd, 0xef, 0x01, 0x23]));
    });

    it("should fallback to TextEncoder for non-hex strings", () => {
      const text = "Hello World! 🚀";
      const output = toUint8Array(text);
      expect(output).toEqual(new TextEncoder().encode(text));
    });

    it("should throw on unsupported input types", () => {
      const badInput: any = 12345;
      expect(() => toUint8Array(badInput)).toThrow(
        "Unsupported format. Input must be a string, Uint8Array, Buffer, or ArrayBuffer."
      );
      
      const badObject: any = { foo: "bar" };
      expect(() => toUint8Array(badObject)).toThrow(
        "Unsupported format. Input must be a string, Uint8Array, Buffer, or ArrayBuffer."
      );
    });
  });
});
