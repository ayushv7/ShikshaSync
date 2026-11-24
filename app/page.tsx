"use client";

import Link from "next/link";
import { useState } from "react";

const students = [
  { id: "aarav", name: "Aarav", grade: 3 },
  { id: "kavya", name: "Kavya", grade: 4 },
  { id: "rohan", name: "Rohan", grade: 5 },
  { id: "meera", name: "Meera", grade: 3 },
];

const langs = [
  { code: "en", label: "English" },
  { code: "kn", label: "Kannada" },
  { code: "hi", label: "Hindi" },
];

export default function HomePage() {
  const [isOffline, setIsOffline] = useState(false);
  const [lang, setLang] = useState("en");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Select a Student
          </h1>
          <p className="text-sm text-slate-600">
            Multi-grade classroom drills for Grades 3 to 5
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOffline((prev) => !prev)}
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
            onClick={() => setLang(item.code)}
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
        {students.map((student) => (
          <Link
            key={student.id}
            href={`/learn/${student.id}?lang=${lang}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {student.name}
              </h2>
              <p className="text-sm text-slate-600">Grade {student.grade}</p>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Start
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
