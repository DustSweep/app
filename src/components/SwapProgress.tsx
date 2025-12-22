"use client";

import { FC } from "react";
import { SwapResult } from "@/lib/types";
import { shortenAddress } from "@/lib/tokens";

interface Props {
  results: SwapResult[];
  totalTokens: number;
  isComplete: boolean;
}

export const SwapProgress: FC<Props> = ({
  results,
  totalTokens,
  isComplete,
}) => {
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const totalSolReceived = results
    .filter((r) => r.success && r.amountOut)
    .reduce((sum, r) => sum + (r.amountOut || 0), 0);

  const progress = (results.length / totalTokens) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-mono">
          <span className="text-void-400 tracking-wider">
            Processing {results.length} of {totalTokens} tokens
          </span>
          <span className="text-neon-cyan">{Math.round(progress)}%</span>
        </div>
        <div className="h-4 bg-void-900 pixel-border overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      {isComplete && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 status-success text-center">
            <div className="text-3xl font-display font-black">
              {successCount}
            </div>
            <div className="text-xs font-mono tracking-wider mt-1">
              SUCCESSFUL
            </div>
          </div>
          <div className="p-4 status-error text-center">
            <div className="text-3xl font-display font-black">
              {failedCount}
            </div>
            <div className="text-xs font-mono tracking-wider mt-1">FAILED</div>
          </div>
          <div className="p-4 card-degen border-neon-cyan text-center">
            <div className="text-3xl font-display font-black text-neon-cyan">
              {totalSolReceived.toFixed(6)}
            </div>
            <div className="text-xs font-mono tracking-wider mt-1 text-neon-cyan">
              SOL RECEIVED
            </div>
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={index}
            className={`
              flex items-center justify-between p-3 text-sm font-mono
              ${result.success ? "status-success" : "status-error"}
            `}
          >
            <div className="flex items-center gap-3">
              <span
                className={result.success ? "text-green-400" : "text-red-400"}
              >
                {result.success ? "✓" : "✗"}
              </span>
              <span className="tracking-wider">
                {shortenAddress(result.mint)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {result.success && result.amountOut && (
                <span className="text-green-400">
                  +{result.amountOut.toFixed(6)} SOL
                </span>
              )}
              {result.signature && (
                <a
                  href={`https://solscan.io/tx/${result.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-cyan hover:text-neon-pink transition-colors"
                >
                  [VIEW TX]
                </a>
              )}
              {result.error && (
                <span className="text-red-400 text-xs truncate max-w-[150px]">
                  {result.error}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
