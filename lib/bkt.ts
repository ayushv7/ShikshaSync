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
  subject?: Subject
): Question | null {
  if (pool.length === 0) return null;

  const unseen = pool.filter((q) => !seenIds.includes(q.id));
  const activePool = unseen.length > 0 ? unseen : pool;

  const focus: Subject =
    subject ?? (mastery.math <= mastery.reading ? "math" : "reading");
  const subjectPool = activePool.filter((q) => q.subject === focus);
  const candidates = subjectPool.length > 0 ? subjectPool : activePool;

  const wantedLevel = targetLevel(mastery[candidates[0].subject]);
  return [...candidates].sort(
    (a, b) => Math.abs(a.level - wantedLevel) - Math.abs(b.level - wantedLevel)
  )[0];
}
