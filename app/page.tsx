"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { masteryTone, type MasteryMap } from "@/lib/bkt";
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

const TONE_BADGE = {
  ok: "border-[var(--status-ok)] bg-[var(--ok-bg)] text-[var(--status-ok)]",
  warn: "border-[var(--status-warn)] bg-[var(--warn-bg)] text-[var(--status-warn)]",
  err: "border-[var(--status-err)] bg-[var(--err-bg)] text-[var(--status-err)]",
} as const;

const TONE_FILL = {
  ok: "var(--status-ok)",
  warn: "var(--status-warn)",
  err: "var(--status-err)",
} as const;

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

  const classAvg =
    students.reduce((sum, s) => {
      const m = mastery[s.id] ?? s.initialMastery;
      return sum + (m.math + m.reading) / 2;
    }, 0) / students.length;
  const classAvgPct = Math.round(classAvg * 100);
  const classAvgTone = masteryTone(classAvg);

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
                  className={`min-h-[44px] rounded-md px-3 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                    active
                      ? "bg-[var(--brand)] text-[var(--surface)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-hover)]"
                      : "text-[var(--ink)] hover:bg-[var(--brand-bg)] active:bg-[var(--brand-bg-active)] active:text-[var(--brand)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            Classroom roster
          </p>
          <p className="font-heading mt-1 text-2xl font-semibold text-[var(--ink)] tabular-nums">
            {students.length} students
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            Class average
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="font-heading text-2xl font-semibold text-[var(--ink)] tabular-nums">
              {classAvgPct}%
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-medium ${TONE_BADGE[classAvgTone]}`}
            >
              {classAvgTone === "ok"
                ? "On track"
                : classAvgTone === "warn"
                  ? "Practicing"
                  : "Needs help"}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs font-medium text-[var(--ink-muted)]">
            Sync queue
          </p>
          <p className="font-heading mt-1 text-2xl font-semibold text-[var(--ink)] tabular-nums">
            {pendingCount} {pendingCount === 1 ? "update" : "updates"}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
        {students.map((student) => {
          const m = mastery[student.id] ?? student.initialMastery;
          const overall = (m.math + m.reading) / 2;
          const overallPct = Math.round(overall * 100);
          const mathPct = Math.round(m.math * 100);
          const readingPct = Math.round(m.reading * 100);
          const overallTone = masteryTone(overall);
          const mathTone = masteryTone(m.math);
          const readingTone = masteryTone(m.reading);
          const remedial = remedialPack.find((r) => r.studentId === student.id);

          return (
            <Link
              key={student.id}
              href={`/learn/${student.id}?lang=${lang}`}
              className="group flex min-h-[76px] flex-col justify-between gap-3 px-4 py-3.5 transition-all duration-150 ease-out hover:bg-[var(--brand-bg)] active:scale-[0.99] active:bg-[var(--brand-bg-active)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)] sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex items-center gap-3.5">
                <div className="font-heading flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--brand)] bg-[var(--brand-bg)] text-sm font-semibold text-[var(--brand)] transition-colors duration-150 group-hover:bg-[var(--brand)] group-hover:text-[var(--surface)] group-active:bg-[var(--brand-hover)] group-active:text-[var(--surface)]">
                  {getInitials(student.name)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-base font-semibold text-[var(--ink)]">
                      {student.name}
                    </span>
                    <span className="text-xs font-medium text-[var(--ink-muted)] tabular-nums">
                      Grade {student.grade}
                    </span>
                    {remedial && (
                      <span className="rounded-md border border-[var(--status-warn)] bg-[var(--warn-bg)] px-1.5 py-0.5 text-xs font-medium text-[var(--status-warn)]">
                        Remedial focus
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium tabular-nums">
                    <span
                      className={`rounded-md border px-2 py-0.5 ${TONE_BADGE[mathTone]}`}
                    >
                      Math {mathPct}%
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 ${TONE_BADGE[readingTone]}`}
                    >
                      Reading {readingPct}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:min-w-[260px] sm:justify-end">
                <div className="flex-1 space-y-1 sm:max-w-[140px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--ink-muted)]">Overall</span>
                    <span className="font-semibold text-[var(--ink)] tabular-nums">
                      {overallPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-paper)]">
                    <div
                      className="h-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${overallPct}%`,
                        backgroundColor: TONE_FILL[overallTone],
                      }}
                    />
                  </div>
                </div>

                <span className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--brand)] px-3.5 text-sm font-medium text-[var(--surface)] transition-all duration-150 ease-out group-hover:bg-[var(--brand-hover)] group-active:bg-[var(--brand-hover)]">
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
            className="h-2 w-2 shrink-0 rounded-sm transition-colors duration-150"
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
          className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--brand)] transition-all duration-150 ease-out hover:border-[var(--brand)] hover:bg-[var(--brand-bg)] active:scale-[0.98] active:bg-[var(--brand-bg-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          Open teacher sync
        </Link>
      </div>
    </div>
  );
}
