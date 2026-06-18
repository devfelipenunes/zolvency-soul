# @soul/auth-sdk

A professional, open-source TypeScript/JavaScript SDK for querying and interacting with the Soul Protocol smart contracts on Stellar Soroban.

---

## ✨ Features

- **Multi-Network Support**: Seamless integration with both Stellar `testnet` and `mainnet`.
- **Natively Formatted Data**: No need to manually parse ledger timestamps or buffer keys. Under the hood, public keys are formatted to hex strings, timestamps are converted into native JavaScript `Date` objects, and contract `Result` wraps are unwrapped.
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
