# @soul/auth-sdk

A professional, open-source TypeScript/JavaScript SDK for querying and interacting with the Soul Protocol smart contracts on Stellar Soroban.

---

## ✨ Features

- **Multi-Network Support**: Seamless integration with both Stellar `testnet` and `mainnet`.
- **Natively Formatted Data**: No need to manually parse ledger timestamps or buffer keys. Under the hood, public keys are formatted to hex strings, timestamps are converted into native JavaScript `Date` objects, and contract `Result` wraps are unwrapped.
- **WebAuthn Biometrics**: Natively trigger, verify, and parse browser platform credentials.
- **ECDSA & ASN.1 Parsers**: Built-in support to parse SPKI DER keys to 65-byte uncompressed format (`04` prefix) and normalize ASN.1 signatures to 64-byte compact, low-S normalized signatures (`r || s`) for Soroban compatibility.
- **Recovery/Rotation Payloads**: Simple synchronous helpers to compute recovery and rotation message hashes in any environment.
- **TypeScript First**: Complete Type definitions for all return types and options.
- **Developer Friendly**: Built-in methods to easily check registrations, query registry limits, retrieve admin keys, and find identities by passkeys.

---

## 📦 Installation

Install the package via npm (or your preferred package manager):

```bash
npm install @soul/auth-sdk
```

---

## 🚀 Getting Started

### 1. Initialize the Client

By default, the client is initialized on **Stellar Testnet** using the canonical Soul contract address.

```typescript
import { SoulClient } from "@soul/auth-sdk";

// Initialize on Testnet (Default)
const client = new SoulClient();

// Initialize on Mainnet or with custom parameters
const mainnetClient = new SoulClient({
  network: "mainnet",
  contractId: "CBI7N6LOZTVWI5UBE5M7XNDTWHWGO37BZA4X62PM3OP52IGUYMD7XVMV", // Example address
});
```

### 2. Querying Soul Identity Records

#### Check if an Address Has a Soul
```typescript
const address = "GCNJNOAQKM3XDEFX2VVPJKXZBF5LN323KZZPSZ73ATEHNY2XT7677ZAG";
const hasSoul = await client.hasSoul(address);
console.log(`Has Soul: ${hasSoul}`);
```

#### Fetch a Soul by ID
```typescript
const soul = await client.getSoul(1);
if (soul) {
  console.log("Soul ID:", soul.id);
  console.log("Owner Address:", soul.owner);
  console.log("Passkey Public Key (Hex):", soul.passkey);
  console.log("Recovery Public Key (Hex):", soul.recoveryPubkey);
  console.log("Minted At Date:", soul.mintedAt); // Returns a native JS Date object
}
```

#### Resolve a Soul ID by Owner Address
```typescript
const soulId = await client.getSoulIdByAddress(address);
console.log(`Soul ID: ${soulId}`);
```

#### Query a Soul by Passkey Public Key (Hex)
```typescript
const passkeyHex = "0452ce9ecbc7cea9634efce701ec038e0a7c80ba3bf4969528f910b5ddf86889010c46a39f4153oace801d61b0760e6df297...";
const soul = await client.getSoulByPasskey(passkeyHex);
```

#### Resolve a Soul ID by Passkey Public Key (Hex)
```typescript
const soulId = await client.getSoulIdByPasskey(passkeyHex);
```

### 3. WebAuthn Passkeys & Signatures

#### Create a Passkey
Trigger the native browser biometric prompt to register a new platform passkey:
```typescript
import { createPasskey } from "@soul/auth-sdk";

const result = await createPasskey({
  username: "alice@example.com",
  displayName: "Alice",
});

console.log("Credential ID (base64url):", result.credentialId);
console.log("Uncompressed Public Key (Hex, 65 bytes):", result.publicKey);
```

#### Login with a Passkey
Authenticate a challenge using biometrics and get a 64-byte compact signature (`r || s`) formatted for Soroban contract validation:
```typescript
import { loginWithPasskey } from "@soul/auth-sdk";

const result = await loginWithPasskey({
  challenge: "dGVzdC1jaGFsbGVuZ2U=", // base64, hex, or raw bytes
});

console.log("Signature (Hex, 64 bytes):", result.signature);
```

#### Compute Message Hashes for Recovery & Rotation
Compute message hashes of type `sha256(old_key || new_key)` to register recovery or rotate credentials:
```typescript
import { computeRecoveryMessageHash } from "@soul/auth-sdk";

const oldKey = "04...";
const newKey = "04...";
const hashToSign = computeRecoveryMessageHash(oldKey, newKey);
```

---

## 🛠️ API Reference

### `SoulClientOptions`
* `network`: `"testnet" | "mainnet"` (Default: `"testnet"`)
* `contractId`: `string` (Custom contract address)
* `rpcUrl`: `string` (Custom RPC server endpoint)
* `networkPassphrase`: `string` (Stellar network passphrase)
* `allowHttp`: `boolean` (Allow non-SSL connections, useful for local tests)

### `FormattedSoulData`
* `id`: `number` (The numeric ID of the Soul)
* `owner`: `string` (Stellar public key of the owner)
* `passkey`: `string` (Hex public key of the active passkey)
* `recoveryPubkey`: `string` (Hex public key of the recovery device)
* `mintedAt`: `Date` (JavaScript Date representing when the Soul was minted)

### Helper Functions

#### `createPasskey(options: CreatePasskeyOptions): Promise<CreatePasskeyResult>`
Triggers browser platform passkey registration (secp256r1/ES256) and returns the credential details along with the uncompressed 65-byte public key.

#### `loginWithPasskey(options: LoginWithPasskeyOptions): Promise<LoginWithPasskeyResult>`
Triggers browser platform biometric assertion prompt and returns the credential ID, signature (normalized to low-S compact 64-byte), and authentication parameters.

#### `computeRecoveryMessageHash(oldPasskey, newPasskey): Uint8Array`
Generates a SHA-256 hash of concatenated old and new uncompressed passkeys (65 bytes each) to be used during recovery verification.

#### `computeRotationMessageHash(oldRecoveryKey, newRecoveryKey): Uint8Array`
Generates a SHA-256 hash of concatenated old and new uncompressed recovery keys (65 bytes each) to be used during recovery key rotation.

---

## 🧪 Development & Testing

### Running Tests
The test suite runs using Vitest against the live Stellar Testnet contract:

```bash
# Install development dependencies
npm install

# Run the tests
npm run test
```

### Regenerating Soroban Contract Bindings
If the smart contract interfaces change, you can easily regenerate the bindings from `soul.wasm` using:

```bash
npm run generate-bindings
```
*Note: This command requires the [Stellar CLI](https://stellar.org/developers-blog/introducing-the-stellar-cli) to be installed locally.*

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
