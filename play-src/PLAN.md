# BitBlitz — live classroom quiz game on thinkinbits.site

Revised 2026-10-28 in the pilot session. This is the plan the overnight build session follows in `think_in_bits`. The build session also keeps a copy at `play-src/PLAN.md` on its branch.

## Context

Amali wants a Kahoot-style game that feels better and looks like thinkinbits. Students join with a code on their own phones, Chromebooks and iPads, pick a nickname, and answer timed questions: single choice, true/false, and multi-select. Questions can carry images and other media. The teacher's screen shows the lobby, timer, results, leaderboard and podium. Quizzes are plain JSON, which Claude generates from Amali's lesson material. There is no builder GUI yet.

The goal tonight is a **working prototype, built overnight and reviewed in the morning**, not a finished product.

## Decisions (Amali, 2026-10-23 to 28)

| Topic | Decision |
|---|---|
| Devices | Phones, Chromebooks, iPads |
| Where | `thinkinbits.site/play` (static screens on Pages) + Cloudflare Worker with one Durable Object per game, on a free `workers.dev` address |
| Name | BitBlitz |
| Front end | React + Vite + Tailwind + Motion, built to `/play` |
| Identity | Join code → pick a nickname. Optional roster mode (opaque codes) comes later |
| Privacy | The cloud holds nicknames and codes only, never real names (pilot's student-data rule) |
| Quiz format | JSON first, CSV later. Claude generates it; upload is the only authoring path |
| Look | thinkinbits brand (below). Design lives in code first; Stitch/Figma/image-gen polish comes after the prototype |
| Music | Slots in the JSON and settings now; Amali supplies files later |
| Branching | Separate branch and git worktree: other work is happening on the site |

## Brand and look

Tokens from `think_in_bits`: background `#0a0a0a` → `#1a1a2e` gradient, surface `#1a1a1a`, primary cyan `#00e5ff` (dark `#0099cc`), accents coral `#ff6b6b`, teal `#4ecdc4`, violet `#a78bfa`, text `#ffffff`, muted `#666666`.

- The four answer tiles use cyan, coral, teal and violet, each with a distinct shape (▲ ◆ ● ■), so color is never the only cue.
- Dark first, with large type, glow on the active element, and spring animations. The timer is a ring. The leaderboard reorders with animation. The podium builds 3rd → 2nd → 1st with confetti.
- Phone screens are one-thumb, with big tap targets. The projector view reads from the back of the room.
- Accessibility: contrast checked, `prefers-reduced-motion` respected, screen-reader labels on tiles, no flashing.
- The build session reads the existing site (CSS tokens, fonts, shared header) and reuses them. It must not edit existing site pages.

## Points system (fully defined)

All math runs on the server, in the pure engine.

1. **Base points** per question: `standard` 1000, `double` 2000, `none` 0 (set per question or as a default).
2. **Speed factor** = `1 − (t / T) / 2`, where `t` is response time and `T` is the time limit. Answering instantly scores 100% of base; answering at the last moment scores 50%.
3. **Fair timing:** `t` is measured on the server from the moment the question opens, minus the player's estimated one-way latency (half the median ping, capped at 1 s), so slow Wi-Fi does not cost points. Answers after `T` score 0.
4. **Single and true/false:** `round(base × speedFactor)` if correct, otherwise 0.
5. **Multi-select (Kahoot style):** `base × (correct picks ÷ number of correct options) × speedFactor`. Wrong picks cost nothing (Amali's choice). Known weakness: ticking every box scores full marks, so a **streak only counts when the selection is exactly right**, and a setting `multiPenalty` (default off) can subtract wrong picks later.
6. **Fastest-finger bonus:** the first, second and third correct answers get +100, +60 and +30. Toggleable.
7. **Streak bonus:** from the 2nd correct answer in a row, +50 × (streak − 1), capped at +250. A wrong or missing answer resets it. Toggleable.
8. **Per-question maximum:** 1000 + 100 + 250 = 1350 on standard, 2350 on double.
9. **Ties** on the leaderboard break by lower total response time, then by earlier join.
10. **Teams:** team score = average of members' scores (default) or the sum, set per game.
11. **Feedback shown to each student** after the reveal: "+1,085 — Speed 912 · First 100 · Streak +73"-style breakdown, current rank, and points behind the next player.
12. **Backlog ideas:** catch-up boost for the bottom third, wager questions, "last place gets a mercy bonus", and per-answer partial credit on estimation questions.

The engine ships with a test table covering every rule above, including edge cases: answer at t=0, at t=T, one millisecond late, the latency cap, a tie, a multi-select with all boxes ticked, a streak reset, and double points.

## Game flow and settings

`lobby → countdown → question → reveal → leaderboard → … → podium → ended`, a closed state machine with named rejection outcomes (`too_late`, `already_answered`, `not_accepting`).

**Settings** live in the quiz JSON (`settings`) and can be changed in the lobby while students are joining:

- **Autoplay:** after the reveal and leaderboard, advance on a timer (`revealSec`, `leaderboardSec`) with no clicks; otherwise the teacher presses Next.
- Time limit override · points multiplier · show question and answers on student devices (or shapes only) · shuffle questions and answers · generated nicknames only · profanity filter · late join · streak and fastest-finger bonuses · teams (auto-balance, size) · lobby capacity · lock the room · sound and music on/off · show the leaderboard every N questions · explanation slide after reveal.
- **Teacher controls:** kick, rename a player, pause/resume, skip, end early, lock the room, reveal now.
- **Reconnect:** a dropped player resumes with the same nickname and score (better than Kahoot).

## Quiz JSON v1

```json
{
  "schemaVersion": 1,
  "title": "1.3 Circles: warm-up",
  "description": "Equation of a circle, tangents",
  "settings": { "autoplay": true, "revealSec": 6, "leaderboardSec": 6,
                "fastestFinger": true, "streaks": true, "showAnswersOnDevice": true },
  "music": { "lobby": "lobby.mp3", "question": "tick.mp3", "podium": "win.mp3" },
  "defaults": { "timeLimitSec": 20, "points": "standard" },
  "questions": [
    { "type": "single", "prompt": "Centre of $(x-2)^2+(y+3)^2=25$?",
      "media": { "type": "image", "src": "circle.png", "alt": "Circle on axes" },
      "answers": [ {"text": "(2, −3)", "correct": true}, {"text": "(−2, 3)"}, {"text": "(2, 3)"}, {"text": "(−2, −3)"} ],
      "explanation": "Signs flip inside the brackets." },
    { "type": "true_false", "prompt": "A tangent meets a circle at exactly one point.", "correct": true, "timeLimitSec": 10 },
    { "type": "multi", "prompt": "Which points lie on $x^2+y^2=25$?", "points": "double",
      "answers": [ {"text": "(3, 4)", "correct": true}, {"text": "(5, 0)", "correct": true}, {"text": "(4, 4)"}, {"text": "(1, 1)"} ] }
  ]
}
```

- **Media:** `image` (URL or uploaded file), later `audio`, `video`, and `code` blocks (language + source). Prompts and answers support KaTeX math (`$…$`), which the math decks already use.
- **Validation:** 2–6 answers; single has exactly one correct; multi has one or more; true/false takes a boolean; time 5–240 s. Upload shows per-question errors in plain language ("Question 3: single choice needs exactly one correct answer") and a preview before saving.
- **Ships with:** `quiz.schema.json`, an LLM prompt template, and a project skill **`bitblitz-quiz`** (in the repo's `.claude/skills/`). The skill turns a lesson folder or notes into a validated quiz JSON, and the AS Math sessions under `think_in_bits/math/` are the intended source.
- **CSV import** (one row per question) is a later add-on built on the same schema.

## System design

```
Host (projector) ─┐                                     ┌─ Durable Object per game: live state, timers, scoring
Phones/Chromebooks┼─ thinkinbits.site/play ── WSS ── Worker ┼─ D1: quiz library, results (Phase 4)
iPads            ─┘                                     └─ R2: media (Phase 4)
```

- **Engine (pure TypeScript):** `step(state, event, now) → { state, messages }`, deterministic with an injected clock and no I/O. The Durable Object is only the shell. The same engine can run on pi-01 later.
- **Server is the authority:** it holds the quiz with its answers, and a player never receives answer data before the reveal (a test asserts this over the full message log). Joining issues a player token, which is how reconnect works.
- **Teacher auth:** passphrase set by Amali (Wrangler secret), hashed, fail-closed, rate limited. Prototype mode: auth is required even locally, with a dev secret in an untracked `.dev.vars`.
- **Contracts:** Zod schemas for the quiz and every WebSocket message, shared by server and web.
- **Public repo warning:** `think_in_bits` is public. Samples committed to the repo contain answers, so they must be low-stakes practice quizzes; real quizzes go in the gitignored `quizzes-private/` and are uploaded.
- **Network risk:** school filters may block WebSockets to `workers.dev`. A Chromebook/phone test on school Wi-Fi comes before the first real class (Amali does it in the morning), with a long-polling fallback ready if needed.

## Repo layout on the branch

```
play-src/
  PLAN.md                 # this plan (tracked copy)
  packages/schema/        # Zod schemas → quiz.schema.json
  packages/engine/        # pure game core + tests
  apps/server/            # Worker + Durable Object (wrangler.toml, local dev only for now)
  apps/web/               # Vite SPA → builds to ../../play/
  tools/botload.ts        # simulated players
  samples/                # 2–3 practice quizzes from AS Math (public-safe)
  quizzes-private/        # gitignored
.claude/skills/bitblitz-quiz/SKILL.md
```

## Overnight execution

- **Branch and worktree:** `feat/bitblitz` in a git worktree at `think_in_bits.worktrees/bitblitz`, cut from `origin/main`. The main checkout is left alone. `docs/` is gitignored on this site, so the plan lives in `play-src/`.
- **Authorization requested with plan approval (Amali, individually):** local commits on `feat/bitblitz` at milestones, installing npm dependencies inside `play-src/`, and running the local dev server and tests. **Not authorized:** pushing, opening a PR, merging, any deploy, creating Cloudflare/GitHub resources, DNS, `wrangler login`, changing existing site pages, reading secrets or student data. Local `wrangler dev` needs no account.
- **Order of work (stop at the first failing gate and write down why):**
  1. Scaffold the workspace and tokens; write `PLAN.md`.
  2. `schema` + validator + the LLM prompt + the `bitblitz-quiz` skill; tests.
  3. `engine`, test-first, including every row of the points table; mutation-style spot checks.
  4. Durable Object shell + Worker routes; WebSocket protocol; reconnect; autoplay; teacher auth.
  5. Host screens (upload, settings, lobby with code, QR and link, question, reveal, leaderboard, podium) and player screens (join, nickname, waiting, answer for each type, feedback, final rank).
  6. Media in questions, sound slots (silent placeholders), polish and animation pass.
  7. Samples from AS Math, a 60-bot load run, a responsive screenshot sweep (320 px to projector width, both light/dark OS settings) with Playwright.
  8. Write `play-src/README.md` and `MORNING-REPORT.md` (what works, what doesn't, how to run, screenshots, open questions, suggestions).
- **Rules for the unattended run:** tests first; commit at each numbered milestone; create files only in `play-src/`, `play/` (build output) and `.claude/skills/bitblitz-quiz/`, and edit no existing site page (no nav link yet); stop and record a blocker instead of improvising around a permission denial; keep `MORNING-REPORT.md` updated as it goes.

## Gaps, risks and suggestions

- **Missing from the ask, added to scope:** reconnect, kick/lock/pause, profanity filter, reduced motion, laptop-sleep resilience, late join, final results export (CSV, nicknames only), an answer-review screen for the teacher (which questions were missed most), and an "explanation" slide.
- **Worth doing next:** per-question analytics in the teacher view; a "question bank → quiz" picker; student-created questions; power-ups and mini-game modes (Gimkit/Blooket style); avatars and unlockable nickname flair; theme packs and seasonal skins; QR join; a homework/self-paced mode with a deadline; roster mode with opaque codes and an in-browser name join (the privacy design is already settled); real-time hints; spoken-question audio for accessibility; physical Pi/ESP32 buzzers; a pi-01 LAN build for when the school Wi-Fi misbehaves.
- **Risks:** school network/filters (test early); public repo (answers in samples); free-tier limits (generous for one class, check before multi-class use); the multi-select "tick everything" exploit (mitigated by the streak rule).
- **Not tonight:** Stitch/Figma/image-generation design passes, real music, CSV import, roster mode, homework mode, the D1 library, deployment.

## Verification (the morning review)

1. `pnpm -r test` passes: scoring table, state machine, schema, auth, and "no answers leak before reveal".
2. `pnpm dev` starts the server and web app; open the host on a laptop and join from 2+ real phones on the same Wi-Fi using the code; play a full 5-question game with autoplay on.
3. `tools/botload.ts` runs 60 bots through 10 questions with no dropped players; p95 answer acknowledgement under 300 ms locally.
4. Screenshot sweep is clean at phone, tablet, laptop and projector widths; no sideways scroll; brand colors match.
5. `git log` on `feat/bitblitz` shows milestone commits; `git status` in the main checkout is unchanged; no existing site file is modified (`git diff origin/main --stat` lists only new files).
6. `MORNING-REPORT.md` lists what works, what doesn't, and the open decisions.

## Setup done by this session on approval (and nothing more)

Approving this plan authorizes only these steps, in order. Each is checked before the next. Existing work in `think_in_bits` is never modified.

1. **Read-only checks in `think_in_bits`:** look for `.claude-write-lock` / `.Codex-write-lock` (ask Amali if either exists), confirm the main checkout's state (it currently has one unpushed commit and untracked `Claude outputs/` and `_render_math.html`, which stay untouched), and confirm `feat/bitblitz` and the worktree path don't already exist.
2. `git fetch origin main` (updates remote-tracking refs only; touches no working files).
3. `git worktree add -b feat/bitblitz ../think_in_bits.worktrees/bitblitz origin/main`. The new branch starts from the remote `main`, in a sibling folder, so the main checkout's files, branch and index are never touched and the unpushed commit is not included.
4. Write this plan to `play-src/PLAN.md` inside that worktree and read it back to confirm it matches. **No commit, no push.** The plan has no secrets or student data (checked before writing).
5. Report the worktree path, the branch, `git status` of both checkouts, and the kickoff prompt below. **This session does not start the build session**; Amali starts it, in the worktree folder, when ready for the overnight run.

## Kickoff prompt (Amali pastes this into a new Claude Code session opened in `think_in_bits.worktrees/bitblitz`)

> You are G-COAT working for Amali in the `think_in_bits` worktree on branch `feat/bitblitz`. Read `GCOAT_IDENTITY.md` and `ENGINEERING_PRINCIPLES.md` in `/Users/amalikrigger/Developer/WebstormProjects/gcoat-ai`, then this repo's own entry instructions. Your task is to build the **BitBlitz prototype** described in `play-src/PLAN.md` in this worktree. That plan is authoritative; follow its "Overnight execution" section exactly, including the authorization limits and the stop-at-failing-gate rule. Work only on branch `feat/bitblitz` in the worktree `think_in_bits.worktrees/bitblitz`; the main checkout has other people's work and must not be touched. Amali approved local commits on that branch, npm installs inside `play-src/`, and local dev servers; everything else (push, PR, deploy, Cloudflare, DNS, secrets, student data, existing site pages) is not approved. Finish with `play-src/MORNING-REPORT.md`.
