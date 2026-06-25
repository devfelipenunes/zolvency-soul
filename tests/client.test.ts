import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { SoulClient } from "../src/client.js";

describe("SoulClient Formatted Queries", () => {
  const client = new SoulClient({
    network: "testnet",
    contractId: "CBI7N6LOZTVWI5UBE5M7XNDTWHWGO37BZA4X62PM3OP52IGUYMD7XVMV",
  });

  it("should fetch total souls as number", async () => {
    const total = await client.getTotalSouls();
    console.log("Total souls:", total);
    expect(typeof total).toBe("number");
  });

  it("should check if address has soul and fetch its ID if present", async () => {
    const address = "GCNJNOAQKM3XDEFX2VVPJKXZBF5LN323KZZPSZ73ATEHNY2XT7677ZAG";
    const has = await client.hasSoul(address);
    console.log("Has soul:", has);
    expect(typeof has).toBe("boolean");

    const soulId = await client.getSoulIdByAddress(address);
    console.log("Soul ID for address:", soulId);
    if (has) {
      expect(typeof soulId).toBe("number");
    } else {
      expect(soulId).toBeNull();
    }
  });

  it("should fetch soul by ID and format the response correctly", async () => {
    const soul = await client.getSoul(1);
    console.log("Formatted Soul 1:", soul);
    if (soul) {
      expect(typeof soul.id).toBe("number");
      expect(typeof soul.owner).toBe("string");
      expect(typeof soul.passkey).toBe("string");
      expect(soul.passkey).toMatch(/^[0-9a-fA-F]+$/);
      expect(typeof soul.recoveryPubkey).toBe("string");
      expect(soul.recoveryPubkey).toMatch(/^[0-9a-fA-F]+$/);
      expect(soul.mintedAt).toBeInstanceOf(Date);
      
      const soulByPasskey = await client.getSoulByPasskey(soul.passkey);
      expect(soulByPasskey).not.toBeNull();
      expect(soulByPasskey!.id).toBe(soul.id);

      const soulIdByPasskey = await client.getSoulIdByPasskey(soul.passkey);
      expect(soulIdByPasskey).toBe(soul.id);
    }
  });

  it("should handle null results for non-existent entities", async () => {
    const nonExistentId = 999999;
    const nonExistentPasskey = "04" + "00".repeat(64);
    const nonExistentAddress = Keypair.random().publicKey();

    const soul = await client.getSoul(nonExistentId);
    expect(soul).toBeNull();

    const soulByPasskey = await client.getSoulByPasskey(nonExistentPasskey);
    expect(soulByPasskey).toBeNull();

    const idByPasskey = await client.getSoulIdByPasskey(nonExistentPasskey);
    expect(idByPasskey).toBeNull();

    const idByAddress = await client.getSoulIdByAddress(nonExistentAddress);
    expect(idByAddress).toBeNull();
  });

  it("should fetch admin and relayer addresses", async () => {
    const admin = await client.getAdmin();
    const relayer = await client.getRelayer();
    console.log("Admin:", admin);
    console.log("Relayer:", relayer);
    expect(typeof admin).toBe("string");
    expect(typeof relayer).toBe("string");
    expect(admin).toBe("GDZGG5MC5KQY4SPRHBENV4UEFDWGYH6IECEFUNPVWRK7Z7ZIDXRYBS5P");
    expect(relayer).toBe("GDZGG5MC5KQY4SPRHBENV4UEFDWGYH6IECEFUNPVWRK7Z7ZIDXRYBS5P");
  });
});
