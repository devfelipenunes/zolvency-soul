export interface NetworkConfig {
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export const NETWORKS: Record<"testnet" | "mainnet", NetworkConfig> = {
  testnet: {
    contractId: "CBI7N6LOZTVWI5UBE5M7XNDTWHWGO37BZA4X62PM3OP52IGUYMD7XVMV",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  mainnet: {
    contractId: "CBI7N6LOZTVWI5UBE5M7XNDTWHWGO37BZA4X62PM3OP52IGUYMD7XVMV",
    rpcUrl: "https://soroban-mainnet.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; October 2015",
  },
};
