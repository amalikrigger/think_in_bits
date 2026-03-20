// === DOM Elements ===
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayScore = document.getElementById('overlayScore');
const overlayButton = document.getElementById('overlayButton');
const textureStatusEl = document.getElementById('textureStatus');

// === Constants ===
const ROWS = 20;
const COLS = 10;
const BASE_BLOCK_SIZE = 30;
let BLOCK_SIZE = BASE_BLOCK_SIZE;

function resizeCanvas() {
    const maxHeight = window.innerHeight - 80;
    const maxWidth = window.innerWidth - 340;
    const fitH = Math.floor(maxHeight / ROWS);
    const fitW = Math.floor(maxWidth / COLS);
    BLOCK_SIZE = Math.max(16, Math.min(BASE_BLOCK_SIZE, fitH, fitW));
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;
}
resizeCanvas();

// Official Tetris Guideline colors
const TETROMINOES = [
    { color: 'cyan',   shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] }, // I
    { color: 'yellow', shape: [[1,1],[1,1]] },                               // O
    { color: 'blue',   shape: [[1,0,0],[1,1,1],[0,0,0]] },                   // J
    { color: 'orange', shape: [[0,0,1],[1,1,1],[0,0,0]] },                   // L
    { color: 'green',  shape: [[0,1,1],[1,1,0],[0,0,0]] },                   // S
    { color: 'red',    shape: [[1,1,0],[0,1,1],[0,0,0]] },                   // Z
    { color: 'purple', shape: [[0,1,0],[1,1,1],[0,0,0]] },                   // T
];

// Piece index lookup by color for SRS kick tables
const PIECE_I = 0;
const PIECE_O = 1;

// === SRS Wall Kick Data ===
// Offsets: [rotation_state][test_index] = {x, y}
// Standard kicks for J, L, S, Z, T
const SRS_KICKS = {
    '0>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '1>0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '2>1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    '3>2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '0>3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

// I-piece kicks
const SRS_KICKS_I = {
    '0>1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '1>0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    '2>1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '3>2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '0>3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// Line clear scoring (NES-style)
const LINE_SCORES = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;

// Lock delay
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

// === Textures ===
const TEXTURE_SOURCES = {
    cyan: 'https://ih1.redbubble.net/image.5494804801.8633/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.jpg',
    blue: 'https://ih1.redbubble.net/image.5738892724.1278/flat,750x,075,f-pad,750x1000,f8f8f8.jpg',
    orange: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQm0dmNAJ1v-HjMxKqenmL95enha1nsiVz4A&s',
    yellow: 'https://www.tynker.com/projects/screenshot/636a78eb3c8f9950941b4444/when-the-imposter-is-sussy-1.png',
    green: 'https://ih1.redbubble.net/image.1094571479.7011/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.jpg',
    red: 'https://static.wikia.nocookie.net/troxeonis-stuff-plus-more/images/6/60/64933f98a477f02e36a282d1_5eddd950e5cf1ec1fa5c2d83_virtual-influencer-john-pork.jpg/revision/latest?cb=20230803082501',
    purple: 'https://images.ctfassets.net/sfnkq8lmu5d7/1wwJDuKWXF4niMBJE9gaSH/97b11bcd7d41039f3a8eb5c3350acdfd/2024-05-24_Doge_meme_death_-_Hero.jpg?w=1000&h=750&fl=progressive&q=70&fm=jpg',
};

const textures = {};
const textureLoadFailures = {};

function loadTextures() {
    Object.entries(TEXTURE_SOURCES).forEach(([color, src]) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => {
            textures[color] = img;
            delete textureLoadFailures[color];
            updateTextureStatus();
        };
        img.onerror = () => {
            delete textures[color];
            textureLoadFailures[color] = src;
            updateTextureStatus();
        };
    });
}

function updateTextureStatus() {
    const failures = Object.entries(textureLoadFailures);
    if (failures.length === 0) {
        textureStatusEl.textContent = '';
        return;
    }
    textureStatusEl.textContent = `Texture fallback (${failures.length}): using solid colors`;
}

// === Game State ===
let board = [];
let bag = [];
let currentTetromino = null;
let currentPos = { x: 0, y: 0 };
let currentRotation = 0;
let ghostY = 0;
let holdPiece = null;
let holdUsed = false;
let nextPiece = null;
let score = 0;
let level = 1;
let totalLines = 0;
let gameOver = false;
let paused = false;
let lastFrameTime = 0;
let dropAccumulator = 0;
let animationFrameId = null;
let lockTimer = 0;
let lockResets = 0;
let isLocking = false;

// Line clear animation state
let clearingRows = [];
let clearAnimTimer = 0;
const CLEAR_ANIM_DURATION = 300;

function getDropInterval() {
    // NES-style speed curve
    const speeds = [800,720,630,550,470,380,300,220,140,100,80,80,80,70,70,70,50,50,50,30];
    return speeds[Math.min(level - 1, speeds.length - 1)];
}

// === 7-Bag Randomizer ===
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function fillBag() {
    bag = shuffleArray([...Array(TETROMINOES.length).keys()]);
}

function nextFromBag() {
    if (bag.length === 0) fillBag();
    const idx = bag.pop();
    const t = TETROMINOES[idx];
    return {
        color: t.color,
        shape: t.shape.map(row => [...row]),
        index: idx,
    };
}

// === Spawning ===
function spawnTetromino() {
    currentTetromino = nextPiece;
    nextPiece = nextFromBag();
    currentRotation = 0;
    currentPos = {
        x: Math.floor((COLS - currentTetromino.shape[0].length) / 2),
        y: 0,
    };
    holdUsed = false;
    isLocking = false;
    lockResets = 0;
    lockTimer = 0;
    updateGhostY();
    drawNextPiece();
    drawHoldPiece();
}

// === Collision ===
function hasCollision(xOff = 0, yOff = 0, shape = currentTetromino.shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const nx = currentPos.x + x + xOff;
            const ny = currentPos.y + y + yOff;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
        }
    }
    return false;
}

// === Ghost Piece ===
function updateGhostY() {
    ghostY = 0;
    while (!hasCollision(0, ghostY + 1)) {
        ghostY++;
    }
}

// === Drawing ===
function drawBlock(context, x, y, color, blockSize, alpha) {
    const bx = x * blockSize;
    const by = y * blockSize;
    const tex = textures[color];

    context.globalAlpha = alpha;
    if (tex) {
        context.drawImage(tex, bx, by, blockSize, blockSize);
    } else {
        context.fillStyle = color;
        context.fillRect(bx, by, blockSize, blockSize);
    }
    context.globalAlpha = 1;

    context.strokeStyle = 'rgba(255,255,255,0.3)';
    context.lineWidth = 1;
    context.strokeRect(bx + 0.5, by + 0.5, blockSize - 1, blockSize - 1);
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE + 0.5, 0);
        ctx.lineTo(x * BLOCK_SIZE + 0.5, canvas.height);
        ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE + 0.5);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE + 0.5);
        ctx.stroke();
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                // During clear animation, flash clearing rows
                if (clearingRows.includes(y)) {
                    const progress = clearAnimTimer / CLEAR_ANIM_DURATION;
                    const flash = Math.abs(Math.sin(progress * Math.PI * 3));
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = `rgba(255,255,255,${flash * 0.8})`;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.globalAlpha = 1;
                } else {
                    drawBlock(ctx, x, y, board[y][x], BLOCK_SIZE, 1);
                }
            }
        }
    }
}

function drawGhost() {
    if (!currentTetromino || clearingRows.length > 0 || ghostY === 0) return;
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const gx = currentPos.x + x;
                const gy = currentPos.y + y + ghostY;
                if (gy >= 0) {
                    drawBlock(ctx, gx, gy, currentTetromino.color, BLOCK_SIZE, 0.2);
                }
            }
        }
    }
}

function drawCurrentPiece() {
    if (!currentTetromino || clearingRows.length > 0) return;
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(ctx, currentPos.x + x, currentPos.y + y, currentTetromino.color, BLOCK_SIZE, 1);
            }
        }
    }
}

function drawPieceOnCanvas(context, piece, canvasEl) {
    const cw = canvasEl.width;
    const ch = canvasEl.height;
    context.clearRect(0, 0, cw, ch);
    if (!piece) return;

    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const blockSz = Math.min(Math.floor(cw / cols), Math.floor(ch / rows), 26);
    const offsetX = Math.floor((cw - cols * blockSz) / 2);
    const offsetY = Math.floor((ch - rows * blockSz) / 2);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (shape[y][x]) {
                const bx = offsetX + x * blockSz;
                const by = offsetY + y * blockSz;
                const tex = textures[piece.color];
                if (tex) {
                    context.drawImage(tex, bx, by, blockSz, blockSz);
                } else {
                    context.fillStyle = piece.color;
                    context.fillRect(bx, by, blockSz, blockSz);
                }
                context.strokeStyle = 'rgba(255,255,255,0.3)';
                context.lineWidth = 1;
                context.strokeRect(bx + 0.5, by + 0.5, blockSz - 1, blockSz - 1);
            }
        }
    }
}

function drawNextPiece() {
    drawPieceOnCanvas(nextCtx, nextPiece, nextCanvas);
}

function drawHoldPiece() {
    drawPieceOnCanvas(holdCtx, holdPiece, holdCanvas);
}

// === Merge & Line Clear ===
function mergeTetromino() {
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const by = currentPos.y + y;
                const bx = currentPos.x + x;
                if (by >= 0) board[by][bx] = currentTetromino.color;
            }
        }
    }
}

function findFullRows() {
    const rows = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell)) rows.push(y);
    }
    return rows;
}

function removeRows(rows) {
    rows.sort((a, b) => b - a);
    for (const row of rows) {
        board.splice(row, 1);
    }
    while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(null));
    }
    const count = rows.length;
    if (count > 0) {
        score += LINE_SCORES[count] * level;
        totalLines += count;
        level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;
        updateStats();
    }
}

function updateStats() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = totalLines;
}

// === SRS Rotation ===
function rotateShape(shape) {
    const n = shape.length;
    const m = shape[0].length;
    const rotated = Array.from({ length: m }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < m; x++) {
            rotated[x][n - 1 - y] = shape[y][x];
        }
    }
    return rotated;
}

function rotateTetromino() {
    if (!currentTetromino || currentTetromino.index === PIECE_O) return; // O doesn't rotate

    const newRotation = (currentRotation + 1) % 4;
    const rotated = rotateShape(currentTetromino.shape);
    const kickKey = `${currentRotation}>${newRotation}`;
    const kicks = currentTetromino.index === PIECE_I ? SRS_KICKS_I : SRS_KICKS;
    const offsets = kicks[kickKey];

    if (!offsets) return;

    for (const [dx, dy] of offsets) {
        if (!hasCollision(dx, -dy, rotated)) {
            currentTetromino.shape = rotated;
            currentPos.x += dx;
            currentPos.y -= dy;
            currentRotation = newRotation;
            resetLockDelay();
            updateGhostY();
            return;
        }
    }
}

// === Movement ===
function move(offsetX) {
    if (!currentTetromino) return;
    if (!hasCollision(offsetX, 0)) {
        currentPos.x += offsetX;
        resetLockDelay();
        updateGhostY();
    }
}

function moveDown() {
    if (!currentTetromino) return;
    if (!hasCollision(0, 1)) {
        currentPos.y++;
        ghostY--;
        if (isLocking) resetLockDelay();
        return true;
    }
    return false;
}

function hardDrop() {
    if (!currentTetromino) return;
    const cellsDropped = ghostY;
    currentPos.y += ghostY;
    score += cellsDropped * 2;
    updateStats();
    lockPiece();
}

function lockPiece() {
    mergeTetromino();
    const fullRows = findFullRows();
    if (fullRows.length > 0) {
        clearingRows = fullRows;
        clearAnimTimer = 0;
    } else {
        afterLock();
    }
}

function afterLock() {
    spawnTetromino();
    if (hasCollision(0, 0)) {
        gameOver = true;
        showOverlay('GAME OVER', `Score: ${score}`);
    }
    updateStats();
}

// === Lock Delay ===
function resetLockDelay() {
    if (isLocking && lockResets < MAX_LOCK_RESETS) {
        lockTimer = 0;
        lockResets++;
    }
}

// === Hold ===
function holdCurrentPiece() {
    if (holdUsed || !currentTetromino) return;
    holdUsed = true;
    const idx = currentTetromino.index;
    const saved = TETROMINOES[idx];

    if (holdPiece) {
        const prevHold = holdPiece;
        holdPiece = { color: saved.color, shape: saved.shape.map(r => [...r]), index: idx };
        currentTetromino = {
            color: prevHold.color,
            shape: prevHold.shape.map(r => [...r]),
            index: prevHold.index,
        };
    } else {
        holdPiece = { color: saved.color, shape: saved.shape.map(r => [...r]), index: idx };
        currentTetromino = nextPiece;
        nextPiece = nextFromBag();
    }

    currentRotation = 0;
    currentPos = {
        x: Math.floor((COLS - currentTetromino.shape[0].length) / 2),
        y: 0,
    };
    isLocking = false;
    lockResets = 0;
    lockTimer = 0;
    updateGhostY();
    drawHoldPiece();
    drawNextPiece();
}

// === Overlay ===
function showOverlay(title, scoreText, showButton) {
    overlayTitle.textContent = title;
    overlayScore.textContent = scoreText || '';
    overlayButton.style.display = showButton === false ? 'none' : '';
    overlay.classList.remove('hidden');
}

function hideOverlay() {
    overlay.classList.add('hidden');
}

function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
        showOverlay('PAUSED', '', false);
    } else {
        hideOverlay();
        lastFrameTime = 0;
        dropAccumulator = 0;
        startGameLoop();
    }
}

// === Game Loop ===
function gameLoop(timestamp) {
    if (gameOver || paused) {
        animationFrameId = null;
        return;
    }

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    // Line clear animation in progress
    if (clearingRows.length > 0) {
        clearAnimTimer += dt;
        if (clearAnimTimer >= CLEAR_ANIM_DURATION) {
            removeRows(clearingRows);
            clearingRows = [];
            clearAnimTimer = 0;
            afterLock();
        }
        drawBoard();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // Drop accumulator
    dropAccumulator += dt;
    const dropInterval = getDropInterval();

    // Check if piece is on the ground
    if (hasCollision(0, 1)) {
        if (!isLocking) {
            isLocking = true;
            lockTimer = 0;
            lockResets = 0;
        }
        lockTimer += dt;
        if (lockTimer >= LOCK_DELAY_MS) {
            lockPiece();
            dropAccumulator = 0;
        }
    } else {
        isLocking = false;
        lockResets = 0;
        lockTimer = 0;

        while (dropAccumulator >= dropInterval && !gameOver) {
            if (!moveDown()) break;
            dropAccumulator -= dropInterval;
        }
    }

    drawBoard();
    drawGhost();
    drawCurrentPiece();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    lastFrameTime = 0;
    dropAccumulator = 0;
    animationFrameId = requestAnimationFrame(gameLoop);
}

// === Reset ===
function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    bag = [];
    fillBag();
    nextPiece = nextFromBag();
    holdPiece = null;
    holdUsed = false;
    score = 0;
    level = 1;
    totalLines = 0;
    gameOver = false;
    paused = false;
    clearingRows = [];
    clearAnimTimer = 0;
    isLocking = false;
    lockTimer = 0;
    lockResets = 0;
    hideOverlay();
    updateStats();
    spawnTetromino();
    startGameLoop();
}

// === Input ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
        return;
    }

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
    }

    if (gameOver || paused || clearingRows.length > 0) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            move(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            move(1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (moveDown()) score += 1;
            updateStats();
            break;
        case 'ArrowUp':
            e.preventDefault();
            rotateTetromino();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            break;
        case 'c':
        case 'C':
            e.preventDefault();
            holdCurrentPiece();
            break;
    }
});

overlayButton.addEventListener('click', () => resetGame());

// === Touch Controls ===
function createTouchControls() {
    const container = document.createElement('div');
    container.className = 'touch-controls';

    const buttons = [
        { label: '\u2B05', action: () => move(-1) },
        { label: '\u27A1', action: () => move(1) },
        { label: '\u2B07', action: () => { if (moveDown()) { score += 1; updateStats(); } } },
        { label: '\u2B06', action: () => rotateTetromino() },
        { label: 'DROP', action: () => hardDrop() },
        { label: 'HOLD', action: () => holdCurrentPiece() },
        { label: '\u23F8', action: () => togglePause() },
    ];

    buttons.forEach(({ label, action }) => {
        const btn = document.createElement('button');
        btn.className = 'touch-btn';
        btn.textContent = label;
        btn.setAttribute('aria-label', label);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if ((!gameOver && !paused && clearingRows.length === 0) || label === '\u23F8') action();
        });
        container.appendChild(btn);
    });

    document.querySelector('.center-panel').appendChild(container);
}

// === Resize Handler ===
window.addEventListener('resize', () => {
    resizeCanvas();
    drawBoard();
    drawGhost();
    drawCurrentPiece();
});

// === Init ===
loadTextures();
createTouchControls();
resetGame();