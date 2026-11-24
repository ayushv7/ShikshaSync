"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_MASTERY,
  pickQuestion,
  updateBkt,
  type MasteryMap,
} from "@/lib/bkt";
import {
  langs,
  questions,
  students,
  type Lang,
  type Question,
  type Subject,
} from "@/lib/data";
import {
  enqueueDelta,
  getLang,
  getRemedialPack,
  getStudentMastery,
  getSyncQueue,
  hydrateStorage,
  isEffectiveOffline,
  saveStudentMastery,
  setLang,
  setOffline,
  watchConnectivity,
  type RemedialItem,
  type SyncDelta,
} from "@/lib/storage";

const SPEECH_LOCALE: Record<Lang, string> = {
  en: "en-IN",
  kn: "kn-IN",
  hi: "hi-IN",
};

function speakLocal(text: string, lang: Lang): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALE[lang];
    const match = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith(lang));
    if (match) {
      utterance.voice = match;
    }
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export default function QuizClient({ studentId }: { studentId: string }) {
  const searchParams = useSearchParams();
  const student = students.find((s) => s.id === studentId);

  const [isOffline, setIsOfflineState] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");
  const [mastery, setMastery] = useState<MasteryMap>(
    student ? { ...student.initialMastery } : { ...DEFAULT_MASTERY }
  );
  const [syncQueue, setSyncQueue] = useState<SyncDelta[]>([]);
  const [remedial, setRemedial] = useState<RemedialItem | null>(null);
  const [subject, setSubject] = useState<Subject | undefined>(undefined);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(() =>
    student ? pickQuestion(questions, student.initialMastery, []) : null
  );
  const [qIdx, setQIdx] = useState(0);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [isListening, setIsListening] = useState(false);

  const queryLang = searchParams.get("lang");

  useEffect(() => {
    let active = true;
    void hydrateStorage().then(() => {
      if (!active) return;
      setIsOfflineState(isEffectiveOffline());
      const resolvedLang: Lang =
        queryLang === "kn" || queryLang === "hi" || queryLang === "en"
          ? queryLang
          : getLang();
      setLangState(resolvedLang);
      if (queryLang === "kn" || queryLang === "hi" || queryLang === "en") {
        setLang(resolvedLang);
      }
      if (student) {
        const savedMastery = getStudentMastery(student.id);
        const packItem =
          getRemedialPack().find((item) => item.studentId === student.id) ??
          null;
        setMastery(savedMastery);
        setRemedial(packItem);
        setQuestion(
          pickQuestion(
            questions,
            savedMastery,
            [],
            undefined,
            packItem?.questionIds ?? []
          )
        );
      }
      setSyncQueue(getSyncQueue());
    });

    const unwatch = watchConnectivity((offline) => {
      if (active) setIsOfflineState(offline);
    });
    return () => {
      active = false;
      unwatch();
    };
  }, [queryLang, student]);

  if (!student) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Student not found
        </h1>
        <Link
          href="/"
          className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Students
        </Link>
      </div>
    );
  }

  function toggleOffline() {
    const next = !isOffline;
    setIsOfflineState(next);
    setOffline(next);
  }

  function changeLang(nextLang: Lang) {
    setLangState(nextLang);
    setLang(nextLang);
    setVoiceNote("");
  }

  function changeSubject(nextSubject: Subject | undefined) {
    setSubject(nextSubject);
    setChosenIdx(null);
    setShowHint(false);
    setVoiceNote("");
    setQuestion(
      pickQuestion(
        questions,
        mastery,
        seenIds,
        nextSubject,
        remedial?.questionIds ?? []
      )
    );
  }

  function handleAnswer(idx: number) {
    if (!student || !question || chosenIdx !== null) return;
    setChosenIdx(idx);
    const correct = idx === question.answerIdx;
    const nextScore = updateBkt(mastery[question.subject], correct);
    const nextMastery: MasteryMap = {
      ...mastery,
      [question.subject]: nextScore,
    };
    setMastery(nextMastery);
    saveStudentMastery(student.id, nextMastery);
    const nextQueue = enqueueDelta({
      studentId: student.id,
      subject: question.subject,
      questionId: question.id,
      correct,
      mastery: nextScore,
    });
    setSyncQueue(nextQueue);
  }

  function handleNext() {
    if (!question) return;
    const updatedSeen = seenIds.includes(question.id)
      ? seenIds
      : [...seenIds, question.id];
    const nextSeen =
      updatedSeen.length >= questions.length ? [question.id] : updatedSeen;
    setSeenIds(nextSeen);
    setChosenIdx(null);
    setShowHint(false);
    setVoiceNote("");
    setQIdx((prev) => prev + 1);
    setQuestion(
      pickQuestion(
        questions,
        mastery,
        nextSeen,
        subject,
        remedial?.questionIds ?? []
      )
    );
  }

  async function playAudioBlob(blob: Blob): Promise<boolean> {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  async function handleListen() {
    if (!question || isListening) return;
    const text = question.hint[lang];
    setShowHint(true);
    setIsListening(true);
    setVoiceNote("");

    const cacheKey = `/api/tts?id=${encodeURIComponent(question.id)}&lang=${lang}`;
    try {
      if ("caches" in window) {
        const cache = await window.caches.open("shiksha-tts");
        const cached = await cache.match(cacheKey);
        if (cached) {
          const played = await playAudioBlob(await cached.blob());
          if (played) {
            setVoiceNote("Played cached audio hint");
            setIsListening(false);
            return;
          }
        }
      }

      if (!isOffline && window.navigator.onLine) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang }),
        });

        const contentType = res.headers.get("Content-Type") || "";
        if (res.ok && contentType.includes("audio/")) {
          if ("caches" in window) {
            const cache = await window.caches.open("shiksha-tts");
            await cache.put(cacheKey, res.clone());
          }
          const played = await playAudioBlob(await res.blob());
          if (played) {
            setVoiceNote("Played ElevenLabs voice hint");
            setIsListening(false);
            return;
          }
        }
      }
    } catch {
      setVoiceNote("");
    }

    const spoke = speakLocal(text, lang);
    setVoiceNote(
      spoke
        ? isOffline
          ? "Playing offline browser voice hint"
          : "Playing browser voice fallback"
        : "Voice playback unavailable on this device"
    );
    setIsListening(false);
  }

  const mathPct = Math.round(mastery.math * 100);
  const readingPct = Math.round(mastery.reading * 100);
  const isRemedialQ = Boolean(
    question && remedial?.questionIds.includes(question.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Students
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-xl font-semibold text-slate-900">
              {student.name} (Grade {student.grade})
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Pending sync: {syncQueue.length}
            {syncQueue.length > 0 && (
              <>
                {" · "}
                <Link
                  href="/teacher"
                  className="font-medium text-emerald-700 hover:underline"
                >
                  Sync on Teacher view
                </Link>
              </>
            )}
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

      {remedial && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">
            Synced Remedial Focus ({remedial.subject})
          </div>
          <p className="mt-1">{remedial.tip}</p>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-sm font-medium text-slate-700">
            <span>Math Mastery</span>
            <span>{mathPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${mathPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm font-medium text-slate-700">
            <span>Reading Mastery</span>
            <span>{readingPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-sky-600 transition-all duration-300"
              style={{ width: `${readingPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeSubject(undefined)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              subject === undefined
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Adaptive
          </button>
          <button
            type="button"
            onClick={() => changeSubject("math")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              subject === "math"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Math
          </button>
          <button
            type="button"
            onClick={() => changeSubject("reading")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              subject === "reading"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Reading
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {langs.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => changeLang(item.code)}
              aria-pressed={lang === item.code}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                lang === item.code
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {question && (
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Question {qIdx + 1} · {question.subject} · Level{" "}
                {question.level}
              </span>
              {isRemedialQ && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-amber-900">
                  Remedial drill
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleListen}
              disabled={isListening}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold normal-case tracking-normal text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              {isListening ? "Loading..." : "Listen"}
            </button>
          </div>

          <h2 className="text-lg font-semibold text-slate-900">
            {question.prompt[lang]}
          </h2>

          {showHint && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{question.hint[lang]}</p>
              {voiceNote && (
                <p className="mt-1 text-xs text-amber-700">{voiceNote}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {question.options[lang].map((option, idx) => {
              const isSelected = chosenIdx === idx;
              const isRight = idx === question.answerIdx;
              let btnStyle =
                "border-slate-200 bg-white text-slate-800 hover:border-emerald-500";
              if (chosenIdx !== null) {
                if (isRight) {
                  btnStyle =
                    "border-emerald-600 bg-emerald-50 text-emerald-900";
                } else if (isSelected) {
                  btnStyle = "border-rose-500 bg-rose-50 text-rose-900";
                } else {
                  btnStyle = "border-slate-200 bg-slate-50 text-slate-500";
                }
              }

              return (
                <button
                  key={`${question.id}-${idx}`}
                  type="button"
                  disabled={chosenIdx !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`rounded-lg border p-4 text-left text-sm font-medium transition ${btnStyle}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {chosenIdx !== null && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <p
                className={`text-sm font-medium ${
                  chosenIdx === question.answerIdx
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {chosenIdx === question.answerIdx
                  ? "Correct. Mastery updated locally."
                  : "Keep practicing. Mastery updated locally."}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
