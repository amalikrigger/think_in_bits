// A refresh resumes a student's seat only if the game code is in the address bar (?c=).
// A QR scan puts it there; a student who typed the code would otherwise land back on the
// code screen after a refresh. So the code stays in the URL while a game is open, and is
// removed when the student leaves a game, so a refresh then doesn't reopen the old one.

/** The address to show for this step, or null when it is already right. */
export function addressForStep(href: string, code: string | null, leftGame: boolean): string | null {
  const url = new URL(href);
  if (code) url.searchParams.set("c", code);
  else if (leftGame) url.searchParams.delete("c");
  return url.href === href ? null : url.href;
}
