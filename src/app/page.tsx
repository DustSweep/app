"use client";

import { useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/WalletButton";
import { TokenWithQuote, SwapResult } from "@/lib/types";
import {
  fetchTokenAccounts,
  enrichTokenMetadata,
  formatAmount,
  cacheTokensForWallet,
} from "@/lib/tokens";
import { getQuotesForTokens, executeSwapsBatched } from "@/lib/jupiter";
import { TokenList } from "@/components/TokenList";
import { SwapProgress } from "@/components/SwapProgress";
import { clearAllCaches } from "@/lib/cache";

type AppState =
  | "idle"
  | "loading"
  | "ready"
  | "building"
  | "signing"
  | "sending"
  | "complete";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();

  const [state, setState] = useState<AppState>("idle");
  const [tokens, setTokens] = useState<TokenWithQuote[]>([]);
  const [swapResults, setSwapResults] = useState<SwapResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [swapPhase, setSwapPhase] = useState<string>("");

  // Fetch tokens when wallet connects
  const loadTokens = useCallback(async () => {
    if (!publicKey) return;

    setState("loading");
    setError(null);
    setTokens([]);
    setLoadingProgress({ current: 0, total: 0 });

    try {
      const rawTokens = await fetchTokenAccounts(connection, publicKey);

      if (rawTokens.length === 0) {
        setState("ready");
        return;
      }

      const enrichedTokens = await enrichTokenMetadata(rawTokens);
      cacheTokensForWallet(publicKey.toBase58(), enrichedTokens);
      setLoadingProgress({ current: 0, total: enrichedTokens.length });

      const tokensWithQuotes = await getQuotesForTokens(
        enrichedTokens,
        (current, total) => {
          setLoadingProgress({ current, total });
        }
      );

      setTokens(tokensWithQuotes);
      setState("ready");
    } catch (e: any) {
      console.error("Failed to load tokens:", e);
      setError(e.message || "Failed to load tokens");
      setState("idle");
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      loadTokens();
    } else {
      setState("idle");
      setTokens([]);
      setSwapResults([]);
    }
  }, [connected, publicKey, loadTokens]);

  const handleToggleSelect = useCallback((mint: string) => {
    setTokens((prev) =>
      prev.map((t) =>
        t.mint.toBase58() === mint && t.tradeable
          ? { ...t, selected: !t.selected }
          : t
      )
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setTokens((prev) =>
      prev.map((t) => ({ ...t, selected: t.tradeable ? true : false }))
    );
  }, []);

  const handleDeselectAll = useCallback(() => {
    setTokens((prev) => prev.map((t) => ({ ...t, selected: false })));
  }, []);

  const handleSweep = useCallback(async () => {
    if (!publicKey || !signAllTransactions) return;

    const selectedTokens = tokens.filter((t) => t.selected && t.tradeable);
    if (selectedTokens.length === 0) return;

    setState("building");
    setSwapResults([]);
    setSwapPhase("Building transactions...");

    try {
      await executeSwapsBatched(
        connection,
        selectedTokens,
        publicKey,
        signAllTransactions,
        (result, phase) => {
          if (phase === "building") {
            setSwapPhase(`BUILDING: ${result.mint.slice(0, 8)}...`);
          } else if (phase === "signing") {
            setState("signing");
            setSwapPhase(">>> SIGN ALL TXS IN WALLET <<<");
          } else if (phase === "sending") {
            setState("sending");
            setSwapPhase("BLASTING TRANSACTIONS...");
            setSwapResults((prev) => [...prev, result]);
          }
        }
      );

      setState("complete");
    } catch (e: any) {
      console.error("Swap failed:", e);
      setError(e.message || "Swap failed");
      setState("ready");
    }
  }, [publicKey, signAllTransactions, tokens, connection]);

  const handleForceRefresh = useCallback(() => {
    clearAllCaches();
    loadTokens();
  }, [loadTokens]);

  const selectedTokens = tokens.filter((t) => t.selected && t.tradeable);
  const totalValue = selectedTokens.reduce(
    (sum, t) => sum + t.quoteAmountOutUi,
    0
  );

  const isSwapping =
    state === "building" || state === "signing" || state === "sending";

  return (
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl animate-float">🧹</span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wider gradient-text">
                DUST SWEEPER
              </h1>
              <p className="text-[10px] text-neon-cyan font-mono tracking-widest opacity-70">
                CLEAN YOUR BAGS. GET YOUR SOL.
              </p>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero section */}
        {!connected && (
          <div className="text-center py-16 animate-fade-in-up">
            <div className="text-[120px] mb-4 animate-float">🗑️</div>
            <h2 className="font-display text-5xl font-black mb-2 tracking-wider">
              <span className="gradient-text">SWEEP THE</span>
            </h2>
            <h2 className="font-display text-6xl font-black mb-6 neon-text tracking-wider">
              DUST
            </h2>
            <p className="text-xl text-void-300 mb-8 max-w-lg mx-auto font-mono">
              Convert your worthless shitcoins into{" "}
              <span className="neon-text-cyan">SOL</span>.
              <br />
              One click.
            </p>
            <div className="flex flex-col items-center gap-6">
              <WalletButton />
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-neon-cyan">POWERED BY JUPITER</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {state === "loading" && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="inline-flex flex-col items-center gap-4 px-10 py-8 card-degen">
                <div className="w-8 h-8 border-4 border-neon-pink border-t-transparent rounded-full animate-spin" />
                <div className="font-mono">
                  <span className="text-neon-cyan block text-lg tracking-wider">
                    {loadingProgress.total === 0
                      ? ">>> SCANNING WALLET <<<"
                      : ">>> FETCHING PRICES <<<"}
                  </span>
                  {loadingProgress.total > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-void-400 mb-2 tracking-wide">
                        [{loadingProgress.current}/{loadingProgress.total}]{" "}
                        <span className="text-neon-pink">
                          ~
                          {Math.ceil(
                            (loadingProgress.total - loadingProgress.current) *
                              0.5
                          )}
                          s
                        </span>
                      </div>
                      <div className="w-72 h-3 bg-void-800 pixel-border overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan transition-all duration-300"
                          style={{
                            width: `${
                              (loadingProgress.current /
                                loadingProgress.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <TokenList
              tokens={[]}
              onToggleSelect={() => {}}
              onSelectAll={() => {}}
              onDeselectAll={() => {}}
              loading={true}
            />
          </div>
        )}

        {/* Token list */}
        {(state === "ready" || isSwapping) && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Summary card */}
            <div className="p-6 card-degen">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h3 className="text-xs text-neon-cyan font-mono tracking-widest mb-2">
                    ESTIMATED RETURN
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-5xl font-black gradient-text">
                      {formatAmount(totalValue, 6)}
                    </span>
                    <span className="text-2xl text-neon-cyan font-bold">
                      SOL
                    </span>
                  </div>
                  <p className="text-sm text-void-400 mt-2 font-mono">
                    <span className="text-neon-pink">
                      {selectedTokens.length}
                    </span>{" "}
                    tokens selected
                  </p>
                </div>
                <button
                  onClick={handleSweep}
                  disabled={selectedTokens.length === 0 || isSwapping}
                  className={`
                    px-10 py-5 font-display font-black text-xl tracking-wider
                    transition-all duration-200
                    ${
                      selectedTokens.length > 0 && !isSwapping
                        ? "btn-retro text-white hover:scale-105"
                        : "bg-void-800 text-void-500 cursor-not-allowed border-2 border-void-700"
                    }
                  `}
                >
                  {isSwapping ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {state === "building" && "BUILDING..."}
                      {state === "signing" && "SIGN NOW!"}
                      {state === "sending" && "SENDING..."}
                    </span>
                  ) : (
                    "🧹 SWEEP IT"
                  )}
                </button>
              </div>

              {isSwapping && (
                <div className="space-y-4">
                  <div className="text-sm font-mono text-center">
                    <span className="text-neon-cyan animate-pulse">
                      {swapPhase}
                    </span>
                  </div>
                  {state === "sending" && (
                    <SwapProgress
                      results={swapResults}
                      totalTokens={selectedTokens.length}
                      isComplete={false}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Token list */}
            {state === "ready" && (
              <>
                <TokenList
                  tokens={tokens}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  loading={false}
                />
                <div className="text-center">
                  <button
                    onClick={handleForceRefresh}
                    className="text-xs font-mono text-void-500 hover:text-neon-cyan transition-colors tracking-wider"
                  >
                    [🔄 FORCE REFRESH]
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Complete state */}
        {state === "complete" && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center py-8">
              <div className="text-[100px] mb-4">🎰</div>
              <h2 className="font-display text-4xl font-black mb-2 tracking-wider">
                <span className="gradient-text">SWEEP COMPLETE</span>
              </h2>
              <p className="text-neon-cyan font-mono tracking-wide">
                BAGS CLEANED. SOL ACQUIRED.
              </p>
            </div>

            <SwapProgress
              results={swapResults}
              totalTokens={swapResults.length}
              isComplete={true}
            />

            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => {
                  const swappedMints = new Set(
                    swapResults.filter((r) => r.success).map((r) => r.mint)
                  );
                  setTokens((prev) =>
                    prev.filter((t) => !swappedMints.has(t.mint.toBase58()))
                  );
                  setSwapResults([]);
                  setState("ready");
                }}
                className="px-8 py-4 btn-retro text-white font-display font-bold tracking-wider"
              >
                🧹 SWEEP MORE
              </button>
              <button
                onClick={() => {
                  setState("idle");
                  setSwapResults([]);
                  clearAllCaches();
                  loadTokens();
                }}
                className="px-8 py-4 bg-void-800 hover:bg-void-700 text-neon-cyan font-mono tracking-wider border-2 border-neon-purple transition-colors"
              >
                🔄 RESCAN
              </button>
              <a
                href={`https://solscan.io/account/${publicKey?.toBase58()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-void-950 font-mono tracking-wider transition-all"
              >
                VIEW WALLET →
              </a>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mt-8 p-4 status-error font-mono text-center tracking-wider">
            ⚠️ ERROR: {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-neon-purple/30 mt-24">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono text-neon-pink tracking-widest">
              💜 DONATIONS APPRECIATED 💜
            </span>
            <code className="text-xs font-mono text-neon-cyan bg-void-900 px-3 py-1.5 rounded border border-neon-purple/30 select-all cursor-pointer hover:border-neon-cyan transition-colors">
              {process.env.NEXT_PUBLIC_FEE_ACCOUNT || "YOUR_WALLET_HERE"}
            </code>
          </div>
          <p className="text-xs font-mono text-void-500 tracking-widest">
            POWERED BY{" "}
            <a
              href="https://jup.ag"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:text-neon-pink transition-colors"
            >
              JUPITER
            </a>{" "}
            | DEGEN APPROVED 🦍
          </p>
        </div>
      </footer>
    </main>
  );
}
