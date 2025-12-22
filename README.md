# Dust Sweeper 🧹

A Solana app that lets users sweep worthless "dust" tokens from their wallet and convert them to SOL using Jupiter's routing.

## Features

- **Wallet Connection**: Connect any Solana wallet (Phantom, Solflare, etc.)
- **Token Discovery**: Automatically scans for all SPL tokens in the wallet
- **Value Estimation**: Uses Jupiter's quote API to estimate the SOL value of each token
- **Batch Swapping**: Swap multiple tokens to SOL with progress tracking
- **Platform Fee**: 1% fee on all swaps (configurable)

## How It Works

1. User connects their Solana wallet
2. App fetches all token accounts using `getTokenAccountsByOwner`
3. For each token, fetches a quote from Jupiter's `/quote` endpoint
4. User selects which tokens to sweep
5. App executes swaps sequentially through Jupiter's `/swap` endpoint
6. Results are displayed in real-time

## Setup

### Prerequisites

- Node.js 18+
- A Solana RPC endpoint (default uses public RPC, recommended to use your own)

### Configuration

1. Update `src/lib/constants.ts`:

```typescript
// Change to your fee collection wallet
export const FEE_ACCOUNT = new PublicKey("YOUR_FEE_WALLET_ADDRESS_HERE");

// Optional: Use a custom RPC endpoint
export const RPC_ENDPOINT = "https://your-rpc-endpoint.com";
```

2. Set environment variable (optional):

```bash
export NEXT_PUBLIC_RPC_ENDPOINT="https://your-rpc-endpoint.com"
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Jupiter Integration

This app uses Jupiter's V6 API:

- **Quote API**: `https://quote-api.jup.ag/v6/quote` - Gets swap quotes
- **Swap API**: `https://quote-api.jup.ag/v6/swap` - Builds swap transactions

### Fee Implementation

The platform fee is implemented using Jupiter's built-in `platformFeeBps` parameter:

```typescript
const params = new URLSearchParams({
  inputMint: inputMint.toBase58(),
  outputMint: NATIVE_SOL_MINT.toBase58(),
  amount: inputAmount.toString(),
  platformFeeBps: "100", // 1% = 100 basis points
});
```

When building the swap transaction, we pass our `feeAccount`:

```typescript
const response = await fetch("/swap", {
  method: "POST",
  body: JSON.stringify({
    quoteResponse: quote,
    userPublicKey: userPublicKey.toBase58(),
    feeAccount: FEE_ACCOUNT.toBase58(), // Your fee wallet
  }),
});
```

Jupiter automatically routes the fee to your account as part of the swap.

## Architecture

```
src/
├── app/
│   ├── globals.css      # Global styles + Tailwind
│   ├── layout.tsx       # Root layout with providers
│   └── page.tsx         # Main app page
├── components/
│   ├── WalletProvider.tsx   # Solana wallet adapter setup
│   ├── TokenList.tsx        # Token selection UI
│   └── SwapProgress.tsx     # Swap progress/results
└── lib/
    ├── constants.ts     # Config constants
    ├── types.ts         # TypeScript types
    ├── tokens.ts        # Token fetching utilities
    └── jupiter.ts       # Jupiter API integration
```

## Production Considerations

1. **RPC Endpoint**: Use a dedicated RPC provider (Helius, QuickNode, etc.) for reliability
2. **Rate Limiting**: Jupiter has rate limits; consider batching or adding delays
3. **Error Handling**: Add retry logic for failed swaps
4. **Fee Account**: Set up a proper ATA (Associated Token Account) for fee collection
5. **Slippage**: Current default is 5% - adjust based on your needs

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- @solana/web3.js
- @solana/wallet-adapter-react
- Jupiter V6 API

## License

MIT
