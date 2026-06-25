import { Buffer } from "buffer";

export interface CreatePasskeyOptions {
  username: string;
  displayName?: string;
  rpName?: string;
  rpId?: string;
  challenge?: string | Uint8Array | Buffer | ArrayBuffer;
  userVerification?: UserVerificationRequirement;
  timeout?: number;
}

export interface CreatePasskeyResult {
  /** base64url encoded credential ID */
  credentialId: string;
  /** 65-byte uncompressed public key (hex, starts with "04") */
  publicKey: string;
  /** 65-byte raw uncompressed public key */
  rawPublicKey: Uint8Array;
  /** Raw browser credential response for full auditability */
  rawResponse: any;
}

export interface LoginWithPasskeyOptions {
  challenge?: string | Uint8Array | Buffer | ArrayBuffer;
  /** base64url encoded IDs */
  allowedCredentialIds?: string[];
  rpId?: string;
  userVerification?: UserVerificationRequirement;
  timeout?: number;
}

export interface LoginWithPasskeyResult {
  /** base64url encoded credential ID */
  credentialId: string;
  /** 64-byte compact signature (hex, r || s) */
  signature: string;
  /** 64-byte compact signature (raw) */
  rawSignature: Uint8Array;
  /** hex representation */
  authenticatorData: string;
  rawAuthenticatorData: Uint8Array;
  /** raw UTF-8 string of clientDataJSON */
  clientDataJSON: string;
  /** signed challenge (hex) */
  challenge: string;
  /** Raw browser credential response for full auditability */
  rawResponse: any;
}
