import { Client as ContractClient } from "@soul/soul-contract-bindings";
import type { SoulData } from "@soul/soul-contract-bindings";
import { Buffer } from "buffer";
import { toBuffer } from "./utils/encoding.js";
import { NETWORKS } from "./constants/index.js";

export interface SoulClientOptions {
  network?: "testnet" | "mainnet";
  contractId?: string;
  rpcUrl?: string;
  networkPassphrase?: string;
  allowHttp?: boolean;
}

export interface FormattedSoulData {
  id: number;
  owner: string;
  /** Hex public key representation */
  passkey: string;
  /** Hex recovery public key representation */
  recoveryPubkey: string;
  /** JavaScript Date object from ledger timestamp */
  mintedAt: Date;
}



/**
 * Formats raw SoulData from the contract into developer-friendly types.
 */
export function formatSoulData(raw: SoulData): FormattedSoulData {
  return {
    id: Number(raw.id),
    owner: raw.owner,
    passkey: Buffer.from(raw.passkey).toString("hex"),
    recoveryPubkey: Buffer.from(raw.recovery_pubkey).toString("hex"),
    mintedAt: new Date(Number(raw.minted_at) * 1000),
  };
}

export class SoulClient {
  public readonly contract: ContractClient;

  constructor(options: SoulClientOptions = {}) {
    const network = options.network || "testnet";
    const config = NETWORKS[network];
    
    const contractId = options.contractId || config.contractId;
    const networkPassphrase = options.networkPassphrase || config.networkPassphrase;
    const rpcUrl = options.rpcUrl || config.rpcUrl;

    this.contract = new ContractClient({
      networkPassphrase,
      contractId,
      rpcUrl,
      allowHttp: options.allowHttp ?? true,
    });
  }

  /**
   * Fetches a Soul by its ID.
   * @param id The numeric ID of the Soul.
   * @returns The formatted Soul data, or null if the Soul does not exist.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getSoul(id: number): Promise<FormattedSoulData | null> {
    const tx = await this.contract.get_soul({ id });
    const sim = await tx.simulate();
    if (sim.result) {
      return formatSoulData(sim.result as SoulData);
    }
    return null;
  }

  /**
   * Fetches a Soul by its active passkey public key.
   * @param passkey The passkey public key as a hex string, Uint8Array, or Buffer.
   * @returns The formatted Soul data, or null if no Soul is registered under this passkey.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getSoulByPasskey(passkey: string | Uint8Array | Buffer): Promise<FormattedSoulData | null> {
    const passkeyBuffer = toBuffer(passkey);
    const tx = await this.contract.get_soul_by_passkey({ passkey: passkeyBuffer });
    const sim = await tx.simulate();
    if (sim.result) {
      return formatSoulData(sim.result as SoulData);
    }
    return null;
  }

  /**
   * Gets the Soul ID associated with a Stellar owner address.
   * @param address The Stellar public key address of the owner.
   * @returns The Soul ID, or null if the address has no Soul.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getSoulIdByAddress(address: string): Promise<number | null> {
    const tx = await this.contract.get_soul_id_by_address({ address });
    const sim = await tx.simulate();
    return sim.result !== undefined && sim.result !== null ? Number(sim.result) : null;
  }

  /**
   * Gets the Soul ID associated with a passkey public key.
   * @param passkey The passkey public key as a hex string, Uint8Array, or Buffer.
   * @returns The Soul ID, or null if no Soul is registered under this passkey.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getSoulIdByPasskey(passkey: string | Uint8Array | Buffer): Promise<number | null> {
    const passkeyBuffer = toBuffer(passkey);
    const tx = await this.contract.get_soul_id_by_passkey({ passkey: passkeyBuffer });
    const sim = await tx.simulate();
    return sim.result !== undefined && sim.result !== null ? Number(sim.result) : null;
  }

  /**
   * Checks whether a Stellar address has an associated Soul registered.
   * @param address The Stellar public key address to check.
   * @returns True if the address has a Soul, false otherwise.
   * @throws If the RPC query or transaction simulation fails.
   */
  async hasSoul(address: string): Promise<boolean> {
    const tx = await this.contract.has_soul({ address });
    const sim = await tx.simulate();
    return !!sim.result;
  }

  /**
   * Gets the total number of minted Souls.
   * @returns The total count of registered Souls.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getTotalSouls(): Promise<number> {
    const tx = await this.contract.total_souls();
    const sim = await tx.simulate();
    return sim.result !== undefined && sim.result !== null ? Number(sim.result) : 0;
  }

  /**
   * Fetches the current Admin address configured in the contract.
   * @returns The Admin's Stellar address, or null if not initialized.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getAdmin(): Promise<string | null> {
    const tx = await this.contract.admin();
    const sim = await tx.simulate();
    if (sim.result) {
      if (typeof (sim.result as any).unwrap === "function") {
        return (sim.result as any).unwrap();
      }
      return (sim.result as any).value || null;
    }
    return null;
  }

  /**
   * Fetches the current Relayer address configured in the contract.
   * @returns The Relayer's Stellar address, or null if not initialized.
   * @throws If the RPC query or transaction simulation fails.
   */
  async getRelayer(): Promise<string | null> {
    const tx = await this.contract.relayer();
    const sim = await tx.simulate();
    if (sim.result) {
      if (typeof (sim.result as any).unwrap === "function") {
        return (sim.result as any).unwrap();
      }
      return (sim.result as any).value || null;
    }
    return null;
  }
}
