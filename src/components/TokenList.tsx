"use client";

import { FC, useState } from "react";
import { TokenWithQuote } from "@/lib/types";
import { formatAmount, shortenAddress } from "@/lib/tokens";

// Collapsible section for untradeable tokens
const UntradeableSection: FC<{ tokens: TokenWithQuote[] }> = ({ tokens }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-void-900/50 border border-void-800 hover:border-void-700 transition-colors group"
      >
        <div className="flex items-center gap-2 text-sm font-mono text-void-500">
          <span className="text-neon-orange">⚠️</span>
          <span className="tracking-wider">NGMI TOKENS ({tokens.length})</span>
          <span className="text-void-600 text-xs">- can&apos;t be swapped</span>
        </div>
        <span
          className={`text-void-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 mt-2 opacity-50 animate-fade-in">
          {tokens.map((token, index) => (
            <div
              key={token.mint.toBase58()}
              className="relative p-4 bg-void-900/50 border border-void-800"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Disabled checkbox */}
                <div className="w-6 h-6 border-2 border-void-700 flex items-center justify-center">
                  <span className="text-void-600 text-xs">✕</span>
                </div>

                {/* Token icon */}
                <div className="w-12 h-12 bg-void-900 overflow-hidden flex-shrink-0 border-2 border-void-700 grayscale">
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-void-600 text-lg font-mono">
                      {token.symbol?.[0] || "?"}
                    </div>
                  )}
                </div>

                {/* Token info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-void-500 truncate">
                      {token.symbol || shortenAddress(token.mint.toBase58())}
                    </span>
                  </div>
                  <div className="text-sm text-void-600 truncate font-mono">
                    {formatAmount(token.uiAmount)} {token.symbol}
                  </div>
                </div>

                {/* Error reason */}
                <div className="text-right">
                  <span className="px-3 py-1 text-xs font-mono bg-red-900/30 text-red-400 border border-red-900/50">
                    {token.errorReason || "REKT"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  tokens: TokenWithQuote[];
  onToggleSelect: (mint: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  loading: boolean;
}

export const TokenList: FC<Props> = ({
  tokens,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  loading,
}) => {
  const tradeableTokens = tokens.filter((t) => t.tradeable);
  const untradeableTokens = tokens.filter((t) => !t.tradeable);
  const selectedCount = tokens.filter((t) => t.selected && t.tradeable).length;
  const totalValue = tokens
    .filter((t) => t.selected && t.tradeable)
    .reduce((sum, t) => sum + t.quoteAmountOutUi, 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-20 card-degen animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-16 card-degen">
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-xl font-display font-bold text-neon-cyan mb-2 tracking-wider">
          NO DUST FOUND
        </h3>
        <p className="text-void-400 font-mono text-sm">
          Your wallet is squeaky clean, anon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection controls */}
      <div className="flex items-center justify-between text-sm font-mono">
        <div className="flex gap-4">
          <button
            onClick={onSelectAll}
            className="text-neon-cyan hover:text-neon-pink transition-colors tracking-wider"
          >
            [SELECT ALL]
          </button>
          <button
            onClick={onDeselectAll}
            className="text-neon-purple hover:text-neon-pink transition-colors tracking-wider"
          >
            [DESELECT]
          </button>
        </div>
        <div className="text-void-400">
          <span className="text-neon-pink">{selectedCount}</span> selected |{" "}
          <span className="text-neon-cyan">
            {formatAmount(totalValue, 6)} SOL
          </span>
        </div>
      </div>

      {/* Tradeable tokens */}
      {tradeableTokens.length > 0 && (
        <div className="space-y-2">
          {tradeableTokens.map((token, index) => (
            <div
              key={token.mint.toBase58()}
              onClick={() => onToggleSelect(token.mint.toBase58())}
              className={`
                group relative p-4 cursor-pointer
                transition-all duration-200
                ${
                  token.selected
                    ? "card-degen border-neon-pink glow"
                    : "card-degen hover:border-neon-purple"
                }
              `}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox */}
                <div
                  className={`
                  w-6 h-6 border-2 flex items-center justify-center
                  transition-all duration-200
                  ${
                    token.selected
                      ? "bg-neon-pink border-neon-pink"
                      : "border-neon-purple group-hover:border-neon-cyan"
                  }
                `}
                >
                  {token.selected && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Token icon */}
                <div className="w-12 h-12 bg-void-800 overflow-hidden flex-shrink-0 border-2 border-neon-purple">
                  {token.logoURI ? (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neon-cyan text-lg font-bold font-mono">
                      {token.symbol?.[0] || "?"}
                    </div>
                  )}
                </div>

                {/* Token info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white truncate tracking-wide">
                      {token.symbol || shortenAddress(token.mint.toBase58())}
                    </span>
                    {token.priceImpactPct > 5 && (
                      <span className="px-2 py-0.5 text-xs font-mono bg-neon-orange/20 text-neon-orange border border-neon-orange/50">
                        {token.priceImpactPct.toFixed(1)}% SLIPPAGE
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-void-400 truncate font-mono">
                    {formatAmount(token.uiAmount)} {token.symbol}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right">
                  <div className="font-mono text-neon-cyan font-bold text-lg">
                    {formatAmount(token.quoteAmountOutUi, 6)} SOL
                  </div>
                  <div className="text-xs text-void-500 font-mono">
                    ≈ ${formatAmount(token.quoteAmountOutUi * 200, 2)}
                  </div>
                </div>
              </div>

              {/* Selection indicator */}
              {token.selected && (
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-neon-pink via-neon-purple to-neon-cyan" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Untradeable tokens section - collapsible */}
      {untradeableTokens.length > 0 && (
        <UntradeableSection tokens={untradeableTokens} />
      )}
    </div>
  );
};
