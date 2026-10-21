/**
 * The app store: mirrors IndexedDB in memory for fast, synchronous React
 * reads (subscribe + snapshot), writes through to the database.
 * Deterministic recommendations are computed here from recorded events only.
 */

import type {
  ActivityEvent,
  HandwritingSession,
  LessonProgress,
  Recommendation,
  Settings,
  SpeakingSession,
  SrsCard,
} from '../types';
import * as db from './db';
import { levelFromXp, streakFromEvents, topicAccuracy, xpRangeForLevel } from '../engines/scoring/scoring';

export { xpRangeForLevel, topicAccuracy, levelFromXp };
import { isDue } from '../engines/srs';
import { todayKey } from '../utils';
import { UNITS, INTERMEDIATE_UNITS } from '../data/curriculum/units';
import { WORDS } from '../data/vocabulary/words';

export const ALL_UNITS = [...UNITS, ...INTERMEDIATE_UNITS];

export interface Snapshot {
  loaded: boolean;
  events: ActivityEvent[];
  lessons: LessonProgress[];
  srs: SrsCard[];
  handwriting: HandwritingSession[];
  speaking: SpeakingSession[];
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  textSize: 1,
  reduceMotion: false,
  highContrast: false,
  demoSeeded: false,
};

interface StoreState {
  snap: Snapshot;
  listeners: Set<() => void>;
}

const state: StoreState = {
  snap: {
    loaded: false,
    events: [],
    lessons: [],
    srs: [],
    handwriting: [],
    speaking: [],
    settings: DEFAULT_SETTINGS,
  },
  listeners: new Set(),
};

function emit(): void {
  state.snap = { ...state.snap };
  for (const l of state.listeners) l();
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem('elowen.settings');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* fresh browser */
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(patch: Partial<Settings>): void {
  const next = { ...state.snap.settings, ...patch };
  localStorage.setItem('elowen.settings', JSON.stringify(next));
  state.snap.settings = next;
  applyVisualSettings(next);
  emit();
}

export function applyVisualSettings(s: Settings): void {
  const root = document.documentElement;
  root.style.setProperty('--scale', String(s.textSize));
  root.dataset.reduceMotion = String(s.reduceMotion);
  root.dataset.contrast = s.highContrast ? 'high' : 'normal';
}

export async function loadAll(): Promise<void> {
  const [events, lessons, srs, handwriting, speaking] = await Promise.all([
    db.getAll<ActivityEvent>('events'),
    db.getAll<LessonProgress>('lessons'),
    db.getAll<SrsCard>('srs'),
    db.getAll<HandwritingSession>('handwriting'),
    db.getAll<SpeakingSession>('speaking'),
  ]);
  state.snap = {
    loaded: true,
    events: events.sort((a, b) => a.ts - b.ts),
    lessons,
    srs,
    handwriting: handwriting.sort((a, b) => b.ts - a.ts),
    speaking: speaking.sort((a, b) => b.ts - a.ts),
    settings: readSettings(),
  };
  applyVisualSettings(state.snap.settings);
  emit();
}

export function subscribe(fn: () => void): () => void {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function getSnapshot(): Snapshot {
  return state.snap;
}

/* ------------------------------- writes ------------------------------- */

export async function recordEvent(e: Omit<ActivityEvent, 'id' | 'ts'> & { ts?: number }): Promise<void> {
  const ev: ActivityEvent = { ...e, id: crypto.randomUUID(), ts: e.ts ?? Date.now() };
  await db.put('events', ev);
  state.snap.events = [...state.snap.events, ev];
  emit();
}

export async function recordLessonAttempt(lessonId: string, scorePercent: number, xp: number, topic: string): Promise<void> {
  const prev = state.snap.lessons.find((l) => l.lessonId === lessonId);
  const lp: LessonProgress = {
    lessonId,
    attempts: (prev?.attempts ?? 0) + 1,
    best: Math.max(prev?.best ?? 0, scorePercent),
    lastTs: Date.now(),
  };
  await db.put('lessons', lp);
  state.snap.lessons = [...state.snap.lessons.filter((l) => l.lessonId !== lessonId), lp];
  await recordEvent({ kind: 'lesson', topic, refId: lessonId, score: scorePercent, xp });
}

export async function upsertSrs(card: SrsCard): Promise<void> {
  await db.put('srs', card);
  state.snap.srs = [...state.snap.srs.filter((c) => c.wordId !== card.wordId), card];
  emit();
}

export async function saveHandwriting(s: HandwritingSession): Promise<void> {
  await db.put('handwriting', s);
  state.snap.handwriting = [s, ...state.snap.handwriting];
  emit();
  const avg = s.report.overall;
  if (avg != null) {
    await recordEvent({ kind: 'handwriting', refId: s.id, score: avg, xp: xpFromScore(avg) });
  }
}

export async function saveSpeaking(s: SpeakingSession): Promise<void> {
  await db.put('speaking', s);
  state.snap.speaking = [s, ...state.snap.speaking];
  emit();
  const score = s.similarity != null ? s.similarity * 100 : 40;
  await recordEvent({ kind: 'speaking', refId: s.id, score, xp: xpFromScore(score) });
}

export async function recordReading(passageId: string, scorePercent: number): Promise<void> {
  await db.put('reading', { passageId, score: scorePercent, ts: Date.now() });
  await recordEvent({ kind: 'reading', topic: 'reading', refId: passageId, score: scorePercent, xp: xpFromScore(scorePercent) });
}

export async function logGrammarCheck(ruleCount: number): Promise<void> {
  const ok = ruleCount === 0 ? 100 : Math.max(10, 100 - ruleCount * 12);
  await recordEvent({ kind: 'grammar', topic: 'grammar', score: ok, xp: Math.round(ok * 0.12) });
}

export function xpFromScore(score: number): number {
  return Math.round(Math.max(2, score * 0.12));
}

export async function wipeEverything(): Promise<void> {
  await db.wipeAll();
  state.snap = {
    loaded: true,
    events: [],
    lessons: [],
    srs: [],
    handwriting: [],
    speaking: [],
    settings: state.snap.settings,
  };
  emit();
}

/* ----------------------------- selectors ----------------------------- */

export function totalXp(events: ActivityEvent[]): number {
  return events.reduce((a, e) => a + (e.xp ?? 0), 0);
}

export function streak(events: ActivityEvent[]): number {
  return streakFromEvents(events);
}

export function lessonById(id: string) {
  for (const u of ALL_UNITS) for (const l of u.lessons) if (l.id === id) return l;
  return null;
}

/** Next unstarted (or incomplete) lesson in a flat curriculum order. */
export function nextLessonTarget(_events: ActivityEvent[], lessons: LessonProgress[]): string | null {
  const completed = new Set(lessons.filter((l) => l.best >= 80).map((l) => l.lessonId));
  for (const u of ALL_UNITS) for (const l of u.lessons) {
    if (!completed.has(l.id)) return `${u.id}/${l.id}`;
  }
  return null;
}

export function dueSrsCards(srs: SrsCard[], now = Date.now()): SrsCard[] {
  return srs.filter((c) => isDue(c, now)).sort((a, b) => a.due - b.due);
}

const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));

export function srsWord(card: SrsCard) {
  return WORD_BY_ID.get(card.wordId);
}

const RECENT_MS = 14 * 86400000;

/**
 * Deterministic recommendation rules (documented):
 *  1. Weak grammar topic in last 10 scored events (<60 avg) → related lesson.
 *  2. SRS cards due ≥ 5  → vocabulary review.
 *  3. Handwriting word-spacing or alignment score < 60 in the latest session
 *     when a score was measurable → spacing/alignment exercise.
 *  4. Speaking sessions with low word-match similarity → repetition drill.
 *  5. Otherwise: continue next lesson.
 */
export function computeRecommendations(snap: Snapshot): Recommendation[] {
  const recs: Recommendation[] = [];
  const now = Date.now();
  const since = now - RECENT_MS;
  const recentEvents = snap.events.filter((e) => e.ts >= since);

  // 1. weak topics
  const ta = topicAccuracy(recentEvents.filter((e) => e.score != null));
  for (const t of ta.slice(0, 2)) {
    if (t.avg < 60 && t.attempts >= 2) {
      const lessonMatch = findLessonByTopic(t.topic);
      if (lessonMatch) {
        recs.push({
          kind: 'review-weak-topic',
          title: `A quick revisit: ${lessonMatch.lesson.title}`,
          reason: `Recent ${t.topic} answers averaged ${Math.round(t.avg)}% — a refresher helps more than new material.`,
          to: `#/learn/${lessonMatch.unit.id}/${lessonMatch.lesson.id}`,
        });
      }
    }
  }

  // 2. srs due
  const due = dueSrsCards(snap.srs);
  if (due.length >= 5) {
    recs.push({
      kind: 'srs',
      title: `Review ${due.length} vocabulary cards`,
      reason: 'Spaced repetition says these words are due today.',
      to: '#/vocabulary',
    });
  }

  // 3. handwriting weak metric
  const latestHw = snap.handwriting[0];
  if (latestHw) {
    const spacing = latestHw.report.scores.find((s) => s.key === 'wordSpacing');
    const align = latestHw.report.scores.find((s) => s.key === 'lineAlignment');
    if (spacing?.score != null && spacing.score < 60) {
      recs.push({
        kind: 'handwriting',
        title: 'Word-spacing (copy the short-words page)',
        reason: `Your latest session scored ${Math.round(spacing.score)} on spacing consistency.`,
        to: '#/handwriting',
      });
    }
    if (align?.score != null && align.score < 60) {
      recs.push({
        kind: 'handwriting',
        title: 'Line-alignment drill (ruled paper)',
        reason: `Latest alignment score was ${Math.round(align.score)}.`,
        to: '#/handwriting',
      });
    }
  }

  // 4. word omissions in speaking
  const recentSp = snap.speaking.slice(0, 3).filter((s) => s.similarity != null);
  if (recentSp.length >= 2) {
    const avgSim = recentSp.reduce((a, s) => a + (s.similarity ?? 0), 0) / recentSp.length;
    if (avgSim < 0.7) {
      recs.push({
        kind: 'speaking',
        title: 'Sentence-repetition drill',
        reason: `Recent recordings matched about ${Math.round(avgSim * 100)}% of target words.`,
        to: '#/speaking',
      });
    }
  }

  // 5. curriculum continuation
  const next = nextLessonTarget(snap.events, snap.lessons);
  if (next) {
    const [unitId, lessonId] = next.split('/');
    const unit = ALL_UNITS.find((u) => u.id === unitId);
    const lesson = unit?.lessons.find((l) => l.id === lessonId);
    if (unit && lesson) {
      const attempted = snap.lessons.some((l) => l.lessonId === lesson.id);
      recs.push({
        kind: 'next-lesson',
        title: `Continue: ${lesson.title}`,
        reason: attempted ? 'You are partway through this lesson.' : `Next step in “${unit.title}”.`,
        to: `#/learn/${unitId}/${lessonId}`,
      });
    }
  }
  return recs.slice(0, 4);
}

function findLessonByTopic(topic: string): { unit: (typeof ALL_UNITS)[number]; lesson: (typeof ALL_UNITS)[number]['lessons'][number] } | null {
  for (const u of ALL_UNITS) {
    for (const l of u.lessons) {
      if (l.topic === topic) return { unit: u, lesson: l };
    }
  }
  return null;
}

export function activeToday(snap: Snapshot): boolean {
  const t = todayKey();
  return snap.events.some((e) => todayKey(e.ts) === t);
}

export function demoEvents(): ActivityEvent[] {
  const now = Date.now();
  const mk = (day: number, kind: ActivityEvent['kind'], topic: string, score: number): ActivityEvent => ({
    id: `demo-${day}-${topic}`,
    ts: now - day * 86400000 - 3600_000,
    kind,
    topic,
    score,
    xp: xpFromScore(score),
  });
  return [
    mk(1, 'lesson', 'tenses', 70),
    mk(1, 'lesson', 'articles', 85),
    mk(2, 'lesson', 'tenses', 55),
    mk(2, 'vocab', 'vocab', 90),
    mk(3, 'lesson', 'parts-of-speech', 95),
    mk(4, 'handwriting', 'handwriting', 62),
    mk(5, 'lesson', 'prepositions', 60),
    mk(6, 'speaking', 'speaking', 65),
    mk(6, 'lesson', 'spelling', 88),
    mk(8, 'lesson', 'alphabet', 92),
  ];
}

export async function seedDemo(): Promise<void> {
  if (state.snap.settings.demoSeeded) return;
  const events = demoEvents().map((e) => ({ ...e, id: `${e.id}.${Date.now().toString(36)}` }));
  await db.putBulk('events', events);
  saveSettings({ demoSeeded: true });
  state.snap.events = [...state.snap.events, ...events];
  emit();
}

export function xpLevelFromSnapshot(snap: Snapshot): { level: number; xp: number } {
  const xp = totalXp(snap.events);
  return { level: levelFromXp(xp), xp };
}
