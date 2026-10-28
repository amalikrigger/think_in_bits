// Loads students' own pictures for characters (PNG files).
//
// In src/config.js, any character with an `art` setting, like
//   art: 'assets/characters/my-panther.png'
// is drawn with that picture instead of the built-in drawing. If the picture
// can't be loaded (a typo in the name, a missing file), the game warns in the
// console and keeps using the built-in drawing, so nothing breaks.
//
// Picture rules are in the README ("Draw your own character").

const sprites = new Map(); // path → { image, ready }

/** Start loading a picture. Safe to call more than once. */
export function loadSprite(path) {
  if (!path || sprites.has(path)) return;
  const image = new Image();
  const sprite = { image, ready: false };
  sprites.set(path, sprite);
  image.onload = () => (sprite.ready = true);
  image.onerror = () => console.warn(`Couldn't load the picture "${path}". Check the file name and that it's in the folder. Using the built-in drawing instead.`);
  image.src = path; // a relative path, so it works from any website folder
}

/** The loaded picture, or null if there's none (yet). */
export function getSprite(path) {
  const sprite = path ? sprites.get(path) : null;
  return sprite?.ready ? sprite.image : null;
}

/**
 * Draw a picture centered on (0, 0), `size` tiles wide and tall.
 * The canvas is already in tile units (see renderer.js).
 */
export function drawSprite(ctx, image, size, { flip = false } = {}) {
  ctx.save();
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
}
