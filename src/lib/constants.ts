import { PublicKey } from "@solana/web3.js";

// Default fee account (System Program - a valid placeholder)
const DEFAULT_FEE_ACCOUNT = "11111111111111111111111111111111";

// Your fee collection wallet - set NEXT_PUBLIC_FEE_ACCOUNT in .env
function getFeeAccount(): PublicKey {
  const envValue = process.env.NEXT_PUBLIC_FEE_ACCOUNT;
  if (envValue && envValue.length >= 32 && envValue.length <= 44) {
    try {
      return new PublicKey(envValue);
    } catch {
      console.warn("Invalid FEE_ACCOUNT address, using default");
    }
  }
  return new PublicKey(DEFAULT_FEE_ACCOUNT);
}

export const FEE_ACCOUNT = getFeeAccount();

// Platform fee in basis points (100 = 1%)
export const PLATFORM_FEE_BPS = 100;

// RPC endpoint - use your own for production
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";

// Jupiter API - new v1 endpoint
export const JUPITER_API_BASE = "https://api.jup.ag/swap/v1";

// Jupiter API Key - get one from https://portal.jup.ag
export const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";

// SOL mint address (native SOL wrapped)
export const NATIVE_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

// Minimum value in SOL to swap (must be worth more than tx fee ~0.00005 SOL)
// Set to 0.002 SOL (~$0.40) to ensure it's actually worth swapping
export const MIN_DUST_VALUE_SOL = 0.002;

// Maximum tokens to process in a single batch
export const MAX_BATCH_SIZE = 10;
