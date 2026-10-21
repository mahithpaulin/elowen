# Elowen — Implementation Plan

Build order, milestones, and acceptance criteria. Status tracked in `STATUS.md`.

## Stack (chosen)

- **React 19 + TypeScript + Vite** — responsive progressive web app, browser-local.
- **No backend.** All analysis runs in the browser (deterministic algorithms + DSP).
- **Persistence:** IndexedDB for progress/history (hand-rolled wrapper), localStorage for settings only.
- **Tests:** Vitest (engine unit tests; DOM-free where possible).
- **Deployment:** static build on Vercel free tier (Hobby, non-commercial).
- **No generative AI.** No LLM/API inference anywhere. Recognition tasks (OCR, ASR) use offline-capable, lazily-loaded engines behind clean interfaces with explicit availability states.

## Milestones

### M1 — Foundation (Priority 1)

- [x] Scaffold: Vite + React + TS, git init
- [x] Design system: tokens, CSS, components (card, button, badge, progress)
- [x] Hash router + responsive shell (sidebar desktop / bottom+drawer mobile)
- [x] Persistence layer (IndexedDB store: events, sessions, SRS, settings)
- Acceptance: app runs, persists data across reload.

### M2 — Learning core (Priority 1)

- [x] Curriculum data model (levels → units → lessons → exercises) in TS data files
- [x] Exercise engine: mcq / type-in / word-order; normalised answer checking, explanations
- [x] Lesson player (Learn screen) with immediate feedback + follow-up on mistakes
- [x] Scoring: XP, levels, streaks from recorded activity, topic accuracy
- [x] Dashboard with deterministic recommendations (rules on recorded results only)
- [x] Demo-mode sample data, clearly labelled, opt-in onboarding only
- Acceptance: Journey A passes (dashboard → lesson → feedback → progress updates).

### M3 — Grammar Lab (Priority 1)

- [x] Tokeniser with text offsets; sentence capitalisation
- [x] Authored common-word dictionary + misspelling map + edit-distance-1 lookup
- [x] Rule set with IDs, severity (error / possible / style), explanations, fix suggestions
- [x] Unit tests per rule + tokeniser
- Acceptance: deterministic verdicts, honest low-confidence message when unsure.
- Supported rules: subject–verb agreement, have/has, tense after do/does/did, pronouns
  (me/I), pronoun (their/there/they're), common article errors on known constructionss,
  preposition errors (in/on/at time & days, "explain to me", "discuss", "married to"),
  doubled words, missing space after punctuation, capital "I", repeated punctuation,
  sentence start capitalisation, common misspellings, likely misspelling by edit distance.

### M4 — Vocabulary (Priority 1)

- [x] Authored word list (definition, examples, difficulty, tags) — no invented definitions
- [x] Flashcards + MCQ quiz + spaced repetition (SM-2-lite with interval quality)
- [x] Review queue + mastery persistence
- Acceptance: Journey D passes (review → reload → progress persists).

### M5 — Reading (Priority 1)

- [x] Original passages, beginner/intermediate, MCQ + short-answer questions with explanations
- [x] Vocabulary support (linked word list) + "read aloud" hand-off to Speaking Lab
- Acceptance: scoring is keyword-based and deterministic; no invented grading.

### M6 — Handwriting Lab (Priority 2)

- [x] On-screen canvas: pointer/stylus, pen size, undo/clear, ruled paper; PNG export and letter-tracing planned (see STATUS)
- [x] Image upload + camera capture; size-capped decode
- [x] Preprocessing pipeline (pure TS): grayscale, contrast stretch, sharpness, brightness check, median denoise, integral-image adaptive threshold
- [x] Analysis: connected components (BFS, typed arrays), line segmentation by projection, baselines, letter-height variation, word-gap clustering, alignment/slant with reliability gates
- [x] Report: defined metrics only; quality warnings; history + trend on Progress page
- [x] Handwriting recognition: tesseract.js adapter loaded lazily from free CDN (documented fetch); word-level diff vs reference — labelled letter check
- [x] Unit tests: preprocessing math, components, line split, diff engine
- Acceptance: Journey B passes (upload → process → report → save) — verified via synthetic-image tests and UI build.

### M7 — Speaking Lab (Priority 3)

- [x] Record Audio API capture (ScriptProcessor), envelope waveform, duration, playback
- [x] Audio analysis: RMS dB, clipping, VAD segmentation, pauses, rate from transcript when available
- [x] Transcript comparison via token alignment (same diff engine)
- [x] `Speech` engine adapter (vosk-browser lazy CDN load, ~40 MB model), explicit unavailable state — no fake transcripts
- [x] Fairness wording: accent ≠ error; engine flatly reports when it cannot listen
- [x] Unit tests: VAD, RMS, alignment, rate
- Acceptance: Journey C passes (record → analysis → transcript or explicit model-unavailable → repeat).

### M8 — Product readiness (Priority 4)

- [x] Progress analytics (topic accuracy, SVG history charts, limitations documented)
- [x] Settings: text size, reduce motion, high contrast, export, wipe, privacy notice, engine status
- [x] Error boundary + typed states (loading/error/empty)
- [ ] Vitest suite green, `tsc --noEmit` clean, production build clean — pending first CI run
- [x] README (run/test/deploy/licences/limits), PWA offline shell
- Acceptance: all scripts green; honest feature classification below.

## Feature classification (final report format)

- **Implemented & tested** — engine + unit tests + integration check via build/tests.
- **Implemented, not fully tested** — needs a real device/browser manual pass (camera, mic, realtime canvas on diverse hardware).
- **Partially implemented** — works but limited by data size or model availability.
- **Planned, not implemented** — listed in STATUS.md, no code claims.
