// Decides where everything goes on screen: how big a maze tile is, where the
// maze sits, where the score display goes, and whether there's room for the
// on-screen arrow pad.
//
// Two layouts:
//   'top'   the score bar runs across the top (phones held upright, tablets,
//           laptops). On touch screens the arrow pad goes under the maze.
//   'side'  short, wide screens (phones held sideways): the score goes on the
//           left and the arrow pad on the right, so the maze gets the full height.
//
// Tile sizes are whole numbers of real screen pixels, so walls stay sharp
// instead of blurry.

const HUD_HEIGHT = 64;      // CSS pixels for the top score bar
const SIDE_PANEL = 150;     // CSS pixels for each side panel in 'side' layout
const MARGIN = 8;
const DPAD_MIN = 132;       // smallest useful arrow pad
const DPAD_MAX = 210;

/**
 * @param screen  { width, height, pixelRatio, safeTop, safeBottom } in CSS pixels
 * @param maze    { cols, rows }
 * @param dpad    'auto', 'always' or 'never', and whether this is a touch screen
 */
export function computeLayout(screen, maze, { dpadSetting, isTouch }) {
  const { width, height, pixelRatio } = screen;
  const wantsDpad = isTouch && dpadSetting !== 'never';
  const isShortLandscape = width > height && height < 600;

  // Snap a size to whole device pixels, so a tile is e.g. exactly 53 real pixels.
  const snap = (cssPixels) => Math.max(1, Math.floor(cssPixels * pixelRatio)) / pixelRatio;
  const fitTile = (areaWidth, areaHeight) => snap(Math.min(areaWidth / maze.cols, areaHeight / maze.rows));

  let mode;
  let tile;
  let mazeX;
  let mazeY;
  let dpad = null;

  if (isShortLandscape) {
    mode = 'side';
    const areaWidth = width - 2 * SIDE_PANEL;
    const areaHeight = height - screen.safeTop - screen.safeBottom - 2 * MARGIN;
    tile = fitTile(areaWidth, areaHeight);
    mazeX = (width - tile * maze.cols) / 2;
    mazeY = screen.safeTop + MARGIN + (areaHeight - tile * maze.rows) / 2;
    if (wantsDpad) {
      const size = Math.min(DPAD_MAX, SIDE_PANEL - 8, height * 0.5);
      dpad = { x: width - SIDE_PANEL / 2 - size / 2, y: height - screen.safeBottom - size - MARGIN * 2, size };
    }
  } else {
    mode = 'top';
    const top = screen.safeTop + HUD_HEIGHT;
    const bottom = screen.safeBottom + MARGIN;
    const areaWidth = width - 2 * MARGIN;
    const areaHeight = height - top - bottom;
    const fullTile = fitTile(areaWidth, areaHeight);
    tile = fullTile;

    if (wantsDpad) {
      const size = Math.max(DPAD_MIN, Math.min(DPAD_MAX, width * 0.5, height * 0.26));
      const tileWithPad = fitTile(areaWidth, areaHeight - size - MARGIN);
      // Only shrink the maze for the pad if it stays big enough to play.
      if (dpadSetting === 'always' || tileWithPad >= fullTile * 0.82) {
        tile = tileWithPad;
        mazeY = top;
        // The pad sits in the middle of the space left under the maze.
        const below = top + tile * maze.rows;
        const room = height - screen.safeBottom - below;
        dpad = { x: (width - size) / 2, y: below + Math.max(MARGIN, (room - size) / 2), size };
      }
    }
    mazeX = (width - tile * maze.cols) / 2;
    if (!dpad) mazeY = top + Math.max(0, (areaHeight - tile * maze.rows) / 2);

    // Tablets held sideways: no room under the maze, but plenty beside it.
    const besideMaze = (width - tile * maze.cols) / 2;
    if (wantsDpad && !dpad && besideMaze >= DPAD_MIN + 2 * MARGIN) {
      const size = Math.min(DPAD_MAX, besideMaze - 2 * MARGIN);
      dpad = { x: width - besideMaze / 2 - size / 2, y: height - screen.safeBottom - size - 3 * MARGIN, size };
    }
  }

  // Line the maze up with real pixels too.
  mazeX = Math.round(mazeX * pixelRatio) / pixelRatio;
  mazeY = Math.round(mazeY * pixelRatio) / pixelRatio;

  return {
    mode,
    tile,
    maze: { x: mazeX, y: mazeY, width: tile * maze.cols, height: tile * maze.rows },
    dpad,
    width,
    height,
    pixelRatio,
  };
}
