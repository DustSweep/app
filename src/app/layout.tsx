import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dust Sweeper | Clean Your Solana Wallet",
  description:
    "Sweep worthless dust tokens from your Solana wallet and convert them to SOL",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Dust Sweeper | Clean Your Solana Wallet",
    description: "Sweep worthless dust tokens from your Solana wallet and convert them to SOL",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dust Sweeper | Clean Your Solana Wallet",
    description: "Sweep worthless dust tokens from your Solana wallet and convert them to SOL",
    creator: "@yourusername", // Update with your Twitter handle
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-pattern min-h-screen">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
