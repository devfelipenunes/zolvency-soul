import { describe, it, expect } from "vitest";
import { SoulClient } from "./client.js";

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

  it("should check if address has soul", async () => {
    const has = await client.hasSoul("GCNJNOAQKM3XDEFX2VVPJKXZBF5LN323KZZPSZ73ATEHNY2XT7677ZAG");
    console.log("Has soul:", has);
    expect(typeof has).toBe("boolean");
  });

  it("should fetch soul by ID and format the response correctly", async () => {
    const soul = await client.getSoul(1);
    console.log("Formatted Soul 1:", soul);
    if (soul) {
      expect(typeof soul.id).toBe("number");
      expect(typeof soul.owner).toBe("string");
      expect(typeof soul.passkey).toBe("string");
      expect(soul.passkey).toMatch(/^[0-9a-fA-F]+$/); // Should be a valid hex string
      expect(typeof soul.recoveryPubkey).toBe("string");
      expect(soul.recoveryPubkey).toMatch(/^[0-9a-fA-F]+$/);
      expect(soul.mintedAt).toBeInstanceOf(Date);
      
      // Test getSoulByPasskey using the retrieved passkey hex
      const soulByPasskey = await client.getSoulByPasskey(soul.passkey);
      expect(soulByPasskey).not.toBeNull();
      expect(soulByPasskey!.id).toBe(soul.id);

      // Test getSoulIdByPasskey using the retrieved passkey hex
      const soulIdByPasskey = await client.getSoulIdByPasskey(soul.passkey);
      expect(soulIdByPasskey).toBe(soul.id);
    }
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
