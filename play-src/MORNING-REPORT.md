# BitBlitz: morning report

Overnight build of the prototype in `PLAN.md`, 28–29 Oct 2026, on `feat/bitblitz` in the
`think_in_bits.worktrees/bitblitz` worktree. Nothing pushed, deployed or created on Cloudflare.
No existing site page was touched.

## First, one thing that needs your decision

**Git lost track of this worktree partway through the night.** The main repo's
`.git/worktrees/` folder disappeared around 00:43 on 29 Oct, while the main checkout moved
from `ba4828d` to `bbf8435`. I didn't do either, and neither review agent touched git. Since
then, `git` inside this folder says `fatal: not a git repository`.

- **Safe:** branch `feat/bitblitz` with all milestone commits (tip `ae32575`), and every
  change made after that, which is on disk in this folder, uncommitted.
- **Not committed yet:** the adversarial-review fixes and the walkthrough fixes (everything
  after M7). I need git working again to commit them.
- **The repair writes into the main repo's `.git`**, which I was told not to touch, so it's
  waiting for your go-ahead. The low-risk fix recreates
  `think_in_bits/.git/worktrees/bitblitz/` (three small files pointing at `feat/bitblitz`).
  Then `git reset` (mixed: it keeps every file) runs in this folder to rebuild the index.
  After that, the uncommitted work shows up as normal changes, and I commit it as "BitBlitz
  review: adversarial fixes".
- Worth checking what removed the folder (`git worktree prune`, or a cleanup script in another
  session?), so it doesn't happen again to an active worktree.

## What works (verified, not assumed)

Everything below was run on the final code, after the review fixes.

| Check | Result |
|---|---|
| Unit tests `corepack pnpm test` | **212 passing**: schema 18, engine 122, server 23, web 49 |
| Typecheck, all 5 packages | clean |
| Mutation check (scoring/engine rules broken one at a time) | **19/19 caught** |
| End-to-end vs local Worker + Durable Object (`tools/e2e-smoke.ts`) | **38/38** |
| 60-bot load, 10 autoplay questions (`pnpm botload`) | **PASS**: 60/60 at podium, 0 dropped, 600/600 acks, p50 4 ms, **p95 9 ms** (target < 300) |
| UI sweep through the real app (`pnpm screenshots`) | **399 screenshots**, 320 px phone to 1920 projector, iPad both ways, 1280×720 and 1366×768 projectors, dark and light OS: no sideways scroll, nothing clipped or covered, nothing hidden under the control bar, **0 console errors** |
| Hands-on walkthrough in your Chrome | see below |

**What's built:** quiz JSON v1 with plain-language validation; the `bitblitz-quiz` skill and
an LLM prompt; a pure engine implementing every rule in the points table; one Durable Object
per game, with hibernating WebSockets, alarms, reconnect by token and 6 h idle deletion;
passphrase auth (PBKDF2, fail-closed, rate limited); and every host and player screen in the
plan. The teacher controls are kick, rename, pause, skip, end early, lock, reveal now, autoplay
and sound. The game also has teams, late join, a profanity filter, generated nicknames,
images and code blocks in questions, KaTeX, music slots (silent until you supply files), an
answer-review screen and a CSV export with nicknames only.

**Walkthrough in Chrome** (host plus two student tabs on separate origins):
1. Login.
2. A broken quiz was pasted and reported in plain language ("Question 1: single choice needs
   exactly one correct answer", the time-limit problem, the true/false problem).
3. The radians sample showed its preview with the answers marked.
4. Lobby with the code and QR.
5. "sh1t" was refused as a nickname; Ada and Bo joined.
6. A settings toggle worked; countdown ran.
7. Answers scored ("+722, Speed 622 · First 100").
8. A student ran out of time and saw "Time's up, 722 behind Ada".
9. Refreshing Ada's tab mid-question resumed the same seat.
10. With both answered, the reveal fired immediately.
11. Pause froze the clock and locked student tiles.
12. End early asked for confirmation; then the podium, the answer review, and the final
    student screens.

The walkthrough found two problems, both fixed and re-checked in Chrome:
- **A finished game looked broken on phones:** a red "Disconnected" badge appeared when the
  socket closed normally at the end.
- **Fractions were unreadably small** on answer tiles (π/3 as script-size text); they now
  render at full size.

## Adversarial review (your mid-run request)

Two reviewers ran on **Fable**, each owning one half of the code, with no git access.

**Backend:** 15 bugs fixed, each with a test that failed first. The ones that matter most:
- **High: login rate limit bypass.** A parallel burst of wrong passphrases got unlimited
  guesses, because each attempt was only recorded after the slow hash. Attempts now count the
  moment they're admitted.
- **High: Next or Skip while paused froze the game** on the next countdown.
- Autoplay toggled while paused was ignored on resume.
- WebSocket message floods and oversized frames were unthrottled (now a per-connection budget
  and an 8 KB cap).
- Every join pinged the whole room, so work grew with the square of class size (now only the
  newcomer is pinged).
- Late joiners could outrank players who had tried and missed.
- Ranks went stale after a kick.
- Blank or look-alike nicknames such as braille blanks and fullwidth "Ａｄａ" were accepted.
- A player socket could become host.
- Media files with spaces in their names failed to upload.

**Frontend:** 20 fixes. The ones that matter most:
- **High: on 1366×768 and 1280×720 projectors, tiles were hidden under the fixed control
  bar.** Every screen is now header, content and footer, with type that scales to the viewport.
  The sweep asserts that the projector stage never scrolls.
- **High: on a phone or iPad host, the control bar wrapped over the content.** Secondary
  controls now collapse into "More…", and a presentation clicker works (→ for Next, Space for
  pause).
- **High: a stale saved seat or game hung on "Joining…" forever.** It now detects an expired
  game and offers a way out.
- **High: a dead socket on sleeping or flaky Wi-Fi silently dropped taps.** It now detects the
  drop, warns, and reconnects.
- Double taps no longer send twice.
- Settings number fields can be typed into.
- The switch knobs render inside their pills.
- Confetti no longer re-fires.
- Removing a player and cancelling a game now ask for confirmation.
- Screen-reader announcements are fixed.

**Student download size halved:** 266 KB to 133 KB gzipped, because teacher screens and KaTeX
now load only when needed.

## How to run it

See `README.md`. In short, from `play-src/`:
```bash
corepack pnpm install
corepack pnpm --filter @bitblitz/server setup:dev    # dev passphrase: bitblitz-dev
corepack pnpm dev                                    # :8787 server, :5173 web
```
Teacher: `http://<mac-LAN-IP>:5173/play/#host`. Students scan the QR code or open
`http://<mac-LAN-IP>:5173/play/`. Open the teacher page via the LAN IP so the QR code points
somewhere phones can reach.

## Screenshots

`screenshots-selected/` holds 18 representative shots (projector lobby, image question on a
1366×768 projector, reveal, leaderboard, podium, iPad host, phone host, 320 px student
screens, offline state, stress test). The full 399-shot sweep is regenerated with
`pnpm screenshots` and stays out of git (about 20 MB).

## Deviations from the plan, owned

- **pnpm isn't installed** on this Mac. Everything runs as `corepack pnpm` (pnpm 10.34.9,
  pinned, also a local dev dependency so root scripts work). I didn't run `corepack enable`,
  because it changes global Node. Run it yourself if you want plain `pnpm`.
- **Playwright drives your installed Google Chrome** (headless, throwaway profile) instead of
  downloading a browser into `~/Library/Caches`.
- **Gate slip:** I committed M5 before noticing `pnpm -r test` failed. The web package had no
  tests, and vitest treats "no tests" as a failure. Fixed in the next commit with real tests.
- **`play/` (the build) ignores itself in git**, so a merge can't publish a page with no game
  server behind it. Delete `play/.gitignore` when you deploy.
- **The explanation slide is shown on the reveal screen** rather than as a separate phase.
  It's simpler and still honours the setting.
- **6 answers need 6 tiles:** I added amber ★ and pink ⬢ to the brand's four colours.

## Open questions for you

1. **The git repair above.** Yes or no?
2. **Ending early during an open question drops the answers already given to it unscored.**
   Keep that, or score what's in?
3. **Hidden student tabs.** A phone that locks for 20 s or more is reconnected when it wakes,
   and keeps its score. That's fine, but a student who leaves the tab mid-question doesn't
   hold up the "everyone answered" early close. Good?
4. **The light OS setting renders the same dark brand.** Do you want a light "bright room"
   projector theme later?
5. **School network test** (your morning item): WebSockets to `workers.dev` from a Chromebook
   on school Wi-Fi decide whether we need the long-polling fallback.

## Known limits and next steps

- **Code guessing and join spam:** anyone with a 6-digit code can join up to the lobby
  capacity, and flood limits are per connection, not per IP. That's fine for a prototype;
  add per-IP limits before wide use.
- **Cyrillic look-alike nicknames** ("Аda") still pass as different from "Ada".
- **Every event writes the full game state.** That's fine at 60 players; revisit before
  300-player games.
- **Poppins loads from Google Fonts.** A filtered school network falls back to the system font.
- **Not built tonight, as planned:** deployment, D1 library, R2 media, CSV import, roster
  mode, homework mode, real music, design-tool polish.
- **Suggested next:** deploy to a staging `workers.dev` and test on school Wi-Fi; a
  question-bank picker; per-question analytics over time; per-IP abuse limits; a confusables
  table for nicknames.
