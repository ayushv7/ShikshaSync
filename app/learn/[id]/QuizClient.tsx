"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  watchConnectivity,
  type RemedialItem,
  type SyncDelta,
} from "@/lib/storage";

const SPEECH_LOCALE: Record<Lang, string> = {
  en: "en-IN",
  kn: "kn-IN",
  hi: "hi-IN",
};

const OPTION_KEYS = ["A", "B", "C", "D"];

function masteryColor(score: number): string {
  if (score >= 0.7) return "var(--status-ok)";
  if (score >= 0.45) return "var(--status-warn)";
  return "var(--status-err)";
}

function subjectLabel(subject: Subject): string {
  return subject === "math" ? "Math" : "Reading";
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
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryLang = searchParams.get("lang");

  function stopVoice() {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        setIsPlaying(false);
      }
    }
    setIsPlaying(false);
  }

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
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          return;
        }
      }
    };
  }, [queryLang, student]);

  if (!student) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="font-heading text-lg font-semibold text-[var(--ink)]">
          Student not found
        </h1>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--surface)] transition-all duration-150 ease-out hover:bg-[var(--brand-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          Back to students
        </Link>
      </div>
    );
  }

  function changeLang(nextLang: Lang) {
    stopVoice();
    setLangState(nextLang);
    setLang(nextLang);
    setVoiceNote("");
  }

  function changeSubject(nextSubject: Subject | undefined) {
    stopVoice();
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
    stopVoice();
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
      audioRef.current = audio;
      const finish = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setIsPlaying(false);
      };
      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }

  function speakLocal(text: string, activeLang: Lang): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LOCALE[activeLang];
      const match = synth
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith(activeLang));
      if (match) {
        utterance.voice = match;
      }
      const startedAt = Date.now();
      const done = () => {
        const delay = Math.max(0, 900 - (Date.now() - startedAt));
        if (playTimerRef.current) {
          clearTimeout(playTimerRef.current);
          playTimerRef.current = null;
        }
        playTimerRef.current = setTimeout(() => {
          playTimerRef.current = null;
          setIsPlaying(false);
        }, delay);
      };
      utterance.onend = done;
      utterance.onerror = done;
      synth.speak(utterance);
      const fallbackMs = Math.min(4500, Math.max(1600, text.length * 55));
      playTimerRef.current = setTimeout(() => {
        playTimerRef.current = null;
        setIsPlaying(false);
      }, fallbackMs);
      return true;
    } catch {
      return false;
    }
  }

  async function handleListen() {
    if (!question || isPlaying) return;
    const text = question.hint[lang];
    setShowHint(true);
    setIsPlaying(true);
    setVoiceNote("");

    const cacheKey = `/api/tts?id=${encodeURIComponent(question.id)}&lang=${lang}`;
    try {
      if ("caches" in window) {
        const cache = await window.caches.open("shiksha-tts");
        const cached = await cache.match(cacheKey);
        if (cached) {
          const played = await playAudioBlob(await cached.blob());
          if (played) {
            setVoiceNote("Playing cached audio hint");
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
            setVoiceNote("Playing ElevenLabs voice hint");
            return;
          }
        }
      }
    } catch {
      setVoiceNote("");
    }

    const spoke = speakLocal(text, lang);
    if (spoke) {
      setVoiceNote(
        isOffline
          ? "Playing offline browser voice hint"
          : "Playing browser voice fallback"
      );
    } else {
      setVoiceNote("Voice playback unavailable on this device");
      setIsPlaying(false);
    }
  }

  const mathPct = Math.round(mastery.math * 100);
  const readingPct = Math.round(mastery.reading * 100);
  const isRemedialQ = Boolean(
    question && remedial?.questionIds.includes(question.id)
  );
  const sessionDone =
    seenIds.length +
    (chosenIdx !== null && question && !seenIds.includes(question.id) ? 1 : 0);
  const sessionPct = Math.min(
    100,
    Math.round((sessionDone / questions.length) * 100)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-md px-1.5 text-sm font-medium text-[var(--brand)] transition-all duration-150 ease-out hover:bg-[var(--bg-paper)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              Students
            </Link>
            <span className="text-sm text-[var(--ink-muted)]">/</span>
            <h1 className="font-heading text-lg font-semibold text-[var(--ink)]">
              {student.name}
            </h1>
            <span className="text-xs font-medium text-[var(--ink-muted)] tabular-nums">
              Grade {student.grade}
            </span>
          </div>

          <div className="text-xs text-[var(--ink-muted)] tabular-nums">
            Pending sync: {syncQueue.length}
            {syncQueue.length > 0 && (
              <>
                {" · "}
                <Link
                  href="/teacher"
                  className="font-medium text-[var(--brand)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  Sync in teacher
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>Session progress</span>
            <span className="tabular-nums">
              {sessionDone} of {questions.length}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-paper)]">
            <div
              className="h-full bg-[var(--brand)] transition-[width] duration-300 ease-out"
              style={{ width: `${sessionPct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink-muted)]">Math mastery</span>
              <span className="text-[var(--ink)] tabular-nums">{mathPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-paper)]">
              <div
                className="h-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${mathPct}%`,
                  backgroundColor: masteryColor(mastery.math),
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[var(--ink-muted)]">Reading mastery</span>
              <span className="text-[var(--ink)] tabular-nums">
                {readingPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-paper)]">
              <div
                className="h-full transition-[width] duration-300 ease-out"
                style={{
                  width: `${readingPct}%`,
                  backgroundColor: masteryColor(mastery.reading),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {remedial && (
        <div className="rounded-lg border border-[var(--status-warn)] bg-[var(--warn-bg)] p-3.5 text-sm text-[var(--ink)]">
          <div className="font-heading font-semibold text-[var(--status-warn)]">
            Synced remedial focus · {subjectLabel(remedial.subject)}
          </div>
          <p className="mt-1 text-[var(--ink)]">{remedial.tip}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Subject focus"
          className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
        >
          {[
            { key: undefined, label: "Adaptive" },
            { key: "math" as const, label: "Math" },
            { key: "reading" as const, label: "Reading" },
          ].map((item) => {
            const active = subject === item.key;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => changeSubject(item.key)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-md px-3 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                  active
                    ? "bg-[var(--brand)] text-[var(--surface)] hover:bg-[var(--brand-hover)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-paper)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

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
                onClick={() => changeLang(item.code)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-md px-3 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                  active
                    ? "bg-[var(--brand)] text-[var(--surface)] hover:bg-[var(--brand-hover)]"
                    : "text-[var(--ink)] hover:bg-[var(--bg-paper)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {question && (
        <section
          key={`${question.id}-${qIdx}`}
          className="animate-fade-in space-y-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--ink-muted)] tabular-nums">
              <span>
                Question {qIdx + 1} · {subjectLabel(question.subject)} · Level{" "}
                {question.level}
              </span>
              {isRemedialQ && (
                <span className="rounded-md border border-[var(--status-warn)] bg-[var(--warn-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-warn)]">
                  Remedial drill
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleListen}
              disabled={isPlaying}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border px-3.5 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                isPlaying
                  ? "border-[var(--brand)] bg-[var(--brand-bg)] text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--bg-paper)]"
              }`}
            >
              {isPlaying && (
                <span className="inline-flex h-3.5 items-end gap-0.5" aria-hidden="true">
                  <span className="eq-bar h-full w-0.5 rounded-sm bg-[var(--brand)]" />
                  <span className="eq-bar eq-bar-2 h-full w-0.5 rounded-sm bg-[var(--brand)]" />
                  <span className="eq-bar eq-bar-3 h-full w-0.5 rounded-sm bg-[var(--brand)]" />
                </span>
              )}
              <span>{isPlaying ? "Playing..." : "Listen"}</span>
            </button>
          </div>

          <h2 className="font-heading text-lg font-semibold leading-snug text-[var(--ink)]">
            {question.prompt[lang]}
          </h2>

          {showHint && (
            <div className="animate-fade-in rounded-lg border border-[var(--border)] bg-[var(--bg-paper)] p-3.5 text-sm text-[var(--ink)]">
              <p>{question.hint[lang]}</p>
              {voiceNote && (
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {voiceNote}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2.5">
            {question.options[lang].map((option, idx) => {
              const isSelected = chosenIdx === idx;
              const isRight = idx === question.answerIdx;
              let btnStyle =
                "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--brand)] hover:bg-[var(--bg-paper)]";
              let keyStyle =
                "border-[var(--border)] bg-[var(--bg-paper)] text-[var(--ink-muted)]";

              if (chosenIdx !== null) {
                if (isRight) {
                  btnStyle =
                    "border-[var(--status-ok)] bg-[var(--ok-bg)] text-[var(--ink)]";
                  keyStyle =
                    "border-[var(--status-ok)] bg-[var(--surface)] text-[var(--status-ok)]";
                } else if (isSelected) {
                  btnStyle =
                    "border-[var(--status-err)] bg-[var(--err-bg)] text-[var(--ink)]";
                  keyStyle =
                    "border-[var(--status-err)] bg-[var(--surface)] text-[var(--status-err)]";
                } else {
                  btnStyle =
                    "border-[var(--border)] bg-[var(--bg-paper)] text-[var(--ink-muted)]";
                }
              }

              return (
                <button
                  key={`${question.id}-${idx}`}
                  type="button"
                  disabled={chosenIdx !== null}
                  onClick={() => handleAnswer(idx)}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:active:scale-100 ${btnStyle}`}
                >
                  <span
                    className={`font-heading inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors duration-150 ${keyStyle}`}
                  >
                    {OPTION_KEYS[idx]}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {chosenIdx !== null && (
            <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <p
                className={`text-sm font-medium ${
                  chosenIdx === question.answerIdx
                    ? "text-[var(--status-ok)]"
                    : "text-[var(--status-err)]"
                }`}
              >
                {chosenIdx === question.answerIdx
                  ? "Correct. Mastery updated locally."
                  : "Keep practicing. Mastery updated locally."}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--brand)] px-4 text-sm font-medium text-[var(--surface)] transition-all duration-150 ease-out hover:bg-[var(--brand-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
              >
                Next question
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
