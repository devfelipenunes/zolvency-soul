import { Buffer } from "buffer";
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  toUint8Array,
} from "../utils/encoding.js";
import {
  parseSpkiToUncompressed,
  derToCompact,
} from "../utils/crypto.js";
import type {
  CreatePasskeyOptions,
  CreatePasskeyResult,
  LoginWithPasskeyOptions,
  LoginWithPasskeyResult,
} from "./types.js";

/**
 * Checks if WebAuthn and platform authenticators are supported in the current environment.
 */
export async function isWebAuthnSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Triggers the browser biometric prompt to register a new platform passkey.
 * Returns the formatted credentials and the 65-byte uncompressed public key.
 */
export async function createPasskey(options: CreatePasskeyOptions): Promise<CreatePasskeyResult> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn API is only available in a secure browser environment.");
  }

  const challenge = options.challenge 
    ? toUint8Array(options.challenge)
    : window.crypto.getRandomValues(new Uint8Array(32));

  const hostname = window.location.hostname;
  const rpId = options.rpId || (hostname !== "localhost" && hostname !== "127.0.0.1" ? hostname : undefined);

  const rp: PublicKeyCredentialRpEntity = {
    name: options.rpName || "Soul Identity",
  };
  if (rpId) {
    rp.id = rpId;
  }

  const user = {
    id: window.crypto.getRandomValues(new Uint8Array(16)),
    name: options.username,
    displayName: options.displayName || options.username,
  };

  const pubKeyCredParams: PublicKeyCredentialParameters[] = [
    { type: "public-key", alg: -7 },
  ];

  const authenticatorSelection: AuthenticatorSelectionCriteria = {
    authenticatorAttachment: "platform",
    userVerification: options.userVerification || "required",
    residentKey: "required",
    requireResidentKey: true,
  };

  const credential = await window.navigator.credentials.create({
    publicKey: {
      challenge: challenge as BufferSource,
      rp,
      user,
      pubKeyCredParams,
      authenticatorSelection,
      timeout: options.timeout || 60000,
      attestation: "none",
    },
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey creation failed: Credential returned is null");
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  
  if (typeof response.getPublicKey !== "function") {
    throw new Error("WebAuthn registration error: Browser does not support getPublicKey()");
  }

  const publicKeyBuffer = response.getPublicKey();
  if (!publicKeyBuffer) {
    throw new Error("WebAuthn registration error: getPublicKey() returned null");
  }

  const spki = new Uint8Array(publicKeyBuffer);
  const rawPublicKey = parseSpkiToUncompressed(spki);

  return {
    credentialId: bufferToBase64Url(credential.rawId),
    publicKey: Buffer.from(rawPublicKey).toString("hex"),
    rawPublicKey,
    rawResponse: credential,
  };
}

/**
 * Triggers the browser biometric prompt to sign a challenge using an existing passkey.
 * Returns the on-chain ready 64-byte compact signature (r || s).
 */
export async function loginWithPasskey(options: LoginWithPasskeyOptions = {}): Promise<LoginWithPasskeyResult> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn API is only available in a secure browser environment.");
  }

  const rawChallenge = options.challenge 
    ? toUint8Array(options.challenge)
    : window.crypto.getRandomValues(new Uint8Array(32));

  const hostname = window.location.hostname;
  const rpId = options.rpId || (hostname !== "localhost" && hostname !== "127.0.0.1" ? hostname : undefined);

  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = options.allowedCredentialIds?.map(id => ({
    type: "public-key" as const,
    id: base64UrlToBuffer(id) as BufferSource,
  }));

  const publicKeyOpts: PublicKeyCredentialRequestOptions = {
    challenge: rawChallenge as BufferSource,
    userVerification: options.userVerification || "required",
    timeout: options.timeout || 60000,
  };
  if (rpId) {
    publicKeyOpts.rpId = rpId;
  }
  if (allowCredentials) {
    publicKeyOpts.allowCredentials = allowCredentials;
  }

  const assertion = await window.navigator.credentials.get({
    publicKey: publicKeyOpts,
  }) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("WebAuthn assertion failed: Assertion returned is null");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const derSignature = new Uint8Array(response.signature);
  const rawSignature = derToCompact(derSignature);

  return {
    credentialId: bufferToBase64Url(assertion.rawId),
    signature: Buffer.from(rawSignature).toString("hex"),
    rawSignature,
    authenticatorData: Buffer.from(response.authenticatorData).toString("hex"),
    rawAuthenticatorData: new Uint8Array(response.authenticatorData),
    clientDataJSON: new TextDecoder().decode(response.clientDataJSON),
    challenge: Buffer.from(rawChallenge).toString("hex"),
    rawResponse: assertion,
  };
}
