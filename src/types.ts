export type ExerciseKind = 'mcq' | 'type' | 'wordOrder';

export interface McqExercise {
  type: 'mcq';
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface TypeExercise {
  type: 'type';
  prompt: string;
  /** Accepted answers; compared normalised (lowercase, trimmed, single spaces). */
  accept: string[];
  hint?: string;
  explanation: string;
}

export interface WordOrderExercise {
  type: 'wordOrder';
  prompt: string;
  /** Shuffled words shown as tiles. */
  words: string[];
  answer: string;
  explanation: string;
}

export type Exercise = McqExercise | TypeExercise | WordOrderExercise;

export interface LessonData {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate';
  topic: string; // e.g. 'tenses', 'articles', 'spelling'
  explanation: string;
  examples: string[];
  exercises: Exercise[];
}

export interface UnitData {
  id: string;
  title: string;
  blurb: string;
  lessons: LessonData[];
}

/* Grammar engine types */

export type IssueSeverity = 'error' | 'possible' | 'style';

export interface GrammarIssue {
  ruleId: string;
  severity: IssueSeverity;
  start: number; // offset in original text
  end: number;
  excerpt: string;
  message: string;
  explanation: string;
  suggestion?: string;
}

export interface GrammarResult {
  issues: GrammarIssue[];
  tokenCount: number;
}

/* Text comparison types (shared by OCR + ASR modules) */

export interface TokenDiff {
  kind: 'match' | 'sub' | 'ins' | 'del';
  reference?: string; // for match/sub/del
  produced?: string; // for match/sub/ins
  indexInReference?: number;
  confidence?: number; // 0..1 when engine reports confidence
}

export interface CompareResult {
  tokens: TokenDiff[];
  /** 0..1 — matched words divided by the larger of the two word counts. */
  similarity: number;
  /** Words present in both. */
  matched: number;
  /** Words in the reference that were never produced. */
  missing: number;
  /** Words produced that are not in the reference. */
  extra: number;
}

/* Handwriting analysis types */

export interface Quality {
  score: number; // 0..100
  brightness: number; // 0..255 mean
  sharpness: number; // relative units
  warnings: string[];
}

export interface HandwritingMetrics {
  lineCount: number;
  letterHeightCV: number | null; // coefficient of variation of letter heights
  wordGapCV: number | null; // consistency of word spacing
  lineSpacingCV: number | null;
  baselineSlopeRMS: number | null; // in degrees of residual slope per line
  slantDeg: number | null;
  slantReliable: boolean;
  inkCoverage: number; // fraction of ink pixels
}

export interface MetricScore {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  score: number | null; // 0..100, null when not measurable
  gate: string | null; // reason unmeasurable, if score null
  note: string;
}

export interface AnalyzeOutput {
  quality: Quality;
  metrics: HandwritingMetrics;
  scores: MetricScore[];
  overall: number | null;
  ocr?: OcrOutcome | null;
  width: number;
  height: number;
}

export interface OcrWord {
  word: string;
  confidence: number; // 0..100
}

export interface OcrOutcome {
  engine: string;
  words: OcrWord[];
  comparison: CompareResult;
}

/* Audio analysis types */

export interface AudioReport {
  durationS: number;
  speechS: number;
  silenceS: number;
  pauseCount: number;
  rmsDbfs: number;
  peakDbfs: number;
  clipRatio: number; // samples >= -0.1 dBFS
  speechRate: number | null; // words/sec, needs transcript
  warnings: string[];
  wave: number[]; // normalised envelope for display (0..1)
}

/* Progress / storage types */

export type EventKind =
  | 'lesson'
  | 'grammar'
  | 'vocab'
  | 'reading'
  | 'handwriting'
  | 'speaking';

export interface ActivityEvent {
  id: string;
  ts: number;
  kind: EventKind;
  topic?: string;
  refId?: string;
  label?: string;
  score?: number; // 0..100 — absent when the case could not be measured
  xp: number;
  /** True for the labelled sample data the tour can load. Never mixed with real work. */
  demo?: boolean;
}

export interface LessonProgress {
  lessonId: string;
  attempts: number;
  best: number; // best score 0..100
  lastTs: number;
}

export interface SrsCard {
  wordId: string;
  ease: number; // 1.3 .. 3.0
  interval: number; // days
  due: number; // epoch ms
  reps: number;
  lapses: number;
  lastTs: number;
}

export interface HandwritingSession {
  id: string;
  ts: number;
  source: 'canvas' | 'upload' | 'camera';
  exerciseRef?: string;
  report: AnalyzeOutput;
  transcriptUsed?: boolean;
}

export interface SpeakingSession {
  id: string;
  ts: number;
  exerciseRef: string;
  transcript: string | null;
  similarity: number | null;
  report: AudioReport;
  asrEngine: string | null;
}

export interface Settings {
  textSize: number; // 0.9 .. 1.35 scale
  reduceMotion: boolean;
  highContrast: boolean;
  demoSeeded: boolean;
}

/* Recommendation */

export interface Recommendation {
  title: string;
  reason: string;
  to: string; // hash route
  kind: 'review-weak-topic' | 'srs' | 'handwriting' | 'speaking' | 'next-lesson';
}
