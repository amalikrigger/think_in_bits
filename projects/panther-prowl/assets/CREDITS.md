# Credits and licenses

Every file the game uses must be listed here with where it came from and its
license. If you add art, sound or a font, add a row in the same commit.

## Fonts

| File | Source | Author | License |
|---|---|---|---|
| `fonts/creepster-latin.woff2` | [Google Fonts: Creepster](https://fonts.google.com/specimen/Creepster) | Font Diner (Sideshow) | SIL Open Font License 1.1 (`fonts/OFL-Creepster.txt`) |
| `fonts/fredoka-latin-variable.woff2` | [Google Fonts: Fredoka](https://fonts.google.com/specimen/Fredoka) | The Fredoka Project Authors (Milena Brandão, Hafontia) | SIL Open Font License 1.1 (`fonts/OFL-Fredoka.txt`) |

These are the same files Panther Slash uses (Latin subset, downloaded Oct 27,
2026). They're bundled so the game works offline.

## Art drawn in code (no image files)

Original work for Panther Prowl, made with Canvas drawing code. These are part
of this project's own code and carry no third-party license.

| What | Where |
|---|---|
| The panther, the four ghosts (Hex, Jack, Mist, Bones), candy corn, golden paw | `src/render/art.js` |
| Night sky, harvest moon, hallway floor, lockers, ghost-house door, cobwebs | `src/render/scene.js` |
| Sparks, floating scores, flashes | `src/render/effects.js`, `src/render/renderer.js` |
| Bonus treats (candy apple, full-size bar, golden pumpkin), classroom windows | `src/render/art.js`, `src/render/scene.js` |
| HUD paw icons, button icons, arrow pad, prize medal, browser-tab icon | inline SVG in `index.html` and `src/ui/hud.js` |
| App icons `icons/icon-*.png` | rendered from the panther drawing in `src/render/art.js` (Oct 27, 2026) |

## Mazes

| Maze | Designer |
|---|---|
| Haunted Halls (`src/mazes/haunted-halls.js`) | Original design for Panther Prowl, Oct 2026 |
| Midnight Gym (`src/mazes/midnight-gym.js`) | Original design for Panther Prowl, Oct 2026 |

## Sound

Every sound effect, including the "Ready?" jingle, is synthesized live with
the Web Audio API in `src/audio/sound.js`. There are no sound files.

## Student contributions

| File | Made by | Notes |
|---|---|---|
| *(none yet)* | | |

## Removed legacy files

The project started from a copy of an "HTML5 Pacman" game: `pacman.js`,
`nipplejs.min.js`, `audio/*.mp3` and `Cartoon.ttf`. Panther Prowl never used
them, and they were deleted on Oct 28, 2026:
- The code, the sounds and the original maze were derived from Bandai Namco's
  *Pac-Man*.
- The font's license was unknown.
- nipplejs is MIT-licensed but was no longer needed.

They remain in the git history from before that date.
