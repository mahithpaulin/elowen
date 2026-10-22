# Elowen — Status

Updated: 2026-10-22

## Current

Phase: **v1.0.0 release pass.** The repository is public and the site is live at
https://elowen-zeta.vercel.app (Vercel Hobby, personal/non-commercial).

Local verification of this pass: `tsc --noEmit` clean, **125 tests in 8 files
passing**, Vite production build green. CI runs the same typecheck, test suite
and production build on every push and uploads the `elowen-dist` artifact.

## v1 repair pass (2026-10-22)

Bugs found and fixed, each covered by a regression test where the logic is pure:

- **MCQ answers were marked wrong after shuffling.** Option order was shuffled
  for presentation, but the player compared the *presented* index with the
  original answer index. `mcqPresentation` now returns the permutation and the
  player maps back before `checkAnswer`; every authored MCQ and every passage
  question is exercised position-by-position.
- **The last spoken word was dropped.** Vosk only emits a final `result` at an
  endpoint; a take that ends on the last word had none. Transcription now feeds
  one second of silence to flush the segment, keeps the last partial as a
  fallback, and waits for the worker before finishing.
- **One take / one photo could become two sessions and double XP.** Speaking
  and handwriting now keep a stable session id; the optional transcript/OCR
  pass updates that session and its event in place (`putEventForRef`).
  An unmeasurable re-run clears an older score instead of leaving a stale one.
- **Handwriting practice OCR read the ruled guide lines.** It now runs on the
  clean strokes-only render that was measured, not the ruled canvas. Analysing
  the same sheet twice updates one session; changing the copy task resets it.
- **Dashboard "Continue learning" never resolved.** The target `unitId/lessonId`
  was parsed with an off-by-one destructure, so the card always said "curriculum
  finished". Added a shared parser and a test over every lesson.
- **Non-Latin Google names were mangled.** The JWT payload was decoded as
  Latin-1; it is now UTF-8 (with base64url padding), tested with Malayalam and
  accented names.
- **Duplicate grammar-check recordings.** The record button disables after one
  save and re-enables only when the text changes.
- Smaller correctness/ownership fixes: `setSession` reports guest migration
  only when data was actually copied; the stale `'demo'` event kind is gone;
  engine download sizes are honest (tesseract ≈13 MB, not 18/40 MB); engine
  "downloaded" wording no longer promises more than the browser cache can
  guarantee; the service-worker version is bumped for the v1 shell.

## Done

- Full source tree (see IMPLEMENTATION_PLAN.md M1–M8 checkboxes).
- Device-local profiles via optional Google sign-in (`elowen.<sub>` IndexedDB
  namespace, one-time explicit guest copy, no backend/sync).
- PWA: offline shell, manifest + icons, install prompt, iOS instructions.
- Deterministic engines: grammar rules, text alignment, SRS, scoring,
  image pipeline, VAD/metrics, optional OCR and offline speech adapters.
- Tests cover the pure engines plus regression cases for every shipped bug
  named above.
- README (feature map, privacy, determinism, limits, licences) and deployment
  notes.

## Known limits / not done

- **No real-device pass in this environment.** Camera capture, microphone
  permission flow, canvas pointer input, PWA install and CDN engine loads need
  a phone/desktop browser; this device has no Chromium. The app shells these
  paths explicitly and reports failures, but they are not certified by an
  automated browser test.
- Tesseract is a print OCR engine; cursive handwriting can legitimately produce
  a low-confidence or empty comparison. The UI says so rather than inventing a
  transcript.
- The vosk model is US-English and memory-heavy on old phones.
- Large engine downloads live in browser cache; the browser may evict them.
  The app shell and all measurements remain offline regardless.

## CI history

1. `39549961893` — truncated `out.push(` in PREP-006.
2. `39552466995` — 27 strict errors (token offsets, chart props, session fields).
3. `39553632976` / `39553948046` — missing `asrEngine` field.
4. `39554999905` → `39555520157` → `39555852407` → `39556112528` GREEN.
   Substantive finds: TRIM_CHARS regex class broken by an unescaped `]`;
   streaks honour a yesterday-run; spelling skips sentence-start capitals;
   "explain me" / "between you and I" pronoun rules.
5. `39559703796` GREEN after design polish; repo made public.
6. `39574663276` GREEN after accounts + engines + PWA install.
7. v1.0.0 pass: see the run on the release commit (pending push).

## Next action

Push the v1.0.0 commit, confirm the CI run is green, deploy with
`vercel --prod --yes`, then verify the live shell and hashed assets. A
real-device pass remains the honest follow-up.
