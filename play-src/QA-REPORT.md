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
| F6 | Low–medium | A modified phone can delay its latency pongs to claim the full 1 s allowance and take fastest-finger. | **Decision needed** (below) | reviewer probe |
| F7 | Low–medium | The projector leaderboard jumped back to the old order whenever a phone dropped or rejoined. | **Fixed:** the animation is keyed on the standings, not on array identity. | unit test, robot |
| F8 | Low | Answer texts reached phones during the 3 s countdown. | **Fixed:** phones get the prompt only. | engine test, integration test, robot, mutation check |
| F9 | Low | Tied students were told "0 behind" each other. | **Fixed:** the message names the nearest higher score, or nothing. | engine tests, robot, mutation check |
| F10 | Low | Dollar amounts ("$3 and $12") were garbled into a formula. | **Fixed:** Pandoc-style rule, `\$` escape, and the rule written into the LLM prompt. | unit tests, robot |
| F11 | Low | A 0× points multiplier still awards First and Streak bonuses. | **Decision needed** (below) | reviewer probe |
| F12 | Low (dev only) | Under `wrangler dev`, `CF-Connecting-IP` is client-supplied, so the login limit can be sidestepped. Production Cloudflare sets the header itself. | **Decision needed** (below) | reviewer probe |
| – | Low | "And N more players" counted only the top 10 the server sends. | **Fixed:** counts the whole class. | unit test |
| – | Low | Phones spoiled the podium by showing "You finished 1st" while the projector was still building it. | **Fixed:** phones say "Look up at the podium!" until it is built. | robot, video |
| – | Low | The quiz validator accepted image names the upload refuses (`circle+1.png`), and also `javascript:` and `data:` links. | **Fixed:** one shared file-name rule, so the problem shows at upload. | schema tests, integration test |
| – | Low | The upload error always said "max 1 MB", whatever the real cause. | **Fixed:** names the allowed types and the size. | – |
| – | Low | The final screen said "of 1 players". | **Fixed** | unit test, robot |
| – | Low | `pnpm validate quizzes-private/x.json` failed from `play-src/`, as the README tells you to run it. | **Fixed:** paths resolve from where the command was typed. | run on all samples |

Found while building the robot: the test client's `waitForPhase` missed a phase that had
already arrived, which could make tests flaky. It now resolves straight away when the
connection is already in that phase.

## Decisions for you (unchanged, with a recommendation)

1. **Latency allowance (F6).** Rule 3 forgives up to 1 s of measured latency, but the client
   controls the measurement.
   - **Recommendation:** order fastest-finger by raw arrival time (keep the allowance for the
     speed score only), and lower the cap to 500 ms after the school Wi-Fi test shows real
     pings.
2. **0× multiplier (F11).** Should a 0× round still award First and Streak bonuses?
   - **Recommendation:** treat 0× as "no points", with bonuses off and streaks untouched, like
     `points: "none"`.
3. **Kick and rename mid-game.** These are only in the lobby UI today. A late joiner with a
   name that slips past the filter can't be removed during the game.
   - **Recommendation:** add the roster panel to the "More…" menu.
4. **Login limit in dev (F12).** This only matters on the classroom LAN dev setup.
   - **Recommendation:** leave it, and deploy before using this with real classes.
5. **Music uploads.** Uploads accept images only, so the music slots can never play yet. This
   is as planned ("Amali supplies files later").

## Verification (final run, on the committed code)

See the end of this file for the numbers from the final run.
