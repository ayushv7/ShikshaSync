"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MasteryMap } from "@/lib/bkt";
import { langs, students, type Lang } from "@/lib/data";
import {
  defaultMasteryMap,
  getAllMastery,
  getLang,
  getRemedialPack,
  getSyncQueue,
  hydrateStorage,
  isEffectiveOffline,
  setLang,
  watchConnectivity,
  type RemedialItem,
} from "@/lib/storage";

function masteryColor(score: number): string {
  if (score >= 0.7) return "var(--status-ok)";
  if (score >= 0.45) return "var(--status-warn)";
  return "var(--status-err)";
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function HomePage() {
  const [isOffline, setIsOfflineState] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");
  const [mastery, setMastery] = useState<Record<string, MasteryMap>>(
    defaultMasteryMap
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingKb, setPendingKb] = useState("0.00");
  const [remedialPack, setRemedialPack] = useState<RemedialItem[]>([]);

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      const queue = getSyncQueue();
      const bytes =
        queue.length > 0 ? new Blob([JSON.stringify(queue)]).size : 0;
      setIsOfflineState(isEffectiveOffline());
      setLangState(getLang());
      setMastery(getAllMastery());
      setPendingCount(queue.length);
      setPendingKb((bytes / 1024).toFixed(2));
      setRemedialPack(getRemedialPack());
    });

    const unwatch = watchConnectivity((offline) => {
      if (active) setIsOfflineState(offline);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, []);

  function selectLang(nextLang: Lang) {
    setLangState(nextLang);
    setLang(nextLang);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Classroom practice
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Select a student in Grades 3 to 5 to start adaptive math and reading drills.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:items-end">
          <span className="text-xs font-medium text-[var(--ink-muted)]">
            Language
          </span>
          <div
            role="group"
            aria-label="Language"
            className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
          >
            {langs.map((item) => {
              const active = lang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => selectLang(item.code)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                    active
                      ? "bg-[var(--brand)] text-[var(--surface)] hover:bg-[var(--brand-hover)]"
                      : "text-[var(--ink)] hover:bg-[var(--bg-paper)] active:bg-[var(--bg-paper)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {students.map((student) => {
          const m = mastery[student.id] ?? student.initialMastery;
          const overall = (m.math + m.reading) / 2;
          const overallPct = Math.round(overall * 100);
          const mathPct = Math.round(m.math * 100);
          const readingPct = Math.round(m.reading * 100);
          const remedial = remedialPack.find((r) => r.studentId === student.id);

          return (
            <Link
              key={student.id}
              href={`/learn/${student.id}?lang=${lang}`}
              className="group flex min-h-[72px] flex-col justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-paper)] active:bg-[var(--bg-paper)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)] sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex items-center gap-3.5">
                <div className="font-heading flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-paper)] text-sm font-semibold text-[var(--brand)]">
                  {getInitials(student.name)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold text-[var(--ink)]">
                      {student.name}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink-muted)] tabular-nums">
                      Grade {student.grade}
                    </span>
                    {remedial && (
                      <span className="rounded-md border border-[var(--status-warn)] px-1.5 py-0.5 text-xs font-medium text-[var(--status-warn)]">
                        Remedial focus
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                    Math {mathPct}% · Reading {readingPct}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:min-w-[240px] sm:justify-end">
                <div className="flex-1 space-y-1 sm:max-w-[140px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink-muted)]">Mastery</span>
                    <span className="font-medium text-[var(--ink)] tabular-nums">
                      {overallPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-md bg-[var(--bg-paper)] border border-[var(--border)]">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${overallPct}%`,
                        backgroundColor: masteryColor(overall),
                      }}
                    />
                  </div>
                </div>

                <span className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--brand)] transition-colors group-hover:border-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-[var(--surface)]">
                  Practice
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2.5 text-[var(--ink-muted)]">
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{
              backgroundColor:
                isOffline || pendingCount > 0
                  ? "var(--status-warn)"
                  : "var(--status-ok)",
            }}
          />
          <span className="tabular-nums">
            {isOffline ? "Working offline" : "Connected"} · {pendingCount}{" "}
            {pendingCount === 1 ? "update" : "updates"} pending ({pendingKb} KB)
          </span>
        </div>

        <Link
          href="/teacher"
          className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--brand)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          Open teacher sync
        </Link>
      </div>
    </div>
  );
}
