# Mutation spot check: breaks one scoring/engine rule at a time and confirms the test
# suite notices. Usage (from packages/engine): python3 scripts/mutation-check.py .
# Each file is restored after its run, even on failure.
import os, re, subprocess, sys, shutil, pathlib
root = pathlib.Path(sys.argv[1])
mutations = [
  ("speed factor /2 → /3", "src/scoring.ts", "return 1 - t / timeLimitMs / 2;", "return 1 - t / timeLimitMs / 3;"),
  ("latency cap 1000 → 2000", "src/scoring.ts", "export const LATENCY_CAP_MS = 1000;", "export const LATENCY_CAP_MS = 2000;"),
  ("partial multi counts as exact", "src/scoring.ts", "const exact = wrongPicks === 0 && rightPicks === correct.size;", "const exact = rightPicks === correct.size;"),
  ("fastest finger sorted slowest first", "src/scoring.ts", ".sort((a, b) => a.receivedAt - b.receivedAt ||", ".sort((a, b) => b.receivedAt - a.receivedAt ||"),
  ("streak cap removed", "src/scoring.ts", "return Math.min(STREAK_STEP * Math.max(0, streak - 1), STREAK_CAP);", "return STREAK_STEP * Math.max(0, streak - 1);"),
  ("streak not reset on miss", "src/scoring.ts", "streak: counts ? 0 : streakBefore,", "streak: streakBefore,"),
  ("tie-break ignores response time", "src/views.ts", "b.score - a.score || a.totalResponseMs - b.totalResponseMs || a.joinSeq - b.joinSeq", "b.score - a.score || a.joinSeq - b.joinSeq"),
  ("answer key leaks into public question", "src/views.ts", "    points: effectivePoints(question.points, state.settings.pointsMultiplier),\n  };", "    points: effectivePoints(question.points, state.settings.pointsMultiplier),\n    ...({ correct: question.correct } as object),\n  };"),
  ("pause time counted against student", "src/engine.ts", "if (open && phase === \"question\") open.openedAt += pausedFor;", ""),
  ("double answers allowed", "src/engine.ts", "if (open.answers[player.id]) return \"already_answered\";", ""),
  ("late answers accepted", "src/engine.ts", "if (responseMs > question.timeLimitMs) {", "if (responseMs > question.timeLimitMs + 5000) {"),
  ("kicked token can resume", "src/engine.ts", "if (this.state.bannedTokens.includes(token)) return this.rejectJoin(connectionId, \"kicked\");", ""),
  ("CSV formula guard removed", "src/export.ts", "const safe = /^[=+\\-@\\t\\r]/.test(value) ? `'${value}` : value;", "const safe = value;"),
  ("Next while paused leaves the game paused", "src/engine.ts", "    this.state.paused = null;\n    this.state.timer = { at: this.now + COUNTDOWN_MS, totalMs: COUNTDOWN_MS };", "    this.state.timer = { at: this.now + COUNTDOWN_MS, totalMs: COUNTDOWN_MS };"),
  ("late joiner owes no time on the tie-break", "src/engine.ts", "totalResponseMs: this.missedTimeMs(),", "totalResponseMs: 0,"),
  ("blank-looking nicknames accepted", "src/nicknames.ts", "if (!VISIBLE.test(nickname) ||", "if (nickname.length === 0 ||"),
  ("look-alike folding removed", "src/nicknames.ts", "    .normalize(\"NFKC\")\n", ""),
  ("leaderboard rank from the stale stored value", "src/views.ts", "    rank: position + 1,\n    previousRank: player.previousRank,", "    rank: player.rank ?? 0,\n    previousRank: player.previousRank,"),
  ("paused timer shows the grace close, not the visible clock", "src/views.ts", "const remaining = visibleEnd !== null ? visibleEnd - frozenAt : (state.paused.remainingMs ?? 0);", "const remaining = state.paused.remainingMs ?? 0;"),
  # Second adversarial review (Nov 2026)
  ("a drop-out ends the teacher's pause", "src/engine.ts", "    if (this.state.paused) return;\n    const { count, total } = this.answerProgress();", "    const { count, total } = this.answerProgress();"),
  ("a stale Next/Skip/Reveal press is obeyed", "src/engine.ts", "      return \"out_of_date\";\n    }", "    }"),
  ("phones get answer texts during the countdown", "src/views.ts", "phase !== \"countdown\" && state.settings.showAnswersOnDevice", "state.settings.showAnswersOnDevice"),
  ("'0 behind' a tied player", "src/views.ts", ".reverse().find((p) => p.score > player.score)", ".reverse().find(() => true)"),
  # Decisions of 6 Nov 2026
  ("fastest finger ordered by latency-corrected time", "src/scoring.ts", ".sort((a, b) => a.receivedAt - b.receivedAt || a.joinSeq - b.joinSeq);", ".sort((a, b) => a.responseMs - b.responseMs || a.joinSeq - b.joinSeq);"),
  ("0x multiplier still scores bonuses", "src/scoring.ts", "return multiplier > 0 ? level : \"none\";", "return level;"),
]
# Anything but CAUGHT fails the run: a mutant that was missed, or never applied because the
# code it targets changed, proves nothing about the tests.
problems = 0
for name, rel, old, new in mutations:
  path = root / rel
  original = path.read_text()
  if old not in original:
    problems += 1
    print(f"!! {name}: pattern not found"); continue
  path.write_text(original.replace(old, new, 1))
  try:
    # CI runners force coloured output; colour codes in front of "Tests" would hide the summary.
    env = {**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0"}
    r = subprocess.run(["npx", "vitest", "run"], cwd=root, capture_output=True, text=True, env=env)
    plain = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout)
    summary = [l.strip() for l in plain.splitlines() if l.strip().startswith("Tests")]
    # A run that never reached a summary line (a crash, a hung runner) proves nothing either way.
    if not summary:
      tail = (r.stderr or r.stdout).strip().splitlines()[-3:]
      problems += 1
      print(f"ERROR   {name}  no test summary (exit {r.returncode}): {' | '.join(tail)}"); continue
    caught = r.returncode != 0 and "failed" in summary[-1]
    problems += 0 if caught else 1
    print(f"{'CAUGHT ' if caught else 'MISSED!'} {name}  {summary[-1]}")
  finally:
    path.write_text(original)
sys.exit(1 if problems else 0)
