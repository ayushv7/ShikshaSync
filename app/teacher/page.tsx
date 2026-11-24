"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MasteryMap } from "@/lib/bkt";
import { students } from "@/lib/data";
import {
  clearSyncQueue,
  getAllMastery,
  getOffline,
  getRemedialPack,
  getSyncQueue,
  hydrateStorage,
  saveRemedialPack,
  setOffline,
  type RemedialItem,
  type SyncDelta,
} from "@/lib/storage";

type SyncStatus = {
  message: string;
  ok: boolean;
};

function heatCellClass(score: number): string {
  if (score >= 0.7) {
    return "border-emerald-200 bg-emerald-100 text-emerald-900";
  }
  if (score >= 0.45) {
    return "border-amber-200 bg-amber-100 text-amber-900";
  }
  return "border-rose-200 bg-rose-100 text-rose-900";
}

function initialMasteryState(): Record<string, MasteryMap> {
  const map: Record<string, MasteryMap> = {};
  for (const student of students) {
    map[student.id] = { ...student.initialMastery };
  }
  return map;
}

export default function TeacherPage() {
  const [isOffline, setIsOfflineState] = useState(false);
  const [mastery, setMastery] = useState<Record<string, MasteryMap>>(
    initialMasteryState
  );
  const [syncQueue, setSyncQueue] = useState<SyncDelta[]>([]);
  const [remedialPack, setRemedialPack] = useState<RemedialItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      setIsOfflineState(getOffline());
      setMastery(getAllMastery());
      setSyncQueue(getSyncQueue());
      setRemedialPack(getRemedialPack());
    });
    return () => {
      active = false;
    };
  }, []);

  function toggleOffline() {
    const next = !isOffline;
    setIsOfflineState(next);
    setOffline(next);
    setStatus(null);
  }

  async function handleSync() {
    if (isOffline) {
      setStatus({
        ok: false,
        message: "Offline Mode is active. Switch to Online Mode to sync.",
      });
      return;
    }

    setIsSyncing(true);
    setStatus(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltas: syncQueue, mastery }),
      });

      if (!res.ok) {
        setStatus({ ok: false, message: "Sync request failed." });
        setIsSyncing(false);
        return;
      }

      const data = (await res.json()) as {
        syncedCount: number;
        payloadBytes: number;
        source: string;
        dynamoSynced: boolean;
        remedialPack: RemedialItem[];
      };

      clearSyncQueue();
      setSyncQueue([]);
      setRemedialPack(data.remedialPack);
      saveRemedialPack(data.remedialPack);

      const kb = (data.payloadBytes / 1024).toFixed(2);
      setStatus({
        ok: true,
        message: `Synced ${data.syncedCount} deltas (${kb} KB pack via ${data.source}${data.dynamoSynced ? " + DynamoDB" : ""}).`,
      });
    } catch {
      setStatus({ ok: false, message: "Network error during sync." });
    }

    setIsSyncing(false);
  }

  const grades = [3, 4, 5];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Teacher Dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Multi-grade mastery heatmap · Pending deltas: {syncQueue.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleOffline}
            aria-pressed={isOffline}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              isOffline
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-emerald-300 bg-emerald-50 text-emerald-800"
            }`}
          >
            {isOffline ? "Offline Mode" : "Online Mode"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            status.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
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
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Grade {grade} ({group.length}{" "}
                {group.length === 1 ? "student" : "students"})
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Math.round(avg * 100)}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">
            Classroom Mastery Heatmap
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded border border-rose-200 bg-rose-100 px-2 py-0.5 text-rose-900">
              &lt;45% Needs Help
            </span>
            <span className="rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-900">
              45-69% Developing
            </span>
            <span className="rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-emerald-900">
              &gt;=70% Mastered
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Math</th>
                <th className="px-4 py-3">Reading</th>
                <th className="px-4 py-3">Overall</th>
                <th className="px-4 py-3 text-right">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((student) => {
                const m = mastery[student.id] ?? student.initialMastery;
                const overall = (m.math + m.reading) / 2;

                return (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      Grade {student.grade}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold ${heatCellClass(m.math)}`}
                      >
                        {Math.round(m.math * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold ${heatCellClass(m.reading)}`}
                      >
                        {Math.round(m.reading * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block min-w-16 rounded-md border px-2.5 py-1 text-center text-xs font-semibold ${heatCellClass(overall)}`}
                      >
                        {Math.round(overall * 100)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/learn/${student.id}`}
                        className="text-xs font-medium text-emerald-700 hover:underline"
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
      </div>

      {remedialPack.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-900">
            Latest Remedial Pack
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {remedialPack.map((item) => (
              <div
                key={`${item.studentId}-${item.subject}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>
                    {item.studentName} (Grade {item.grade})
                  </span>
                  <span className="text-xs uppercase text-slate-600">
                    {item.subject} · {Math.round(item.mastery * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{item.tip}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Drills: {item.questionIds.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
