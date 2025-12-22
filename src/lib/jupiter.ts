import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  TokenInfo,
  TokenWithQuote,
  JupiterQuoteResponse,
  JupiterErrorResponse,
  JupiterSwapResponse,
  SwapResult,
} from "./types";
import {
  JUPITER_API_BASE,
  JUPITER_API_KEY,
  NATIVE_SOL_MINT,
  FEE_ACCOUNT,
  PLATFORM_FEE_BPS,
  MIN_DUST_VALUE_SOL,
} from "./constants";
import { getCachedQuote, setCachedQuote } from "./cache";

const SLIPPAGE_BPS = 50;

function getJupiterHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  if (JUPITER_API_KEY) {
    headers["x-api-key"] = JUPITER_API_KEY;
  }
  return headers;
}

interface QuoteResult {
  quote: JupiterQuoteResponse | null;
  error: JupiterErrorResponse | null;
  fromCache: boolean;
}

// Get the fee account ATA for wSOL
function getFeeTokenAccount(): string {
  try {
    const ata = getAssociatedTokenAddressSync(NATIVE_SOL_MINT, FEE_ACCOUNT);
    return ata.toBase58();
  } catch (e) {
    console.warn("Failed to derive fee ATA, using fee account directly:", e);
    return FEE_ACCOUNT.toBase58();
  }
}

export async function getQuote(
  inputMint: PublicKey,
  inputAmount: bigint,
  useCache = true
): Promise<QuoteResult> {
  const mintStr = inputMint.toBase58();
  const amountStr = inputAmount.toString();

  // Check localStorage cache first
  if (useCache) {
    const cached = getCachedQuote(mintStr, amountStr);
    if (cached) {
      if (cached.error) {
        return {
          quote: null,
          error: {
            error: cached.error,
            errorCode: cached.errorCode || "CACHED_ERROR",
          },
          fromCache: true,
        };
      }
      return {
        quote: {
          outAmount: cached.outAmount,
          priceImpactPct: cached.priceImpactPct,
        } as JupiterQuoteResponse,
        error: null,
        fromCache: true,
      };
    }
  }

  try {
    const params = new URLSearchParams({
      slippageBps: SLIPPAGE_BPS.toString(),
      swapMode: "ExactIn",
      restrictIntermediateTokens: "true",
      maxAccounts: "64",
      instructionVersion: "V1",
      inputMint: mintStr,
      outputMint: NATIVE_SOL_MINT.toBase58(),
      amount: amountStr,
      platformFeeBps: PLATFORM_FEE_BPS.toString(),
    });

    const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`, {
      method: "GET",
      headers: getJupiterHeaders(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.warn(`Quote failed for ${mintStr}:`, data);
      // Cache the error
      setCachedQuote(mintStr, amountStr, {
        outAmount: "0",
        priceImpactPct: "0",
        error: data.error,
        errorCode: data.errorCode,
      });
      return {
        quote: null,
        error: data as JupiterErrorResponse,
        fromCache: false,
      };
    }

    // Cache successful quote
    setCachedQuote(mintStr, amountStr, {
      outAmount: data.outAmount,
      priceImpactPct: data.priceImpactPct,
    });

    return {
      quote: data as JupiterQuoteResponse,
      error: null,
      fromCache: false,
    };
  } catch (e) {
    console.warn(`Quote error for ${mintStr}:`, e);
    return {
      quote: null,
      error: { error: "Network error", errorCode: "NETWORK_ERROR" },
      fromCache: false,
    };
  }
}

// Rate-limited queue for Jupiter API
class RateLimiter {
  private lastRequest = 0;
  private minInterval = 500; // 0.5 seconds for local testing (increase to 1100 for production)

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - elapsed)
      );
    }
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

// Map error codes to user-friendly messages
function getErrorMessage(errorCode: string, errorMsg?: string): string {
  // Check for specific error messages
  if (errorMsg?.toLowerCase().includes("insufficient")) {
    return "Insufficient balance";
  }
  if (errorMsg?.toLowerCase().includes("too small")) {
    return "Amount too small";
  }

  switch (errorCode) {
    case "TOKEN_NOT_TRADABLE":
      return "Not tradeable";
    case "COULD_NOT_FIND_ANY_ROUTE":
      return "No liquidity";
    case "NO_ROUTES_FOUND":
      return "No route found";
    case "AMOUNT_TOO_SMALL":
      return "Amount too small";
    default:
      return "Cannot swap";
  }
}

export async function getQuotesForTokens(
  tokens: TokenInfo[],
  onProgress?: (current: number, total: number) => void
): Promise<TokenWithQuote[]> {
  const tokensWithQuotes: TokenWithQuote[] = [];

  // Process sequentially due to 1 RPS limit
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Report progress
    if (onProgress) {
      onProgress(i + 1, tokens.length);
    }

    // Check cache first - if cached, skip rate limit
    const { quote, error, fromCache } = await getQuote(
      token.mint,
      token.amount
    );

    // Only rate limit if we actually hit the API
    if (!fromCache) {
      await rateLimiter.wait();
    }

    if (quote) {
      const outAmount = BigInt(quote.outAmount);
      const outAmountUi = Number(outAmount) / 1e9;

      // Filter out tokens worth less than minimum
      if (outAmountUi >= MIN_DUST_VALUE_SOL) {
        tokensWithQuotes.push({
          ...token,
          quoteAmountOut: outAmount,
          quoteAmountOutUi: outAmountUi,
          priceImpactPct: parseFloat(quote.priceImpactPct),
          selected: true,
          tradeable: true,
        });
      }
    } else if (error) {
      // Add untradeable tokens so user can see them
      tokensWithQuotes.push({
        ...token,
        quoteAmountOut: BigInt(0),
        quoteAmountOutUi: 0,
        priceImpactPct: 0,
        selected: false,
        tradeable: false,
        errorReason: getErrorMessage(error.errorCode, error.error),
      });
    }
  }

  // Sort: tradeable first (by value desc), then untradeable
  return tokensWithQuotes.sort((a, b) => {
    if (a.tradeable && !b.tradeable) return -1;
    if (!a.tradeable && b.tradeable) return 1;
    return b.quoteAmountOutUi - a.quoteAmountOutUi;
  });
}

export async function buildSwapTransaction(
  quote: JupiterQuoteResponse,
  userPublicKey: PublicKey
): Promise<JupiterSwapResponse | null> {
  try {
    await rateLimiter.wait();

    const feeTokenAccount = getFeeTokenAccount();

    const response = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: "POST",
      headers: {
        ...getJupiterHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: userPublicKey.toBase58(),
        wrapAndUnwrapSol: true,
        feeAccount: feeTokenAccount,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Swap build failed:", error);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error("Swap build error:", e);
    return null;
  }
}

// Build all swap transactions first, then batch sign
export async function executeSwapsBatched(
  connection: Connection,
  tokens: TokenWithQuote[],
  userPublicKey: PublicKey,
  signAllTransactions: (
    txs: VersionedTransaction[]
  ) => Promise<VersionedTransaction[]>,
  onProgress: (
    result: SwapResult,
    phase: "building" | "signing" | "sending"
  ) => void
): Promise<SwapResult[]> {
  const results: SwapResult[] = [];
  const selectedTokens = tokens.filter((t) => t.selected && t.tradeable);

  if (selectedTokens.length === 0) return results;

  // Phase 1: Build all transactions
  const transactionsToSign: Array<{
    token: TokenWithQuote;
    transaction: VersionedTransaction;
    quote: JupiterQuoteResponse;
    swapResponse: JupiterSwapResponse;
  }> = [];

  for (const token of selectedTokens) {
    const mintStr = token.mint.toBase58();

    try {
      // Get fresh quote (don't use cache for actual swaps)
      const { quote } = await getQuote(token.mint, token.amount, false);
      if (!quote) {
        results.push({
          mint: mintStr,
          success: false,
          error: "Failed to get quote",
        });
        onProgress(
          { mint: mintStr, success: false, error: "Failed to get quote" },
          "building"
        );
        continue;
      }

      // Build swap transaction
      const swapResponse = await buildSwapTransaction(quote, userPublicKey);
      if (!swapResponse) {
        results.push({
          mint: mintStr,
          success: false,
          error: "Failed to build transaction",
        });
        onProgress(
          { mint: mintStr, success: false, error: "Failed to build tx" },
          "building"
        );
        continue;
      }

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(
        swapResponse.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      transactionsToSign.push({ token, transaction, quote, swapResponse });
      onProgress({ mint: mintStr, success: true }, "building");
    } catch (e: any) {
      results.push({
        mint: mintStr,
        success: false,
        error: e.message || "Build error",
      });
      onProgress(
        { mint: mintStr, success: false, error: e.message },
        "building"
      );
    }
  }

  if (transactionsToSign.length === 0) return results;

  // Phase 2: Batch sign all transactions at once
  onProgress({ mint: "all", success: true }, "signing");

  let signedTransactions: VersionedTransaction[];
  try {
    signedTransactions = await signAllTransactions(
      transactionsToSign.map((t) => t.transaction)
    );
  } catch (e: any) {
    // User rejected or signing failed
    for (const { token } of transactionsToSign) {
      results.push({
        mint: token.mint.toBase58(),
        success: false,
        error: "Signing cancelled",
      });
    }
    return results;
  }

  // Phase 3: Send all signed transactions
  for (let i = 0; i < signedTransactions.length; i++) {
    const { token, quote, swapResponse } = transactionsToSign[i];
    const signedTransaction = signedTransactions[i];
    const mintStr = token.mint.toBase58();

    try {
      const rawTransaction = signedTransaction.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: signedTransaction.message.recentBlockhash,
        lastValidBlockHeight: swapResponse.lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        const result: SwapResult = {
          mint: mintStr,
          success: false,
          signature,
          error: "Transaction failed on chain",
        };
        results.push(result);
        onProgress(result, "sending");
      } else {
        const result: SwapResult = {
          mint: mintStr,
          success: true,
          signature,
          amountOut: Number(quote.outAmount) / 1e9,
        };
        results.push(result);
        onProgress(result, "sending");
      }
    } catch (e: any) {
      const result: SwapResult = {
        mint: mintStr,
        success: false,
        error: e.message || "Send error",
      };
      results.push(result);
      onProgress(result, "sending");
    }
  }

  return results;
}

// Legacy single-sign version (kept for compatibility)
export async function executeSwaps(
  connection: Connection,
  tokens: TokenWithQuote[],
  userPublicKey: PublicKey,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  onProgress: (result: SwapResult) => void
): Promise<SwapResult[]> {
  const results: SwapResult[] = [];
  const selectedTokens = tokens.filter((t) => t.selected && t.tradeable);

  for (const token of selectedTokens) {
    const mintStr = token.mint.toBase58();

    try {
      const { quote } = await getQuote(token.mint, token.amount, false);
      if (!quote) {
        const result: SwapResult = {
          mint: mintStr,
          success: false,
          error: "Failed to get quote",
        };
        results.push(result);
        onProgress(result);
        continue;
      }

      const swapResponse = await buildSwapTransaction(quote, userPublicKey);
      if (!swapResponse) {
        const result: SwapResult = {
          mint: mintStr,
          success: false,
          error: "Failed to build tx",
        };
        results.push(result);
        onProgress(result);
        continue;
      }

      const swapTransactionBuf = Buffer.from(
        swapResponse.swapTransaction,
        "base64"
      );
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      const signedTransaction = await signTransaction(transaction);

      const rawTransaction = signedTransaction.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2,
      });

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight: swapResponse.lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        const result: SwapResult = {
          mint: mintStr,
          success: false,
          signature,
          error: "Failed on chain",
        };
        results.push(result);
        onProgress(result);
      } else {
        const result: SwapResult = {
          mint: mintStr,
          success: true,
          signature,
          amountOut: Number(quote.outAmount) / 1e9,
        };
        results.push(result);
        onProgress(result);
      }
    } catch (e: any) {
      const result: SwapResult = {
        mint: mintStr,
        success: false,
        error: e.message || "Unknown error",
      };
      results.push(result);
      onProgress(result);
    }
  }

  return results;
}
