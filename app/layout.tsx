import type { Metadata, Viewport } from "next";
import { Noto_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SwRegister from "./SwRegister";
import TopBar from "./TopBar";

const headingFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jakarta",
});

const bodyFont = Noto_Sans({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "ShikshaSync",
  description: "Offline-first adaptive learning for rural multi-grade schools",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#145343",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-paper)] text-[var(--ink)]">
        <SwRegister />
        <TopBar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
