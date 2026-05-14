import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

const notoSansGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  variable: "--font-gurmukhi",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Gurbani Voice Searcher | ਗੁਰਬਾਣੀ ਖੋਜ",
  description:
    "A measured voice-search aid for Gurudwaras: Gurbani with Gurmukhi, transliteration, and meaning—in humble support of sangat and seva."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={notoSansGurmukhi.variable}>
      <body>{children}</body>
    </html>
  );
}
