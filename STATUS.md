# Elowen — Status

Updated: 2026-10-21

## Current

Phase: **CI-green build verified** as of 2026-10-21 (run #39556112528).
`npm ci`, `tsc --noEmit`, vitest suite (`tests/`, 7 files), and `vite build`
all pass in Actions on every push. The static site is produced as the
`elowen-dist` artifact (~134 KB) from the production build.

## Done

- Full source tree (see IMPLEMENTATION_PLAN.md M1–M8 checkboxes).
- Sync data model fixes made while writing the pages: lesson attempt records
  key on bare `lessonId` (curriculum order keys stay `unit/lesson`),
  `xpRangeForLevel` + `topicAccuracy` re-exported from appstore, reading
  scores resolved from events (Snapshot has no reading store).
- UI consistency fixes: token diff renders `.diff .tok` + `kind`
  (match/sub/ins/del); Button `danger` (no `tone` prop); Badges validated.
- PWA assets: deterministic PNG icon generator (`tools/gen-icons.mjs`,
  zero-dep Node/zlib), verified PNG headers, `favicon.svg`, manifest paths
  fixed (`./icons/icon-192.png`), `public/sw.js` cache-first shell, SW
  registration + `applyVisualSettings` bootstrap in `main.tsx`.
- Error boundary (`PageBoundary`) + `ErrorBoundaryFallback` in `App.tsx`.
- Tests: textdiff (alignment/cases), grammar rules (per-rule + observability),
  scoring (levels/streaks/topics), SRS math, exercise answering + tiles,
  image pipeline on a synthetic sheet (18 components, 3 lines, low skew),
  audio VAD/metrics on synthetic PCM, utils (normalise, shuffle determinism).
- README (feature map, privacy, determinism, limits, licences incl. the
  CC-BY-NC note for the vosk model, deployment note).

## Not done yet

- Manual device pass for: camera capture, mic permission flow, canvas
  pointer input across devices, CDN engine loads (documented in-app; CI
  cannot exercise them).
- Deployment decision (Vercel Hobby etc.) — needs user sign-off (publishing
  rule).

## CI history (local-run of the loop)

Runs and what each round taught (each ~1 push):
1. `39549961893` first failure — truncated `out.push(` in PREP-006.
2. `39552466995` 27 strict errors — Token offset API, chart props
   (`items`/`points`), `metrics` field, session fields, srs module path,
   excerpt fill, re-exports from appstore.
3. `39553632976`/`39553948046` missing `asrEngine` field once more.
4. `39554999905` → `39555520157` → `39555852407` → `39556112528` GREEN:
   the substantive finds were (a) the TRIM_CHARS regex class was silently
   wrong because an unescaped `]` closed it early — commas and trailing
   punctuation survived token cleanup; (b) streaks keep a yesterday-run
   alive until today closes (documented in tests); (c) sentence-start words
   are skipped by the spelling rule; (d) "explain me" fires PREP-009, and
   PRN-001 looks left past authored connector-skip words for its
   preposition ("between you and I").

## Next action

Real-device checks (camera/mic/canvas/CDN engine init), then deployment
after the user approves.
