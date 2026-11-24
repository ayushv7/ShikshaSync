import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShikshaSync",
  description: "Offline-first adaptive learning for rural multi-grade schools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-emerald-700"
            >
              ShikshaSync
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="text-slate-700 hover:text-emerald-700">
                Students
              </Link>
              <Link
                href="/teacher"
                className="text-slate-700 hover:text-emerald-700"
              >
                Teacher
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
