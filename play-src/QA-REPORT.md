# BitBlitz: second adversarial review and QA pass

5 Nov 2026, on `feat/bitblitz` at `8fff3d4` (which includes the local work from the
morning-report session). Work happened in a cloud session on branch
`claude/practical-tesla-67h5fk`. Nothing was deployed, and no existing site page was touched.

## How it was run

1. **Review.** A fresh reviewer agent attacked the code. It had the plan as the spec,
   `ENGINEERING_PRINCIPLES.md`, and the list of what the first review already fixed. It was
   given none of the coordinator's conclusions and could not edit the repo. It reported 12
   findings and 6 smaller items, each with a reproduction script.
2. **Verify, then fix.** Every finding was reproduced again before it was fixed. Each fix
   started with a test that failed on `8fff3d4` and passes now.
3. **Test layers added.**
   - **Integration:** the real Worker and Durable Object, booted inside `pnpm test` through
     Wrangler's test harness (`apps/server/test/`). No dev server is needed.
   - **Robot:** classroom edge cases driven through the real UI in a browser
     (`tools/robot-edge-cases.ts`).
   - **Mutation:** four new mutation checks guard the new engine rules.
4. **Video.** The narrated walkthrough was re-recorded with the fixes, plus a closing chapter
   on the review.

## Findings

| # | Severity | Finding | Status | Proven by |
|---|---|---|---|---|
| F1 | Critical | The Vite dev server served the whole repo to anyone on the Wi-Fi. That covered `.dev.vars`, `quizzes-private/`, and the local Durable Object database holding every live game's answers. | **Fixed:** `server.fs.allow` narrowed to what the app needs, and `fs.deny` added for secrets and state. | e2e check, robot check, live check in the video |
| F2 | Medium–high | On a device that blocks storage (Safari "Block all cookies", managed Chromebooks), a Wi-Fi blip lost the student's seat and score. | **Fixed:** the seat is held in memory for the page; storage only carries it across a refresh. | `storage.test.ts`, robot (storage blocked, Wi-Fi off and on) |
| F3 | Medium | A Reveal or Next press arriving just after the clock or autoplay moved on skipped a screen. | **Fixed:** Next, Skip and Reveal now carry the screen they were pressed on, and stale presses are refused as `out_of_date`. | engine tests, integration test, mutation check |
| F4 | Medium | A student dropping out or being kicked ended the teacher's pause and revealed the answer. | **Fixed:** the early close waits for resume. | engine tests, integration test, mutation check |
| F5 | Medium | A student who typed the code was trapped on a finished game's final screen, even after a refresh or the next lesson. | **Fixed:** "Join another game" button, and the seat is cleared once the game ends. | robot |
| F6 | Low–medium | A modified phone can delay its latency pongs to claim the full 1 s allowance and take fastest-finger. | **Decided and built (6 Nov):** fastest-finger is ordered by arrival at the server. | scoring test, mutation check |
| F7 | Low–medium | The projector leaderboard jumped back to the old order whenever a phone dropped or rejoined. | **Fixed:** the animation is keyed on the standings, not on array identity. | unit test, robot |
| F8 | Low | Answer texts reached phones during the 3 s countdown. | **Fixed:** phones get the prompt only. | engine test, integration test, robot, mutation check |
| F9 | Low | Tied students were told "0 behind" each other. | **Fixed:** the message names the nearest higher score, or nothing. | engine tests, robot, mutation check |
| F10 | Low | Dollar amounts ("$3 and $12") were garbled into a formula. | **Fixed:** Pandoc-style rule, `\$` escape, and the rule written into the LLM prompt. | unit tests, robot |
| F11 | Low | A 0× points multiplier still awards First and Streak bonuses. | **Decided and built (6 Nov):** 0× is a no-points round. | scoring and engine tests, mutation check |
| F12 | Low (dev only) | Under `wrangler dev`, `CF-Connecting-IP` is client-supplied, so the login limit can be sidestepped. Production Cloudflare sets the header itself. | **Decided (6 Nov):** left as is. Deploy before real classes. | reviewer probe |
| – | Low | "And N more players" counted only the top 10 the server sends. | **Fixed:** counts the whole class. | unit test |
| – | Low | Phones spoiled the podium by showing "You finished 1st" while the projector was still building it. | **Fixed:** phones say "Look up at the podium!" until it is built. | robot, video |
| – | Low | The quiz validator accepted image names the upload refuses (`circle+1.png`), and also `javascript:` and `data:` links. | **Fixed:** one shared file-name rule, so the problem shows at upload. | schema tests, integration test |
| – | Low | The upload error always said "max 1 MB", whatever the real cause. | **Fixed:** names the allowed types and the size. | – |
| – | Low | The final screen said "of 1 players". | **Fixed** | unit test, robot |
| – | Low | `pnpm validate quizzes-private/x.json` failed from `play-src/`, as the README tells you to run it. | **Fixed:** paths resolve from where the command was typed. | run on all samples |

Found while building the robot: the test client's `waitForPhase` missed a phase that had
already arrived, which could make tests flaky. It now resolves straight away when the
connection is already in that phase.

## Decisions (Amali, 6 Nov 2026: all four recommendations)

1. **Latency allowance (F6).** Fastest-finger is now ordered by when answers reached the
   server, and the latency allowance counts towards the speed score only.
   - **Still to do:** lower the 1 s cap to 0.5 s once the school Wi-Fi test shows real pings.
     It's recorded in `PLAN.md` rule 6.
2. **0× multiplier (F11).** 0× is a no-points round, like `points: "none"`: no bonuses,
   streaks left as they were, and no time counted towards the tie-break. Both screens say
   "no points".
3. **Kick and rename mid-game.** A **Players** button in the teacher's control bar (inside
   "More…" on a phone) opens a panel to rename or remove any student while the game runs.
   The clicker keys are off while it's open, and Escape closes it.
4. **Login limit in dev (F12).** Left as is. Production Cloudflare is not affected; deploy
   before real classes.
5. **Music uploads.** Unchanged, as planned. Uploads accept images only until you supply the
   music files.

## Verification

**Latest, 6 Nov 2026, on `94f3d5c`.** These are the final runs. The app's behaviour has not
changed since; later commits touched only docs.

| Check | Result |
|---|---|
| `pnpm -r test` | **286 passing:** schema 21, engine 136, web 89, server 40. The server total includes 17 integration scenarios on the real Worker and Durable Object. |
| GitHub Actions (`.github/workflows/bitblitz.yml`) | Green on `94f3d5c` ([run #3](https://github.com/amalikrigger/think_in_bits/actions/runs/42185485198)): typecheck, tests, mutation check, samples |
| Typecheck, all 5 packages | clean |
| Mutation check | **25 / 25 caught.** It fails if any mutant is missed or can't be applied, and it works with forced colour output, as on CI. |
| End-to-end (`tools/e2e-smoke.ts`) | **39 / 39** on `94f3d5c` |
| Robot edge cases (`tools/robot-edge-cases.ts`) | **20 / 20** on `94f3d5c`, after 3 clean runs in a row on `f05da97` |
| Layout and accessibility sweep | **399 screenshots,** 320 px to 1920 px, dark and light: no layout findings, **0 axe violations (WCAG 2.1 A/AA)**, 0 console errors (on `f05da97`, the last UI change) |
| Published build rehearsal (`tools/rehearse-published.ts`) | A full game through the `build:publish` output, served as Pages would: no browser errors, no CSP violations |
| 60-bot load, 10 autoplay questions | PASS: 0 dropped, **p95 7.6 ms** (target < 300), on `2c502b1`. Since then the server has only gained response headers and error logging. |

The narrated walkthrough video was recorded on 5 Nov at `85cc819`, and all 102 of its live
checks passed. It doesn't show the Players panel, the spoken answer tiles or the deploy prep.

**Integration tests prove the fixes.** The suite was also run against the original engine
from `8fff3d4`. There, the wire-level regressions for the stale press, the pause dropout and
the countdown answer texts all fail. With the fixes, they pass.

**Not verified:**
- real phones and iPads on school Wi-Fi
- a real screen reader (VoiceOver, TalkBack): the accessibility tree and axe were checked,
  but nobody listened to it
- a deployed Cloudflare Worker (Durable Object eviction, storage limits)

The robot and the video drive Chromium, not Safari.

## Notes for running the tools in a cloud container

- **Browser:** set `BITBLITZ_CHROME=/opt/pw-browsers/chromium`.
- **Proxy:** the container's egress proxy doesn't bypass the LAN address. Set
  `BITBLITZ_CHROME_ARGS=--no-proxy-server`, or the teacher page's game socket gets a 403 from
  the proxy. Real classroom networks (192.168/16, 10/8) are bypassed already, and a Mac has
  no such proxy.
- **Narration:** Piper narrates with one voice loaded for the whole run (`tools/lib/piper-speak.py`).
  Loading the voice per line cost about 2 s each time, which let a question run out of time
  on camera.
