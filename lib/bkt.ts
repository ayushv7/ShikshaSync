import type { Question, Subject } from "./data";

export type MasteryMap = Record<Subject, number>;

export type BktParams = {
  pLearn?: number;
  pGuess?: number;
  pSlip?: number;
};

export const DEFAULT_MASTERY: MasteryMap = {
  math: 0.35,
  reading: 0.35,
};

export function updateBkt(
  prior: number,
  isCorrect: boolean,
  params: BktParams = {}
): number {
  const pLearn = params.pLearn ?? 0.2;
  const pGuess = params.pGuess ?? 0.25;
  const pSlip = params.pSlip ?? 0.1;

  const p = Math.min(0.99, Math.max(0.05, prior));
  const posterior = isCorrect
    ? (p * (1 - pSlip)) / (p * (1 - pSlip) + (1 - p) * pGuess)
    : (p * pSlip) / (p * pSlip + (1 - p) * (1 - pGuess));

  const next = posterior + (1 - posterior) * pLearn;
  return Math.round(Math.min(0.99, Math.max(0.05, next)) * 1000) / 1000;
}

export function targetLevel(score: number): 1 | 2 | 3 {
  if (score < 0.45) return 1;
  if (score < 0.75) return 2;
  return 3;
}

export function pickQuestion(
  pool: Question[],
  mastery: MasteryMap,
  seenIds: string[],
  subject?: Subject,
  priorityIds: string[] = []
): Question | null {
  if (pool.length === 0) return null;

  if (!subject && priorityIds.length > 0) {
    const priorityMatch = pool.find(
      (q) => priorityIds.includes(q.id) && !seenIds.includes(q.id)
    );
    if (priorityMatch) return priorityMatch;
  }

  const unseen = pool.filter((q) => !seenIds.includes(q.id));
  const weaker: Subject = mastery.math <= mastery.reading ? "math" : "reading";
  const focus: Subject =
    subject ??
    (unseen.some((q) => q.subject === weaker)
      ? weaker
      : unseen[0]?.subject ?? weaker);

  const subjectPool = pool.filter((q) => q.subject === focus);
  const basePool = subjectPool.length > 0 ? subjectPool : pool;
  const unseenSubject = basePool.filter((q) => !seenIds.includes(q.id));
  const candidates = unseenSubject.length > 0 ? unseenSubject : basePool;

  const wantedLevel = targetLevel(mastery[focus]);
  return [...candidates].sort(
    (a, b) => Math.abs(a.level - wantedLevel) - Math.abs(b.level - wantedLevel)
  )[0];
}
