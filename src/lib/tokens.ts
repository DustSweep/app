import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";
import { TokenInfo, TokenMetadata } from "./types";
import { NATIVE_SOL_MINT } from "./constants";
import { getCachedTokens, setCachedTokens } from "./cache";

// Cache for token metadata (in-memory, populated from Jupiter)
const metadataCache = new Map<string, TokenMetadata>();
let metadataLoaded = false;

export async function fetchTokenAccounts(
  connection: Connection,
  walletAddress: PublicKey
): Promise<TokenInfo[]> {
  const walletStr = walletAddress.toBase58();

  // Check localStorage cache first
  const cached = getCachedTokens(walletStr);
  if (cached) {
    console.log("[Tokens] Using cached token list");
    return cached.tokens.map((t) => ({
      mint: new PublicKey(t.mint),
      address: new PublicKey(t.address),
      amount: BigInt(t.amount),
      decimals: t.decimals,
      uiAmount: t.uiAmount,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI,
    }));
  }

  console.log("[Tokens] Fetching fresh token list from RPC");
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    walletAddress,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  const tokens: TokenInfo[] = [];

  for (const { pubkey, account } of tokenAccounts.value) {
    const accountData = AccountLayout.decode(account.data);
    const mint = new PublicKey(accountData.mint);
    const amount = accountData.amount;

    // Skip empty accounts and wrapped SOL
    if (amount === BigInt(0)) continue;
    if (mint.equals(NATIVE_SOL_MINT)) continue;

    // Get mint info for decimals
    try {
      const mintInfo = await connection.getParsedAccountInfo(mint);
      const decimals =
        (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
      const uiAmount = Number(amount) / Math.pow(10, decimals);

      tokens.push({
        mint,
        address: pubkey,
        amount,
        decimals,
        uiAmount,
      });
    } catch (e) {
      console.warn(`Failed to get mint info for ${mint.toBase58()}:`, e);
    }
  }

  return tokens;
}

export async function enrichTokenMetadata(
  tokens: TokenInfo[]
): Promise<TokenInfo[]> {
  // Load metadata from Jupiter (only once per session)
  if (!metadataLoaded) {
    try {
      const response = await fetch("https://token.jup.ag/strict");
      const tokenList: TokenMetadata[] = await response.json();
      for (const token of tokenList) {
        metadataCache.set(token.address, token);
      }
    } catch (e) {
      console.warn("Failed to fetch Jupiter strict token list:", e);
    }

    try {
      const response = await fetch("https://token.jup.ag/all");
      const tokenList: TokenMetadata[] = await response.json();
      for (const token of tokenList) {
        if (!metadataCache.has(token.address)) {
          metadataCache.set(token.address, token);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Jupiter all token list:", e);
    }

    metadataLoaded = true;
  }

  // Enrich tokens with metadata
  const enrichedTokens = tokens.map((token) => {
    const metadata = metadataCache.get(token.mint.toBase58());
    return {
      ...token,
      symbol: metadata?.symbol || shortenAddress(token.mint.toBase58()),
      name: metadata?.name || "Unknown Token",
      logoURI: metadata?.logoURI,
    };
  });

  // Cache the enriched token list
  if (tokens.length > 0) {
    // We need the wallet address for caching - get it from the first token's associated account
    // Actually, we'll cache in the page component where we have the wallet address
  }

  return enrichedTokens;
}

// Cache enriched tokens (call from page component)
export function cacheTokensForWallet(
  walletAddress: string,
  tokens: TokenInfo[]
): void {
  setCachedTokens({
    walletAddress,
    tokens: tokens.map((t) => ({
      mint: t.mint.toBase58(),
      address: t.address.toBase58(),
      amount: t.amount.toString(),
      decimals: t.decimals,
      uiAmount: t.uiAmount,
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI,
    })),
  });
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatAmount(amount: number, decimals = 6): string {
  if (amount === 0) return "0";
  if (amount < 0.000001) return "<0.000001";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatSol(lamports: bigint | number): string {
  const sol = Number(lamports) / 1e9;
  return formatAmount(sol, 9);
}
