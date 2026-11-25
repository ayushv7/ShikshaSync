import { students, type Lang, type Subject } from "./data";
import { DEFAULT_MASTERY, type MasteryMap } from "./bkt";

export type SyncDelta = {
  id: string;
  studentId: string;
  subject: Subject;
  questionId: string;
  correct: boolean;
  mastery: number;
  ts: number;
};

export type RemedialItem = {
  studentId: string;
  studentName: string;
  grade: number;
  subject: Subject;
  mastery: number;
  tip: string;
  questionIds: string[];
};

export type LastSync = {
  at: number;
  source: string;
  bytes: number;
};

const KEYS = {
  mastery: "shiksha_mastery",
  queue: "shiksha_queue",
  offline: "shiksha_offline",
  lang: "shiksha_lang",
  pack: "shiksha_pack",
  lastSync: "shiksha_last_sync",
} as const;

const DB_NAME = "shikshasync";
const STORE_NAME = "state";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readString(key: string, fallback: string): string {
  if (!hasWindow()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeString(key: string, value: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
  void idbPut(key, value);
}

function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key, "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
  void idbPut(key, value);
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasWindow() || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export function defaultMasteryMap(): Record<string, MasteryMap> {
  const map: Record<string, MasteryMap> = {};
  for (const student of students) {
    map[student.id] = { ...student.initialMastery };
  }
  return map;
}

export function getAllMastery(): Record<string, MasteryMap> {
  const defaults = defaultMasteryMap();
  const saved = readJson<Record<string, MasteryMap>>(KEYS.mastery, {});
  const merged: Record<string, MasteryMap> = {};
  for (const student of students) {
    merged[student.id] = {
      ...defaults[student.id],
      ...(saved[student.id] ?? {}),
    };
  }
  return merged;
}

export function getStudentMastery(studentId: string): MasteryMap {
  const all = getAllMastery();
  return all[studentId] ?? { ...DEFAULT_MASTERY };
}

export function saveStudentMastery(
  studentId: string,
  mastery: MasteryMap
): void {
  const all = getAllMastery();
  all[studentId] = mastery;
  writeJson(KEYS.mastery, all);
}

export function getSyncQueue(): SyncDelta[] {
  return readJson<SyncDelta[]>(KEYS.queue, []);
}

export function enqueueDelta(
  item: Omit<SyncDelta, "id" | "ts">
): SyncDelta[] {
  const syncQueue = getSyncQueue();
  const delta: SyncDelta = {
    ...item,
    id: `${item.studentId}-${item.questionId}-${Date.now()}`,
    ts: Date.now(),
  };
  const next = [...syncQueue, delta];
  writeJson(KEYS.queue, next);
  return next;
}

export function clearSyncQueue(): void {
  writeJson(KEYS.queue, []);
}

export function getOffline(): boolean {
  return readString(KEYS.offline, "0") === "1";
}

export function setOffline(isOffline: boolean): void {
  writeString(KEYS.offline, isOffline ? "1" : "0");
  if (hasWindow()) {
    window.dispatchEvent(new Event("shiksha-offline-change"));
  }
}

export function isEffectiveOffline(): boolean {
  if (!hasWindow()) return false;
  return getOffline() || !window.navigator.onLine;
}

export function watchConnectivity(onChange: (offline: boolean) => void): () => void {
  if (!hasWindow()) return () => {};
  const onOffline = () => onChange(true);
  const onOnline = () => onChange(getOffline());
  const onSync = () => onChange(isEffectiveOffline());
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  window.addEventListener("shiksha-offline-change", onSync);
  return () => {
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("shiksha-offline-change", onSync);
  };
}

export function getLang(): Lang {
  const val = readString(KEYS.lang, "en");
  return val === "kn" || val === "hi" ? val : "en";
}

export function setLang(lang: Lang): void {
  writeString(KEYS.lang, lang);
}

export function getRemedialPack(): RemedialItem[] {
  return readJson<RemedialItem[]>(KEYS.pack, []);
}

export function saveRemedialPack(pack: RemedialItem[]): void {
  writeJson(KEYS.pack, pack);
}

export function getLastSync(): LastSync | null {
  return readJson<LastSync | null>(KEYS.lastSync, null);
}

export function saveLastSync(info: LastSync): void {
  writeJson(KEYS.lastSync, info);
}

export function resetDemoStorage(): void {
  if (!hasWindow()) return;
  try {
    for (const key of [KEYS.mastery, KEYS.queue, KEYS.pack, KEYS.lastSync]) {
      window.localStorage.removeItem(key);
    }
  } catch {
    return;
  }
  void idbPut(KEYS.mastery, defaultMasteryMap());
  void idbPut(KEYS.queue, []);
  void idbPut(KEYS.pack, []);
  void idbPut(KEYS.lastSync, null);
}

export async function hydrateStorage(): Promise<void> {
  if (!hasWindow()) return;
  try {
    for (const key of [KEYS.mastery, KEYS.queue, KEYS.pack, KEYS.lastSync]) {
      if (!window.localStorage.getItem(key)) {
        const val = await idbGet<unknown>(key);
        if (val !== null) {
          window.localStorage.setItem(key, JSON.stringify(val));
        }
      }
    }
  } catch {
    return;
  }
}
