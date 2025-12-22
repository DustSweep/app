// Persistent cache using localStorage

const QUOTE_CACHE_KEY = "dust_sweeper_quotes";
const TOKEN_CACHE_KEY = "dust_sweeper_tokens";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for quotes
const TOKEN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for token list

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface QuoteCacheData {
  outAmount: string;
  priceImpactPct: string;
  error?: string;
  errorCode?: string;
}

// Check if we're in browser
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// Quote cache
export function getCachedQuote(
  mint: string,
  amount: string
): QuoteCacheData | null {
  if (!isBrowser()) return null;

  try {
    const cacheStr = localStorage.getItem(QUOTE_CACHE_KEY);
    if (!cacheStr) return null;

    const cache: Record<string, CacheEntry<QuoteCacheData>> = JSON.parse(
      cacheStr
    );
    const key = `${mint}-${amount}`;
    const entry = cache[key];

    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      console.log(`[Cache] Quote hit for ${mint.slice(0, 8)}...`);
      return entry.data;
    }
    return null;
  } catch (e) {
    console.warn("Failed to read quote cache:", e);
    return null;
  }
}

export function setCachedQuote(
  mint: string,
  amount: string,
  data: QuoteCacheData
): void {
  if (!isBrowser()) return;

  try {
    const cacheStr = localStorage.getItem(QUOTE_CACHE_KEY);
    const cache: Record<string, CacheEntry<QuoteCacheData>> = cacheStr
      ? JSON.parse(cacheStr)
      : {};

    const key = `${mint}-${amount}`;
    cache[key] = { data, timestamp: Date.now() };

    // Clean old entries
    const now = Date.now();
    for (const k of Object.keys(cache)) {
      if (now - cache[k].timestamp > CACHE_TTL) {
        delete cache[k];
      }
    }

    localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Failed to write quote cache:", e);
  }
}

export function clearQuoteCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(QUOTE_CACHE_KEY);
  console.log("[Cache] Quotes cleared");
}

// Token list cache (for the raw token accounts, before quotes)
interface TokenCacheData {
  walletAddress: string;
  tokens: Array<{
    mint: string;
    address: string;
    amount: string;
    decimals: number;
    uiAmount: number;
    symbol?: string;
    name?: string;
    logoURI?: string;
  }>;
}

export function getCachedTokens(walletAddress: string): TokenCacheData | null {
  if (!isBrowser()) return null;

  try {
    const cacheStr = localStorage.getItem(TOKEN_CACHE_KEY);
    if (!cacheStr) return null;

    const entry: CacheEntry<TokenCacheData> = JSON.parse(cacheStr);

    if (
      entry &&
      entry.data.walletAddress === walletAddress &&
      Date.now() - entry.timestamp < TOKEN_CACHE_TTL
    ) {
      console.log("[Cache] Token list hit");
      return entry.data;
    }
    return null;
  } catch (e) {
    console.warn("Failed to read token cache:", e);
    return null;
  }
}

export function setCachedTokens(data: TokenCacheData): void {
  if (!isBrowser()) return;

  try {
    const entry: CacheEntry<TokenCacheData> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(entry));
    console.log("[Cache] Token list saved");
  } catch (e) {
    console.warn("Failed to write token cache:", e);
  }
}

export function clearTokenCache(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_CACHE_KEY);
  console.log("[Cache] Tokens cleared");
}

// Clear all caches
export function clearAllCaches(): void {
  clearQuoteCache();
  clearTokenCache();
}
