"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  hydrateStorage,
  isEffectiveOffline,
  setOffline,
  watchConnectivity,
} from "@/lib/storage";

export default function TopBar() {
  const pathname = usePathname();
  const [isOffline, setIsOfflineState] = useState(false);

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      setIsOfflineState(isEffectiveOffline());
    });
    const unwatch = watchConnectivity((offline) => {
      if (active) setIsOfflineState(offline);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  function toggleOffline() {
    const next = !isOffline;
    setIsOfflineState(next);
    setOffline(next);
  }

  const isStudents = pathname === "/" || pathname.startsWith("/learn");
  const isTeacher = pathname === "/teacher";

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)]">
      <nav className="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/"
            className="font-heading inline-flex min-h-[44px] items-center whitespace-nowrap text-base font-bold tracking-tight text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            ShikshaSync
          </Link>
          <div className="flex items-center gap-1.5 text-sm font-medium sm:gap-4">
            <Link
              href="/"
              className={`inline-flex min-h-[44px] items-center px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-1.5 ${
                isStudents
                  ? "text-[var(--brand)] underline decoration-2 underline-offset-8"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Students
            </Link>
            <Link
              href="/teacher"
              className={`inline-flex min-h-[44px] items-center px-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-1.5 ${
                isTeacher
                  ? "text-[var(--brand)] underline decoration-2 underline-offset-8"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Teacher
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleOffline}
          aria-pressed={isOffline}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--ink)] transition-colors hover:bg-[var(--bg-paper)] active:bg-[var(--bg-paper)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span
            className={`h-2 w-2 rounded-sm ${
              isOffline ? "bg-[var(--status-warn)]" : "bg-[var(--status-ok)]"
            }`}
          />
          <span>{isOffline ? "Offline mode" : "Online mode"}</span>
        </button>
      </nav>
    </header>
  );
}
