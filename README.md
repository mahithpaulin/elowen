# Elowen

**Write with precision. Speak with clarity.**

Elowen is an English learning, handwriting analysis and speech training web app that runs entirely in your browser. No account. No uploads. **No generative AI anywhere** — every score, explanation and suggestion is produced by deterministic, hand-written algorithms, and every case the app cannot measure is labelled, never guessed.

## Feature map

| Area | What works |
|---|---|
| **Learn** | 17 units (11 beginner + 6 intermediate), lessons with explanation + examples, three exercise kinds (MCQ / type-in / word-order), instant feedback with explanations, best-score tracking |
| **Dashboard** | Streak, XP/level curve, weakest-topic detection from the last 10 scored attempts, 5 explicit recommendation rules on recorded events only |
| **Grammar Lab** | Rule engine with typed severities (`error` / `possible` / `style`), rule IDs (SVA/TEN/PRN/ART/PREP/PUN/CAP/SPL), token offsets, fix suggestions, "what it cannot catch" honesty panel |
| **Vocabulary** | 105 authored entries (definitions + examples + synonyms, all verifiable), flashcards with SM-2-lite scheduling, MCQ quiz, per-card mastery from review history |
| **Reading** | 6 original passages with vocabulary supports and comprehension questions |
| **Handwriting Lab** | Canvas practice (pen sizes, undo/clear, ruled lines), photo/camera analysis pipeline: grayscale → contrast stretch → median denoise → adaptive threshold → skew estimate/rotate → connected components → line segmentation; measurable scores gated on declared thresholds; optional one-time OCR (tesseract.js) letter check with word diff |
| **Speaking Lab** | In-browser recording, local DSP: VAD speech/silence split, pause count, RMS/peak dBFS, clipping detection, speech envelope; optional one-time ~40 MB offline recogniser (vosk-browser + vosk-model-small-en-us-0.15) for transcript + word-match score — never fabricates a transcript |
| **Progress** | Topic averages, handwriting and speech trend charts (SVG), learning trail, vocabulary queue state |
| **Settings** | Text size, reduce motion, high contrast, full JSON export, one-tap erase, engine availability notes |
| **PWA** | Offline shell service worker, manifest + icons |

## Run it

```bash
npm ci
npm run dev        # local dev server
npm run test       # vitest suite
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + vite production build (dist/)
```

Requires Node ≥ 20. The test suite exercises the pure engines (alignment, grammar rules, SRS math, scoring, image pipeline on synthetic images, VAD on synthetic PCM) — browser-only behaviours (camera, mic, canvas pointer events, CDN engine loading) need a real device/browser pass.

## Privacy / architecture

- All data lives in your browser: IndexedDB (events, lesson bests, SRS cards, reading, handwriting and speaking sessions) + localStorage (display settings). No server, no sync, no analytics, no cookies.
- Two optional engines fetch on first explicit use from public CDNs, then run on-device:
  - tesseract.js `5.1.1` (handwriting letter check)
  - vosk-browser `0.0.7` + `vosk-model-small-en-us-0.15` (~40 MB; speaking transcripts)
- Photos and audio never leave the tab. Export produces readable JSON from the Settings page.

## Determinism guarantees

- Same input → same scores everywhere: seeded shuffles, SM-2-lite recurrence, robust median/MAD statistics, and alignment via Levenshtein DP on lower-cased tokens.
- Every metric declares its gate; unmeasurable states surface as "not measurable: <reason>", not as hidden zero scores.
- Grammar findings carry explanations; the checker states limitations in-product.

## Known limits (stated up front)

- Grammar coverage is a curated rule set — silent on arbitrary errors; the UI says this.
- Vocabulary is 105 verifiable entries, not a dictionary dump; definitions are never invented when a word is missing.
- Handwriting analysis assumes roughly upright, well-lit sheets; extreme slant, cursive overlap or noise produce an explicit quality warning instead of a score.
- The offline speech model is US-English; other accents are treated as pronunciation differences, not errors.

## Licences

- Elowen code: MIT.
- Runtime engines (loaded on demand in the browser): tesseract.js (Apache-2.0) and vosk-browser/vosk models (Apache-2.0; vosk-model-small-en-us is CC-BY-NC 4.0 — note this if repurposing).
- No training data, model weights or generated corpora ship with this repo.

## Deployment

The production build is static (`dist/`). CI produces it as an artifact on every push. The app is deployable to Vercel Hobby / GitHub Pages / any static host — all are free-tier, non-commercial use.
