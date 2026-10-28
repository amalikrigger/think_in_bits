// Service worker: lets Panther Prowl work with no internet.
//
// The first time the game loads (with internet), this saves a copy of every
// file in the list below. After that, if the internet drops (event Wi-Fi!),
// the browser uses the saved copies.
//
// It always tries the network FIRST and only falls back to the saved copy,
// so when you change a file and reload, you see your change right away.
//
// ⚠️ Added a new file to the game (a maze, a module, a picture)? Add it to
// FILES below. The tests (`node --test`) check that nothing is missing.

const CACHE = 'panther-prowl-v1';

// Give up on the network after this long and use the saved copy. Slow event
// Wi-Fi is worse than no Wi-Fi, because the page just hangs.
const NETWORK_TIMEOUT_MS = 3000;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/fonts/creepster-latin.woff2',
  'assets/fonts/fredoka-latin-variable.woff2',
  'assets/icons/icon-180.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-512-maskable.png',
  'src/styles.css',
  'src/config.js',
  'src/main.js',
  'src/audio/sound.js',
  'src/core/autopilot.js',
  'src/core/directions.js',
  'src/core/game.js',
  'src/core/ghost-brains.js',
  'src/core/ghost.js',
  'src/core/leaderboard.js',
  'src/core/maze.js',
  'src/core/movement.js',
  'src/core/panther.js',
  'src/core/prizes.js',
  'src/core/random.js',
  'src/engine/loop.js',
  'src/input/controls.js',
  'src/mazes/index.js',
  'src/mazes/haunted-halls.js',
  'src/mazes/midnight-gym.js',
  'src/render/art.js',
  'src/render/effects.js',
  'src/render/layout.js',
  'src/render/renderer.js',
  'src/render/scene.js',
  'src/render/sprites.js',
  'src/storage/booth.js',
  'src/storage/store.js',
  'src/ui/fullscreen.js',
  'src/ui/hud.js',
  'src/ui/initials.js',
  'src/ui/leaderboard.js',
  'src/ui/prize.js',
  'src/ui/screens.js',
  'src/ui/staff.js',
];

self.addEventListener('install', (event) => {
  // Save every file now. `cache: 'reload'` skips the browser's own cache so
  // we save the real latest version.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' })))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete saved copies from older versions of this service worker.
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('panther-prowl-') && name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only this game's own files. Anything else goes straight to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) {
      cache.put(request, response.clone()); // keep the saved copy fresh
      return response;
    }
    // The server answered with an error (a flaky host): a saved copy is better.
    return (await cache.match(request, { ignoreSearch: true })) ?? response;
  } catch {
    // Offline or too slow: use the saved copy. ignoreSearch lets
    // "index.html?debug" use the saved "index.html".
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    if (request.mode === 'navigate') return (await cache.match('index.html')) ?? Response.error();
    return Response.error();
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
