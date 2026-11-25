"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  hydrateStorage,
  isEffectiveOffline,
  setOffline,
  watchConnectivity,
} from "@/lib/storage";

export default function TopBar() {
  const pathname = usePathname();
  const [isOffline, setIsOfflineState] = useState(false);
  const [bannerText, setBannerText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function toggleOffline() {
    const next = !isOffline;
    setIsOfflineState(next);
    setOffline(next);
    setBannerText(
      next
        ? "Offline mode on — progress saved locally"
        : "Back online — ready to sync"
    );
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBannerText(""), 3000);
  }

  const isStudents = pathname === "/" || pathname.startsWith("/learn");
  const isTeacher = pathname === "/teacher";

  return (
    <div className="bg-[var(--surface)]">
      <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)]">
        <nav className="mx-auto flex h-full max-w-4xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              href="/"
              className="font-heading inline-flex min-h-[44px] items-center whitespace-nowrap text-sm font-bold tracking-tight text-[var(--brand)] transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:text-base"
            >
              ShikshaSync
            </Link>
            <div className="flex items-center gap-1 text-xs font-medium sm:gap-4 sm:text-sm">
              <Link
                href="/"
                className={`inline-flex min-h-[44px] items-center rounded-md px-1.5 transition-all duration-150 ease-out active:scale-[0.98] active:bg-[var(--brand-bg-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-2 ${
                  isStudents
                    ? "text-[var(--brand)] underline decoration-2 underline-offset-8"
                    : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink)]"
                }`}
              >
                Students
              </Link>
              <Link
                href="/teacher"
                className={`inline-flex min-h-[44px] items-center rounded-md px-1.5 transition-all duration-150 ease-out active:scale-[0.98] active:bg-[var(--brand-bg-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-2 ${
                  isTeacher
                    ? "text-[var(--brand)] underline decoration-2 underline-offset-8"
                    : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink)]"
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
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-xs font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:gap-2 sm:px-3 sm:text-sm ${
              isOffline
                ? "border-[var(--status-warn)] bg-[var(--warn-bg)] text-[var(--status-warn)] hover:bg-[var(--surface)] active:bg-[var(--status-warn)] active:text-[var(--surface)]"
                : "border-[var(--status-ok)] bg-[var(--ok-bg)] text-[var(--status-ok)] hover:bg-[var(--surface)] active:bg-[var(--status-ok)] active:text-[var(--surface)]"
            }`}
          >
            <span
              className={`inline-flex h-3.5 w-6 items-center rounded-md border border-[var(--border)] p-0.5 transition-colors duration-150 ease-out sm:h-4 sm:w-7 ${
                isOffline ? "bg-[var(--warn-bg)]" : "bg-[var(--ok-bg)]"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-sm transition-transform duration-150 ease-out sm:h-2.5 sm:w-2.5 ${
                  isOffline
                    ? "translate-x-0 bg-[var(--status-warn)]"
                    : "translate-x-2.5 bg-[var(--status-ok)] sm:translate-x-3"
                }`}
              />
            </span>
            <span>{isOffline ? "Offline mode" : "Online mode"}</span>
          </button>
        </nav>
      </header>

      {bannerText && (
        <div
          role="status"
          className={`animate-fade-in border-b border-[var(--border)] px-4 py-2 text-xs font-medium sm:px-6 ${
            isOffline
              ? "bg-[var(--warn-bg)] text-[var(--status-warn)]"
              : "bg-[var(--ok-bg)] text-[var(--status-ok)]"
          }`}
        >
          <div className="mx-auto max-w-4xl">{bannerText}</div>
        </div>
      )}
    </div>
  );
}
