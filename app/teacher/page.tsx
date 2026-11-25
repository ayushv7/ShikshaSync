"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MasteryMap } from "@/lib/bkt";
import { students } from "@/lib/data";
import {
  clearSyncQueue,
  defaultMasteryMap,
  getAllMastery,
  getLastSync,
  getRemedialPack,
  getSyncQueue,
  hydrateStorage,
  isEffectiveOffline,
  resetDemoStorage,
  saveLastSync,
  saveRemedialPack,
  watchConnectivity,
  type LastSync,
  type RemedialItem,
  type SyncDelta,
} from "@/lib/storage";

type SyncStatus = {
  message: string;
  ok: boolean;
};

type SyncPhase = "idle" | "syncing" | "done";

function heatCellClass(score: number): string {
  if (score >= 0.7) {
    return "border-[var(--status-ok)] bg-[var(--ok-bg)] text-[var(--status-ok)]";
  }
  if (score >= 0.45) {
    return "border-[var(--status-warn)] bg-[var(--warn-bg)] text-[var(--status-warn)]";
  }
  return "border-[var(--status-err)] bg-[var(--err-bg)] text-[var(--status-err)]";
}

export default function TeacherPage() {
  const [isOffline, setIsOfflineState] = useState(false);
  const [mastery, setMastery] = useState<Record<string, MasteryMap>>(
    defaultMasteryMap
  );
  const [syncQueue, setSyncQueue] = useState<SyncDelta[]>([]);
  const [remedialPack, setRemedialPack] = useState<RemedialItem[]>([]);
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [syncedKb, setSyncedKb] = useState("0.00");
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      setIsOfflineState(isEffectiveOffline());
      setMastery(getAllMastery());
      setSyncQueue(getSyncQueue());
      setRemedialPack(getRemedialPack());
      setLastSync(getLastSync());
    });

    const unwatch = watchConnectivity((offline) => {
      if (active) setIsOfflineState(offline);
    });
    return () => {
      active = false;
      unwatch();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  function handleResetDemo() {
    resetDemoStorage();
    setMastery(defaultMasteryMap());
    setSyncQueue([]);
    setRemedialPack([]);
    setLastSync(null);
    setSyncPhase("idle");
    setStatus({ ok: true, message: "Demo state reset to initial mastery." });
  }

  async function handleSync() {
    if (syncPhase === "syncing") return;
    if (isOffline || !window.navigator.onLine) {
      setStatus({
        ok: false,
        message: "Offline mode is active. Switch to Online mode to sync.",
      });
      return;
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setSyncPhase("syncing");
    setStatus(null);

    try {
      const payload = JSON.stringify({ deltas: syncQueue, mastery });
      const upBytes = new Blob([payload]).size;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (!res.ok) {
        setStatus({ ok: false, message: "Sync request failed." });
        setSyncPhase("idle");
        return;
      }

      const data = (await res.json()) as {
        syncedCount: number;
        syncedAt: number;
        payloadBytes: number;
        source: string;
        dynamoSynced: boolean;
        remedialPack: RemedialItem[];
      };

      const totalBytes = upBytes + data.payloadBytes;
      const syncInfo: LastSync = {
        at: data.syncedAt,
        source: data.source,
        bytes: totalBytes,
      };

      clearSyncQueue();
      setSyncQueue([]);
      setRemedialPack(data.remedialPack);
      saveRemedialPack(data.remedialPack);
      setLastSync(syncInfo);
      saveLastSync(syncInfo);

      const upKb = (upBytes / 1024).toFixed(2);
      const packKb = (data.payloadBytes / 1024).toFixed(2);
      const totalKb = (totalBytes / 1024).toFixed(2);

      setSyncedKb(totalKb);
      setSyncPhase("done");
      setStatus({
        ok: true,
        message: `Synced ${data.syncedCount} deltas (${totalKb} KB total: ${upKb} KB up, ${packKb} KB pack via ${data.source}${data.dynamoSynced ? " + DynamoDB" : ""}).`,
      });

      resetTimerRef.current = setTimeout(() => {
        setSyncPhase("idle");
      }, 2500);
    } catch {
      setStatus({ ok: false, message: "Network error during sync." });
      setSyncPhase("idle");
    }
  }

  const grades = [3, 4, 5];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Teacher overview
          </h1>
          <p className="text-sm text-[var(--ink-muted)] tabular-nums">
            Multi-grade mastery matrix · Pending updates: {syncQueue.length}
            {lastSync &&
              ` · Last sync: ${(lastSync.bytes / 1024).toFixed(2)} KB (${lastSync.source})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncPhase === "syncing"}
            className={`inline-flex min-h-[44px] min-w-[136px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-80 disabled:active:scale-100 ${
              syncPhase === "done"
                ? "bg-[var(--status-ok)] text-[var(--surface)]"
                : "bg-[var(--brand)] text-[var(--surface)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-hover)]"
            }`}
          >
            {syncPhase === "syncing" && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {syncPhase === "done" && (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="tabular-nums">
              {syncPhase === "syncing"
                ? "Syncing..."
                : syncPhase === "done"
                  ? `Synced ${syncedKb} KB`
                  : "Sync now"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="inline-flex min-h-[44px] items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-medium text-[var(--ink)] transition-all duration-150 ease-out hover:border-[var(--brand)] hover:bg-[var(--brand-bg)] active:scale-[0.98] active:bg-[var(--brand-bg-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
          >
            Reset demo
          </button>
        </div>
      </section>

      {status && (
        <div
          role="status"
          className={`animate-fade-in rounded-lg border px-4 py-3 text-sm font-medium tabular-nums ${
            status.ok
              ? "border-[var(--status-ok)] bg-[var(--ok-bg)] text-[var(--status-ok)]"
              : "border-[var(--status-warn)] bg-[var(--warn-bg)] text-[var(--status-warn)]"
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {grades.map((grade) => {
          const group = students.filter((s) => s.grade === grade);
          const avg =
            group.reduce((sum, s) => {
              const m = mastery[s.id] ?? s.initialMastery;
              return sum + (m.math + m.reading) / 2;
            }, 0) / group.length;

          return (
            <div
              key={grade}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs font-medium text-[var(--ink-muted)] tabular-nums">
                Grade {grade} · {group.length}{" "}
                {group.length === 1 ? "student" : "students"}
              </p>
              <p className="font-heading mt-1 text-2xl font-semibold text-[var(--ink)] tabular-nums">
                {Math.round(avg * 100)}%
              </p>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="font-heading text-base font-semibold text-[var(--ink)]">
            Classroom mastery heatmap
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium tabular-nums">
            <span className="rounded-md border border-[var(--status-err)] bg-[var(--err-bg)] px-2 py-0.5 text-[var(--status-err)]">
              &lt;45% needs help
            </span>
            <span className="rounded-md border border-[var(--status-warn)] bg-[var(--warn-bg)] px-2 py-0.5 text-[var(--status-warn)]">
              45–69% practicing
            </span>
            <span className="rounded-md border border-[var(--status-ok)] bg-[var(--ok-bg)] px-2 py-0.5 text-[var(--status-ok)]">
              &gt;=70% mastered
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-paper)] text-xs font-medium text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Math</th>
                <th className="px-4 py-3">Reading</th>
                <th className="px-4 py-3">Overall</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {students.map((student) => {
                const m = mastery[student.id] ?? student.initialMastery;
                const overall = (m.math + m.reading) / 2;

                return (
                  <tr
                    key={student.id}
                    className="transition-colors duration-150 hover:bg-[var(--bg-paper)]"
                  >
                    <td className="font-heading px-4 py-3 font-medium text-[var(--ink)]">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-muted)] tabular-nums">
                      Grade {student.grade}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold tabular-nums ${heatCellClass(m.math)}`}
                      >
                        {Math.round(m.math * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold tabular-nums ${heatCellClass(m.reading)}`}
                      >
                        {Math.round(m.reading * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold tabular-nums ${heatCellClass(overall)}`}
                      >
                        {Math.round(overall * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/learn/${student.id}`}
                        className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--brand)] px-3 text-sm font-medium text-[var(--surface)] transition-all duration-150 ease-out hover:bg-[var(--brand-hover)] active:scale-[0.98] active:bg-[var(--brand-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                      >
                        Practice
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {syncQueue.length > 0 && (
        <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-heading text-base font-semibold text-[var(--ink)] tabular-nums">
            Pending sync queue ({syncQueue.length})
          </h2>
          <div className="divide-y divide-[var(--border)] text-sm">
            {syncQueue.slice(-6).map((delta) => (
              <div
                key={delta.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span className="font-medium text-[var(--ink)]">
                  {delta.studentId} · {delta.subject} ({delta.questionId})
                </span>
                <span className="text-xs text-[var(--ink-muted)] tabular-nums">
                  {delta.correct ? "Correct" : "Wrong"} · Mastery{" "}
                  {Math.round(delta.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {remedialPack.length > 0 && (
        <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-heading text-base font-semibold text-[var(--ink)]">
            Latest remedial pack
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {remedialPack.map((item) => (
              <div
                key={`${item.studentId}-${item.subject}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-3.5"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-[var(--ink)]">
                  <span className="font-heading">
                    {item.studentName} · Grade {item.grade}
                  </span>
                  <span className="text-xs font-medium text-[var(--ink-muted)] tabular-nums">
                    {item.subject === "math" ? "Math" : "Reading"} ·{" "}
                    {Math.round(item.mastery * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--ink)]">{item.tip}</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)] tabular-nums">
                  Drills: {item.questionIds.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
