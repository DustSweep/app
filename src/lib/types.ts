import { PublicKey } from "@solana/web3.js";

export interface TokenInfo {
  mint: PublicKey;
  address: PublicKey; // Token account address
  amount: bigint;
  decimals: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  uiAmount: number;
}

export interface TokenWithQuote extends TokenInfo {
  quoteAmountOut: bigint; // Amount of SOL received
  quoteAmountOutUi: number;
  priceImpactPct: number;
  selected: boolean;
  tradeable: boolean;
  errorReason?: string;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    amount: string;
    feeBps: number;
  } | null;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterErrorResponse {
  error: string;
  errorCode: string;
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export interface SwapResult {
  mint: string;
  success: boolean;
  signature?: string;
  amountOut?: number;
  error?: string;
}

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}
