"use client";

import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Wrapper to prevent hydration mismatch
export const WalletButton = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <button
        className="wallet-adapter-button"
        style={{
          height: "48px",
          minWidth: "165px",
          opacity: 0.5,
          cursor: "wait",
        }}
        disabled
      >
        Loading...
      </button>
    );
  }

  return <WalletMultiButton />;
};
