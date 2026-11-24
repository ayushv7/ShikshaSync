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
  setOffline,
  watchConnectivity,
  type RemedialItem,
} from "@/lib/storage";

export default function HomePage() {
  const [isOffline, setIsOfflineState] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");
  const [mastery, setMastery] = useState<Record<string, MasteryMap>>(
    defaultMasteryMap
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [remedialPack, setRemedialPack] = useState<RemedialItem[]>([]);

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      setIsOfflineState(isEffectiveOffline());
      setLangState(getLang());
      setMastery(getAllMastery());
      setPendingCount(getSyncQueue().length);
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

  function toggleOffline() {
    const next = !isOffline;
    setIsOfflineState(next);
    setOffline(next);
  }

  function selectLang(nextLang: Lang) {
    setLangState(nextLang);
    setLang(nextLang);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Select a Student
          </h1>
          <p className="text-sm text-slate-600">
            Multi-grade classroom drills for Grades 3 to 5 · Pending sync:{" "}
            {pendingCount}
          </p>
        </div>

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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Language:</span>
        {langs.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => selectLang(item.code)}
            aria-pressed={lang === item.code}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              lang === item.code
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {students.map((student) => {
          const m = mastery[student.id] ?? student.initialMastery;
          const remedial = remedialPack.find((r) => r.studentId === student.id);

          return (
            <Link
              key={student.id}
              href={`/learn/${student.id}?lang=${lang}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {student.name}
                  </h2>
                  {remedial && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      Remedial ready
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">Grade {student.grade}</p>
                <p className="text-xs text-slate-500">
                  Math {Math.round(m.math * 100)}% · Reading{" "}
                  {Math.round(m.reading * 100)}%
                </p>
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Start
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
