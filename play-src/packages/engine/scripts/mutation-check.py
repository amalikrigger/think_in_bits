# Mutation spot check: breaks one scoring/engine rule at a time and confirms the test
# suite notices. Usage (from packages/engine): python3 scripts/mutation-check.py .
# Each file is restored after its run, even on failure.
import subprocess, sys, shutil, pathlib
root = pathlib.Path(sys.argv[1])
mutations = [
  ("speed factor /2 → /3", "src/scoring.ts", "return 1 - t / timeLimitMs / 2;", "return 1 - t / timeLimitMs / 3;"),
  ("latency cap 1000 → 2000", "src/scoring.ts", "export const LATENCY_CAP_MS = 1000;", "export const LATENCY_CAP_MS = 2000;"),
  ("partial multi counts as exact", "src/scoring.ts", "const exact = wrongPicks === 0 && rightPicks === correct.size;", "const exact = rightPicks === correct.size;"),
  ("fastest finger sorted slowest first", "src/scoring.ts", ".sort((a, b) => a.responseMs - b.responseMs ||", ".sort((a, b) => b.responseMs - a.responseMs ||"),
  ("streak cap removed", "src/scoring.ts", "return Math.min(STREAK_STEP * Math.max(0, streak - 1), STREAK_CAP);", "return STREAK_STEP * Math.max(0, streak - 1);"),
  ("streak not reset on miss", "src/scoring.ts", "streak: counts ? 0 : streakBefore,", "streak: streakBefore,"),
  ("tie-break ignores response time", "src/views.ts", "b.score - a.score || a.totalResponseMs - b.totalResponseMs || a.joinSeq - b.joinSeq", "b.score - a.score || a.joinSeq - b.joinSeq"),
  ("answer key leaks into public question", "src/views.ts", "    timeLimitMs: question.timeLimitMs,\n    points: question.points,\n  };", "    timeLimitMs: question.timeLimitMs,\n    points: question.points,\n    ...({ correct: question.correct } as object),\n  };"),
  ("pause time counted against student", "src/engine.ts", "if (open && this.state.phase === \"question\") open.openedAt += pausedFor;", ""),
  ("double answers allowed", "src/engine.ts", "if (open.answers[player.id]) return \"already_answered\";", ""),
  ("late answers accepted", "src/engine.ts", "if (responseMs > question.timeLimitMs) {", "if (responseMs > question.timeLimitMs + 5000) {"),
  ("kicked token can resume", "src/engine.ts", "if (this.state.bannedTokens.includes(token)) return this.rejectJoin(connectionId, \"kicked\");", ""),
  ("CSV formula guard removed", "src/export.ts", "const safe = /^[=+\\-@\\t\\r]/.test(value) ? `'${value}` : value;", "const safe = value;"),
]
for name, rel, old, new in mutations:
  path = root / rel
  original = path.read_text()
  if old not in original:
    print(f"!! {name}: pattern not found"); continue
  path.write_text(original.replace(old, new, 1))
  try:
    r = subprocess.run(["npx", "vitest", "run"], cwd=root, capture_output=True, text=True)
    caught = r.returncode != 0
    failed = [l.strip() for l in r.stdout.splitlines() if "Tests" in l and "failed" in l]
    print(f"{'CAUGHT ' if caught else 'MISSED!'} {name}  {failed[0] if failed else ''}")
  finally:
    path.write_text(original)
