# Elowen — Status

Updated: 2026-10-21

## Current

Phase: code complete, **pre-verification**. All source pages, engines, data and
tests are written; the first CI run (typecheck + tests + build) has not
happened yet — the phone has no node_modules by user rule, so CI is the only
verifier.

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

- First CI run: `npm ci && npm run typecheck && npm test && npm run build`.
- `git init` / private repo / push (next action).
- Manual device pass for: camera capture, mic permission flow, canvas
  pointer input across devices, CDN engine loads (documented, not CI-able).
- Deployment decision (Vercel Hobby etc.) — needs user sign-off (publishing
  rule).

## Expected first-run friction

Known mismatch candidates for the initial CI push (will be fixed on CI
feedback): strict-mode unused imports in older engine files, exact rule IDs
in tests (PUN-001, TEN-004 wording), measure() on synthetic image CV gates,
and `srsUpdate` clamped-ease edges. Watch `gh run watch` and iterate.

## Next action

git init → commit → `gh repo create mahithpaulin/elowen --private` → push →
watch CI → fix until green → only then classify features in the final report.
