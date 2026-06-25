import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Buffer } from "buffer";
import {
  createPasskey,
  loginWithPasskey,
  isWebAuthnSupported,
} from "../../src/webauthn/core.js";

describe("WebAuthn API Wrappers (Server/Node.js Environment)", () => {
  it("should throw a clear error when calling createPasskey in Node.js", async () => {
    await expect(createPasskey({ username: "test" })).rejects.toThrow(
      "WebAuthn API is only available in a secure browser environment."
    );
  });

  it("should throw a clear error when calling loginWithPasskey in Node.js", async () => {
    await expect(loginWithPasskey()).rejects.toThrow(
      "WebAuthn API is only available in a secure browser environment."
    );
  });

  it("should return false for support check in Node.js", async () => {
    const supported = await isWebAuthnSupported();
    expect(supported).toBe(false);
  });
});

describe("WebAuthn API Wrappers (Mocked Browser Environment)", () => {
  beforeEach(() => {
    const mockCredentials = {
      create: vi.fn(),
      get: vi.fn(),
    };
    
    const mockCrypto = {
      getRandomValues: (arr: Uint8Array) => arr.fill(9),
    };

    vi.stubGlobal("window", {
      location: { hostname: "example.com" },
      crypto: mockCrypto,
      PublicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
      },
      navigator: {
        credentials: mockCredentials,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should check if WebAuthn is supported", async () => {
    const supported = await isWebAuthnSupported();
    expect(supported).toBe(true);
    expect(window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable).toHaveBeenCalled();
  });

  it("should trigger navigator.credentials.create and format the response correctly", async () => {
    const mockSpki = new Uint8Array(91);
    mockSpki[26] = 0x04;
    mockSpki.fill(7, 27); // fill coordinates with 7

    const mockResponse = {
      rawId: new Uint8Array([1, 2, 3, 4]).buffer,
      response: {
        getPublicKey: () => mockSpki.buffer,
      },
    };

    const createMock = window.navigator.credentials.create as any;
    createMock.mockResolvedValue(mockResponse);

    const result = await createPasskey({ username: "alice", rpName: "Test RP" });

    expect(createMock).toHaveBeenCalled();
    expect(result.credentialId).toBe("AQIDBA");
    expect(result.publicKey).toBe("04" + "07".repeat(64));
    expect(result.rawPublicKey[0]).toBe(0x04);
    expect(result.rawPublicKey[1]).toBe(7);
  });

  it("should trigger navigator.credentials.get and format the response correctly", async () => {
    const rVal = new Uint8Array(32).fill(0x11);
    const sVal = new Uint8Array(32).fill(0x22);
    const derSig = new Uint8Array([
      0x30, 68,
      0x02, 32, ...Array.from(rVal),
      0x02, 32, ...Array.from(sVal),
    ]);

    const mockResponse = {
      rawId: new Uint8Array([9, 8, 7]).buffer,
      response: {
        signature: derSig.buffer,
        authenticatorData: new Uint8Array([10, 11, 12]).buffer,
        clientDataJSON: new TextEncoder().encode('{"challenge":"mock"}').buffer,
      },
    };

    const getMock = window.navigator.credentials.get as any;
    getMock.mockResolvedValue(mockResponse);

    const result = await loginWithPasskey({
      challenge: "123456",
      allowedCredentialIds: ["AQID"],
    });

    expect(getMock).toHaveBeenCalled();
    expect(result.credentialId).toBe("CQgH");
    expect(result.signature).toBe(Buffer.from(rVal).toString("hex") + Buffer.from(sVal).toString("hex"));
    expect(result.authenticatorData).toBe("0a0b0c");
    expect(result.clientDataJSON).toBe('{"challenge":"mock"}');
  });

  it("should throw error if credential creation returns null", async () => {
    const createMock = window.navigator.credentials.create as any;
    createMock.mockResolvedValue(null);

    await expect(createPasskey({ username: "alice" })).rejects.toThrow(
      "Passkey creation failed: Credential returned is null"
    );
  });

  it("should throw error if credential assertion returns null", async () => {
    const getMock = window.navigator.credentials.get as any;
    getMock.mockResolvedValue(null);

    await expect(loginWithPasskey()).rejects.toThrow(
      "WebAuthn assertion failed: Assertion returned is null"
    );
  });
});
