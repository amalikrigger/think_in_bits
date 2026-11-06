# BitBlitz: ship status

## Next session: start here (handoff, 6 Nov 2026)

**Where things are:** `feat/bitblitz` on GitHub holds everything, up to the commit that added
this handoff. Amali's Mac worktree (`think_in_bits.worktrees/bitblitz`) matches it once pulled.
Nothing is deployed, and
`main` and the live site are untouched (`main` has moved on with lesson work; merging
BitBlitz in later adds files under `play-src/`, `.claude/skills/bitblitz-quiz/` and
`.github/workflows/`).

**How to start:**
- Run Claude in the worktree on the Mac. Cloud sessions can't see the Mac, so push any local
  work first; the Claude GitHub App is now installed on `think_in_bits`, so a cloud session
  can push back.
- Read, in this order: this file → `QA-REPORT.md` (reviews, decisions, test evidence) →
  `DEPLOY.md` → `PLAN.md` (the spec).
- Checks before changing code: `corepack pnpm install && corepack pnpm test` (286 tests);
  CI runs the same on every push.

**Next, in order:**
1. **First deploy, as a rehearsal with no students** (`DEPLOY.md`). Only Amali can start it,
   because it needs `wrangler login` on the Mac. Clear the five blockers below and record the
   results here.
2. **School Wi-Fi test:** a Chromebook and a phone against the deployed server. This decides
   whether the long-polling fallback is needed. Then lower the latency cap to 0.5 s if real
   pings allow (`PLAN.md` rule 6).
3. **Monday 9 Nov:** the warm-up quiz `quizzes-private/1.4-s2-warm-up.json`, 8 questions,
   validated and math checked. It was sent to Amali as a file because it's gitignored. Save
   it into `play-src/quizzes-private/` on the Mac.

**Loose ends, all optional:**
- **Video:** re-record the narrated walkthrough (`tools/demo-video.ts`, recorded 5 Nov at
  `85cc819`) to show the Players panel and the spoken answer tiles.
- **Safari:** test on a real iPad. The tooling only covers Chromium.
- **Exceptions:** the five below come due on 2026-12-01.


**Not live.** Readiness record for the first deploy, checked against `gcoat-ai/SHIP_READINESS.md`
on 6 Nov 2026 (code at the commit holding this file). The steps are in `DEPLOY.md`.

## Exposure tier: S2

BitBlitz owns a backend with an authenticated host, which makes it at least S1. Its users are
16- and 17-year-olds in a live lesson, and despite the "not your real name" hint, some will type
their real names as nicknames. That is personal data about minors, so the higher tier applies
(override rule: when in doubt, tier up).

## Gates

### Passed (with evidence)

| Gate | Evidence |
|---|---|
| A · artifact traceable to a commit | `/api/health` returns `version` = the deployed short SHA (`production.integration.test.ts`); the published page carries `<meta name="bitblitz-build">`; `deploy:production` refuses uncommitted changes |
| A · quality gates in CI | `.github/workflows/bitblitz.yml`: typecheck, 286 unit and integration tests, 25/25 mutants, samples. [Run #2](https://github.com/amalikrigger/think_in_bits/actions/runs/42184410360) green |
| B · secrets audit (repo and config) | No `.dev.vars` or secret value anywhere in git history; `wrangler.toml` holds no secrets; production secrets go in through `wrangler secret put` from stdin (DEPLOY.md); `secret list` check at deploy |
| B · server-side validation | Zod on every WebSocket message and every quiz upload; 8 KB frame cap; image names validated by a rule shared with the upload route |
| B · negative-path authorization | No token, forged token, expired token, and another game's host key, each shown to fail (`production.integration.test.ts`); a player socket can't run host commands (`game-flow.integration.test.ts`); wrong host key closes the socket, and the CSV is refused without the key (e2e) |
| B · tenant scoping at the data layer | One Durable Object per game, so storage is isolated per game by the platform; a cross-game host key is refused (test above) |
| B · authorization at the API boundary | Every host route checks the session or host key on the server (`index.ts`, `game-room.ts`); the UI hides nothing that the server allows |
| B · dependency audit | `pnpm audit --prod`: no known vulnerabilities (6 Nov 2026) |
| B · security headers (API) | `nosniff`, `Referrer-Policy`, HSTS and a `default-src 'none'` CSP on every Worker response (tested); uploaded media has its own inert CSP |
| B · security headers (screens) | Content-Security-Policy and referrer policy as `<meta>` tags in the published build; a full game played through the published build had no CSP violations (`tools/rehearse-published.ts`, 6 Nov) |
| C · rate limiting on auth | Login: 5 tries then 429, and parallel bursts counted before the hash (e2e); every socket has a message budget and closes with 4008 on floods (e2e) |
| C · payload caps | Quiz 512 KB, WebSocket frame 8 KB, image 1 MB, 40 images per game; Workers platform limits on CPU and time |
| C · spend ceiling | Free plan: usage stops at the daily limits, it is never billed. Checked on the account at deploy (DEPLOY.md, first-time step 1) |
| D · logs: structured, with a correlation ID, and no secrets or PII | Unhandled errors log one JSON line with `event`, Cloudflare's `ray` ID, method, path and stack, and never headers or bodies (`index.ts`); Workers Logs enabled in `[env.production]` |
| D · unhandled exception surfaces with a stack | Stack plus method and path. The request body is deliberately not logged, because it carries passphrases and nicknames |
| E · named first responder and first move | Amali, in the room. The first moves are in DEPLOY.md, "In class" |
| F · backups and restore | Nothing needs a backup: a game lives for one lesson and is deleted 6 h after its last activity (`game-room.ts`). The lasting record is the results CSV the teacher downloads |
| F · migrations | One migration (`v1`, new SQLite classes). Undoing it deletes only per-lesson game state, which is accepted |
| F · expected load, first bottleneck, 10× cost | Estimate: a class of 30 over 10 questions writes about 1,000 state rows (join, 2 latency pongs and 1 answer per player per question, plus timers) and sends about 1,000 WebSocket messages. Measured locally: 60 bots, p95 7.6 ms. **First bottleneck:** rows written per day, because every event, including every pong, rewrites the whole game state. At 10× (ten classes a day, ~10k rows) it should stay within Free-plan limits, at $0. If the limit is ever hit, the service stops for the day rather than billing |
| Accessibility (not a SHIP_READINESS gate) | axe, WCAG 2.1 A/AA: 0 violations across 399 screens |

### Exceptions (risk accepted, owner, revisit)

| Gate | Risk | Owner | Revisit |
|---|---|---|---|
| A · prod deploy requires a passing CI run, enforced (S2) | Deploys are run by hand. Step 1 of the runbook says "CI green", but nothing enforces it | Amali | Before BitBlitz is used by a second class, or 2026-12-01 |
| B · HSTS and `nosniff` on the screens | GitHub Pages can't send response headers. The CSP is in the page, but HSTS and `nosniff` aren't. Pages forces HTTPS | Amali | If `/play` moves to Cloudflare (Workers static assets would allow every header) |
| C · rate limiting on public writes | Joining is public: anyone with a 6-digit code can fill a lobby up to its capacity. There are per-connection limits, but no per-IP limit | Amali | Before any use beyond one class with a code shown on a projector |
| D · log retention | The plan's default Workers Logs retention (days). A deliberate choice: games last one lesson | Amali | 2026-12-01 |
| E · error-rate and p95 alarms, a read channel, fired once | No automated alarms. The first responder is in the room, watching the game live | Amali | 2026-12-01, or before anyone uses it without Amali present |

### Blockers before students use it

| Gate | What clears it |
|---|---|
| A · deploy is one reproducible command, proven | Run DEPLOY.md once against Cloudflare, then confirm `/api/health` shows the commit |
| A · rollback written **and executed once** | During that first deploy: deploy, deploy again, run `rollback:production`, check the health check |
| B · OWASP Top 10 pass against the **running** system (S2) | Two adversarial reviews covered the local stack (29 Oct, 5 Nov). Repeat the pass against the workers.dev URL and the live `/play` page before students join, and record the date and findings here |
| E · uptime check | A free monitor (for example UptimeRobot) on `/api/health` and `https://www.thinkinbits.site/play/`, pointed once at a bad URL to prove the alert arrives |
| PLAN.md · school Wi-Fi test | A Chromebook and a phone on school Wi-Fi play a game against the deployed server. This decides whether the long-polling fallback is needed |

## The call: don't ship yet

The code side is ready. What's left can only happen against a real deploy, and only Amali
can start that. Do the first deploy as a rehearsal, with no students: clear the five
blockers, then record the results here.

Rollback, written out exactly, for once it's live:

`corepack pnpm --filter @bitblitz/server rollback:production && git revert --no-edit <publish commit> && git push origin main`
