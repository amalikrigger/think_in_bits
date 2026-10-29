# BitBlitz

A live classroom quiz game for `thinkinbits.site/play`. Students join with a code on their
phones, Chromebooks and iPads, pick a nickname and answer timed questions; the projector
shows the lobby, timer, reveal, leaderboard and podium. Quizzes are JSON files that Claude
writes from lesson material.

**Status:** working prototype, local only. Nothing is deployed. See `PLAN.md` for the
decisions and `MORNING-REPORT.md` for what works and what's open.

## Run it locally

Requirements: Node 22 or newer (tested on 24). pnpm comes through Corepack, so nothing
needs a global install.

```bash
cd play-src
corepack pnpm install                               # first time only
corepack pnpm --filter @bitblitz/server setup:dev   # writes the untracked .dev.vars (dev passphrase: bitblitz-dev)
corepack pnpm dev                                   # game server on :8787, web app on :5173
```

Then open:

- **Teacher (projector):** `http://localhost:5173/play/#host`. Log in with `bitblitz-dev`,
  pick a practice sample or upload a quiz, and press **Create game**.
- **Students:** `http://<this-mac's-LAN-IP>:5173/play/` on any device on the same Wi-Fi, or
  scan the QR code in the lobby. For the QR code to work on phones, open the teacher page
  through the LAN IP as well (for example `http://192.168.1.20:5173/play/#host`), because
  the join link uses the address the teacher page was opened with.

If you run `corepack enable` once, you can drop the `corepack` prefix from every command.

## Test it

```bash
corepack pnpm test                               # unit tests: schema, engine (points table, state machine, leak check), server auth, web helpers
corepack pnpm --filter @bitblitz/tools e2e       # end-to-end against the running dev server (needs `pnpm dev`)
corepack pnpm botload                            # 60 simulated players through 10 questions (needs `pnpm dev`)
corepack pnpm screenshots                        # full game through the real UI, 5 device sizes × dark/light OS (needs `pnpm dev` and Google Chrome)
python3 packages/engine/scripts/mutation-check.py packages/engine   # breaks scoring rules one at a time; every one must be caught
```

## Make a quiz

Ask Claude: *"Make a BitBlitz quiz from math/1.3-coordinate-geometry/session-02-circles"*.
The `bitblitz-quiz` skill (`.claude/skills/bitblitz-quiz/`) writes the JSON, validates it
and saves it. To validate any file yourself:

```bash
corepack pnpm validate quizzes-private/my-quiz.json
```

- Format: `packages/schema/src/quiz.ts` (source of truth) and `packages/schema/quiz.schema.json`.
- Prompt for any LLM: `packages/schema/prompts/quiz-from-lesson.md`.
- **This repository is public.** Real quizzes go in `quizzes-private/` (gitignored) and are
  uploaded through the host screen. `samples/` holds low-stakes practice only.

## How it fits together

```
packages/schema   Zod: quiz JSON v1 and every WebSocket message, shared by server and web
packages/engine   the game, as a pure function: step(state, event, now) → { state, messages }
apps/server       Cloudflare Worker + one Durable Object per game (the shell around the engine)
apps/web          React + Vite + Tailwind + Motion, builds to ../play
tools             e2e smoke test, bot load test, screenshot sweep
samples           public practice quizzes (+ media/)
```

- **The server is the authority.** It holds the answers; players never receive answer data
  before the reveal (a unit test checks the full message log, and the e2e test checks the wire).
- **Fair timing.** Response time is measured on the server from when the question opened,
  minus half the player's median ping (capped at 1 s).
- **Reconnect.** Joining issues a token kept in the browser; a refresh, a sleeping laptop or a
  Wi-Fi drop resumes the same player with the same score.
- **Teacher auth.** A passphrase whose PBKDF2 hash is a Worker secret (`HOST_PASSPHRASE_HASH`),
  plus `SESSION_SECRET` for session tokens. Missing secrets refuse every login (fail closed).
  Failed logins are rate limited per IP. Create a hash with
  `corepack pnpm --filter @bitblitz/server hash-passphrase "your passphrase"`.
- **Privacy.** The cloud only ever holds nicknames and game codes. A game and everything in
  it is deleted after 6 hours without activity. The results CSV has nicknames only.

## Build

`corepack pnpm build` writes the static app to `../play/`. That folder ignores itself in git
(`play/.gitignore` is written by the build) so it can't ship to the live site by accident
before there is a deployed game server. Deployment is a separate, unapproved step.
