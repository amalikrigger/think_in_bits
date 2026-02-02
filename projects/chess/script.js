// ============================================
// AUDIO MANAGER
// ============================================

const AudioManager = {
    // Background music configuration
    tracks: [
        { name: 'Epic Battle', file: 'music/epic-battle-orchestra-music-241006.mp3' },
        { name: 'Knight\'s Ballad', file: 'music/the-knight-and-the-flame-medieval-minstrelx27s-ballad-363292.mp3' },
        { name: 'Medieval Theme', file: 'music/the-knight-medieval-381401.mp3' }
    ],
    currentTrackIndex: 0,
    musicEnabled: false,
    sfxEnabled: true,
    musicAudio: null,
    audioContext: null,

    // Initialize the audio manager
    init() {
        // Create audio element for background music
        this.musicAudio = new Audio();
        this.musicAudio.loop = true;
        this.musicAudio.volume = 0.4;
        
        // Load preferences from localStorage
        const savedMusic = localStorage.getItem('chess_music_enabled');
        const savedSfx = localStorage.getItem('chess_sfx_enabled');
        const savedTrack = localStorage.getItem('chess_current_track');
        
        if (savedSfx !== null) {
            this.sfxEnabled = savedSfx === 'true';
        }
        if (savedTrack !== null) {
            this.currentTrackIndex = parseInt(savedTrack, 10);
        }
        
        // Update UI based on saved state
        this.updateUI();
    },

    // Get or create AudioContext for synthesized sounds
    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (needed for browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    },

    // Toggle background music
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('chess_music_enabled', this.musicEnabled);
        
        if (this.musicEnabled) {
            this.playMusic();
        } else {
            this.pauseMusic();
        }
        this.updateUI();
    },

    // Play current track
    playMusic() {
        const track = this.tracks[this.currentTrackIndex];
        this.musicAudio.src = track.file;
        this.musicAudio.play().catch(e => console.log('Music play failed:', e));
    },

    // Pause music
    pauseMusic() {
        this.musicAudio.pause();
    },

    // Next track
    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        localStorage.setItem('chess_current_track', this.currentTrackIndex);
        if (this.musicEnabled) {
            this.playMusic();
        }
        this.updateUI();
    },

    // Previous track
    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        localStorage.setItem('chess_current_track', this.currentTrackIndex);
        if (this.musicEnabled) {
            this.playMusic();
        }
        this.updateUI();
    },

    // Toggle sound effects
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        localStorage.setItem('chess_sfx_enabled', this.sfxEnabled);
        this.updateUI();
    },

    // Update UI elements
    updateUI() {
        const musicBtn = document.getElementById('music-btn');
        const sfxBtn = document.getElementById('sfx-btn');
        const trackName = document.getElementById('track-name');
        
        if (musicBtn) {
            musicBtn.classList.toggle('active', this.musicEnabled);
        }
        if (sfxBtn) {
            sfxBtn.classList.toggle('active', this.sfxEnabled);
        }
        if (trackName) {
            trackName.textContent = this.musicEnabled 
                ? this.tracks[this.currentTrackIndex].name 
                : 'Music Off';
        }
    },

    // Synthesized sound effects using Web Audio API
    playSound(type) {
        if (!this.sfxEnabled) return;
        
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        
        switch (type) {
            case 'move':
                this.playTone(ctx, 440, 0.08, 'sine', 0.3);
                break;
            case 'capture':
                this.playTone(ctx, 220, 0.1, 'sawtooth', 0.4);
                setTimeout(() => this.playTone(ctx, 165, 0.15, 'sawtooth', 0.3), 50);
                break;
            case 'check':
                this.playTone(ctx, 523, 0.1, 'square', 0.3);
                setTimeout(() => this.playTone(ctx, 659, 0.1, 'square', 0.3), 100);
                setTimeout(() => this.playTone(ctx, 784, 0.15, 'square', 0.3), 200);
                break;
            case 'checkmate':
                // Victory fanfare
                this.playTone(ctx, 523, 0.15, 'sine', 0.4);
                setTimeout(() => this.playTone(ctx, 659, 0.15, 'sine', 0.4), 150);
                setTimeout(() => this.playTone(ctx, 784, 0.15, 'sine', 0.4), 300);
                setTimeout(() => this.playTone(ctx, 1047, 0.4, 'sine', 0.5), 450);
                break;
            case 'castle':
                this.playTone(ctx, 330, 0.1, 'sine', 0.3);
                setTimeout(() => this.playTone(ctx, 440, 0.1, 'sine', 0.3), 80);
                setTimeout(() => this.playTone(ctx, 330, 0.1, 'sine', 0.3), 160);
                break;
            case 'promote':
                this.playTone(ctx, 440, 0.1, 'sine', 0.3);
                setTimeout(() => this.playTone(ctx, 554, 0.1, 'sine', 0.3), 100);
                setTimeout(() => this.playTone(ctx, 659, 0.1, 'sine', 0.3), 200);
                setTimeout(() => this.playTone(ctx, 880, 0.2, 'sine', 0.4), 300);
                break;
            case 'start':
                this.playTone(ctx, 262, 0.1, 'sine', 0.3);
                setTimeout(() => this.playTone(ctx, 330, 0.1, 'sine', 0.3), 100);
                setTimeout(() => this.playTone(ctx, 392, 0.15, 'sine', 0.35), 200);
                break;
            case 'draw':
                this.playTone(ctx, 392, 0.2, 'sine', 0.3);
                setTimeout(() => this.playTone(ctx, 330, 0.3, 'sine', 0.25), 200);
                break;
            case 'select':
                this.playTone(ctx, 880, 0.05, 'sine', 0.15);
                break;
        }
    },

    // Helper function to play a tone
    playTone(ctx, frequency, duration, waveform, volume) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }
};

// ============================================
// FULLSCREEN TOGGLE
// ============================================

function toggleFullscreen() {
    const container = document.querySelector('.container');
    const btn = document.getElementById('fullscreen-btn');
    
    if (!document.fullscreenElement) {
        // Enter fullscreen
        document.documentElement.requestFullscreen().then(() => {
            container.classList.add('fullscreen');
            btn.textContent = '⛶';
            btn.classList.add('active');
        }).catch(err => {
            console.log('Fullscreen error:', err);
            // Fallback: just add fullscreen class without browser fullscreen
            container.classList.add('fullscreen');
            btn.classList.add('active');
        });
    } else {
        // Exit fullscreen
        document.exitFullscreen().then(() => {
            container.classList.remove('fullscreen');
            btn.classList.remove('active');
        }).catch(err => {
            console.log('Exit fullscreen error:', err);
            container.classList.remove('fullscreen');
            btn.classList.remove('active');
        });
    }
}

// Handle fullscreen change from Escape key
document.addEventListener('fullscreenchange', () => {
    const container = document.querySelector('.container');
    const btn = document.getElementById('fullscreen-btn');
    
    if (!document.fullscreenElement) {
        container.classList.remove('fullscreen');
        if (btn) btn.classList.remove('active');
    }
});

//inserting the images
function insertImage() {
    document.querySelectorAll('.box').forEach(image => {
        // Get clean piece name (first word only, in case of leftover text)
        const rawText = image.innerText.trim();
        const pieceName = rawText.split(' ')[0];
        
        if (pieceName && pieceName.length > 0 && (pieceName.startsWith('W') || pieceName.startsWith('B'))) {
            if (pieceName === 'Wpawn' || pieceName === 'Bpawn') {
                image.innerHTML = `${pieceName} <img class='all-img all-pawn'
                src="images/${pieceName}.png" alt="">`
                image.style.cursor = 'pointer'
            } else {
                image.innerHTML = `${pieceName} <img class='all-img'
                src="images/${pieceName}.png" alt="">`
                image.style.cursor = 'pointer'
            }
        } else if (rawText.length === 0) {
            // Empty square - make sure it stays empty
            image.innerHTML = '';
            image.style.cursor = 'default';
        }
    })
}

insertImage()

//Coloring the board

function coloring() {
    const color = document.querySelectorAll('.box')

    color.forEach(color => {
        let getId = color.id
        let arr = Array.from(getId)
        arr.shift()
        let aside = parseInt(arr.pop(), 10)
        let aup = parseInt(arr.shift(), 10)
        let a = aside + aup

        if (a % 2 == 0) {
            color.style.backgroundColor = 'rgb(232 235 239)'
        }
        if (a % 2 !== 0) {
            color.style.backgroundColor = 'rgb(125 135 150)'
        }
    })
}
coloring()

// ============================================
// GAME STATE MANAGEMENT
// ============================================

const GameState = {
    currentTurn: 'W',
    moveCount: 0,
    selectedPiece: null,
    selectedSquare: null,
    board: {},
    kingMoved: { W: false, B: false },
    rookMoved: { W: { queenside: false, kingside: false }, B: { queenside: false, kingside: false } },
    enPassantTarget: null,
    halfMoveClock: 0,
    moveHistory: [],
    positionHistory: [],
    gameOver: false,
    winner: null,
    inCheck: { W: false, B: false },
    moveInProgress: false  // Prevent multiple handlers from executing
};

function initBoardState() {
    document.querySelectorAll('.box').forEach(square => {
        const id = square.id;
        const text = square.innerText;
        const piece = text.split(' ')[0];
        if (piece && piece.length > 0 && !piece.includes('<')) {
            GameState.board[id] = piece;
        } else {
            GameState.board[id] = null;
        }
    });
}

function getPieceAt(squareId) {
    return GameState.board[squareId] || null;
}

function getPieceColor(piece) {
    if (!piece) return null;
    return piece.charAt(0);
}

function isSquareEmpty(squareId) {
    return !GameState.board[squareId];
}

function parseSquareId(squareId) {
    const numPart = squareId.substring(1);
    const fullNum = parseInt(numPart, 10);
    return {
        row: Math.floor(fullNum / 100),
        col: fullNum % 10 || 8
    };
}

function createSquareId(row, col) {
    return `b${row}0${col}`;
}

// Helper function to highlight a square only if the move is legal
function highlightIfLegal(fromSquareId, targetSquareId, color) {
    if (!wouldBeInCheck(fromSquareId, targetSquareId, color)) {
        const targetEl = document.getElementById(targetSquareId);
        if (targetEl) {
            targetEl.style.backgroundColor = 'greenyellow';
        }
        return true;
    }
    return false;
}

// Initialize board state
initBoardState();

// ============================================
// LAST MOVE TRACKING
// ============================================

let lastMoveSquares = { from: null, to: null };

function highlightLastMove(fromId, toId) {
    // Clear previous highlights
    if (lastMoveSquares.from) {
        document.getElementById(lastMoveSquares.from)?.classList.remove('last-move');
    }
    if (lastMoveSquares.to) {
        document.getElementById(lastMoveSquares.to)?.classList.remove('last-move');
    }
    
    // Add new highlights
    document.getElementById(fromId)?.classList.add('last-move');
    document.getElementById(toId)?.classList.add('last-move');
    
    lastMoveSquares = { from: fromId, to: toId };
}

// ============================================
// MOVE COUNTER
// ============================================

function updateMoveCounter() {
    const moveNum = Math.floor(GameState.moveCount / 2) + 1;
    document.getElementById('move-counter').innerText = `Move: ${moveNum}`;
}

// ============================================
// CAPTURED PIECES DISPLAY
// ============================================

function addCapturedPiece(piece) {
    if (!piece) return;
    const color = getPieceColor(piece);
    const containerId = color === 'W' ? 'black-captured' : 'white-captured';
    const container = document.getElementById(containerId);
    if (container) {
        const img = document.createElement('img');
        img.src = `images/${piece}.png`;
        img.alt = piece;
        container.appendChild(img);
    }
}

// ============================================
// CHECK DETECTION FUNCTIONS
// ============================================

// Check if a square is attacked by the given color
function isSquareAttacked(squareId, byColor) {
    const { row, col } = parseSquareId(squareId);
    
    // Check pawn attacks
    const pawnDir = byColor === 'W' ? 1 : -1;
    const pawnRow = row - pawnDir;
    if (pawnRow >= 1 && pawnRow <= 8) {
        for (const dc of [-1, 1]) {
            const pc = col + dc;
            if (pc >= 1 && pc <= 8) {
                const pawnSquare = createSquareId(pawnRow, pc);
                const piece = getPieceAt(pawnSquare);
                if (piece === `${byColor}pawn`) return true;
            }
        }
    }
    
    // Check knight attacks
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
            const knightSquare = createSquareId(nr, nc);
            const piece = getPieceAt(knightSquare);
            if (piece === `${byColor}knight`) return true;
        }
    }
    
    // Check king attacks (for preventing kings from being adjacent)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                const kingSquare = createSquareId(nr, nc);
                const piece = getPieceAt(kingSquare);
                if (piece === `${byColor}king`) return true;
            }
        }
    }
    
    // Check rook/queen attacks (horizontal/vertical)
    const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dr, dc] of straightDirs) {
        let nr = row + dr;
        let nc = col + dc;
        while (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
            const checkSquare = createSquareId(nr, nc);
            const piece = getPieceAt(checkSquare);
            if (piece) {
                if (piece === `${byColor}rook` || piece === `${byColor}queen`) return true;
                break; // Blocked by another piece
            }
            nr += dr;
            nc += dc;
        }
    }
    
    // Check bishop/queen attacks (diagonal)
    const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of diagDirs) {
        let nr = row + dr;
        let nc = col + dc;
        while (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
            const checkSquare = createSquareId(nr, nc);
            const piece = getPieceAt(checkSquare);
            if (piece) {
                if (piece === `${byColor}bishop` || piece === `${byColor}queen`) return true;
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    
    return false;
}

// Find king position for a color
function findKing(color) {
    for (const [squareId, piece] of Object.entries(GameState.board)) {
        if (piece === `${color}king`) return squareId;
    }
    return null;
}

// Check if a color's king is in check
function isInCheck(color) {
    const kingSquare = findKing(color);
    if (!kingSquare) return false;
    const enemyColor = color === 'W' ? 'B' : 'W';
    return isSquareAttacked(kingSquare, enemyColor);
}

// Test if a move would leave/put own king in check
function wouldBeInCheck(fromSquare, toSquare, color) {
    // Temporarily make the move
    const originalFrom = GameState.board[fromSquare];
    const originalTo = GameState.board[toSquare];
    
    GameState.board[toSquare] = originalFrom;
    GameState.board[fromSquare] = null;
    
    const inCheck = isInCheck(color);
    
    // Restore original state
    GameState.board[fromSquare] = originalFrom;
    GameState.board[toSquare] = originalTo;
    
    return inCheck;
}

// ============================================
// DRAW CONDITION FUNCTIONS
// ============================================

// Generate a unique hash for the current position (for threefold repetition)
function getPositionHash() {
    // Position includes: board state, current turn, castling rights, en passant target
    let hash = '';
    
    // Board state
    for (let row = 1; row <= 8; row++) {
        for (let col = 1; col <= 8; col++) {
            const squareId = createSquareId(row, col);
            const piece = GameState.board[squareId];
            hash += piece ? piece : '-';
        }
    }
    
    // Current turn
    hash += GameState.currentTurn;
    
    // Castling rights
    hash += GameState.kingMoved.W ? '0' : '1';
    hash += GameState.kingMoved.B ? '0' : '1';
    hash += GameState.rookMoved.W.kingside ? '0' : '1';
    hash += GameState.rookMoved.W.queenside ? '0' : '1';
    hash += GameState.rookMoved.B.kingside ? '0' : '1';
    hash += GameState.rookMoved.B.queenside ? '0' : '1';
    
    // En passant target
    hash += GameState.enPassantTarget || '-';
    
    return hash;
}

// Record current position for threefold repetition check
function recordPosition() {
    const hash = getPositionHash();
    GameState.positionHistory.push(hash);
}

// Check for threefold repetition
function isThreefoldRepetition() {
    const currentHash = getPositionHash();
    let count = 0;
    
    for (const hash of GameState.positionHistory) {
        if (hash === currentHash) {
            count++;
            if (count >= 3) return true;
        }
    }
    return false;
}

// Check for fifty-move rule (100 half-moves = 50 full moves)
function isFiftyMoveRule() {
    return GameState.halfMoveClock >= 100;
}

// Check for insufficient material
function isInsufficientMaterial() {
    const pieces = { W: [], B: [] };
    
    // Collect all pieces
    for (const [squareId, piece] of Object.entries(GameState.board)) {
        if (piece) {
            const color = getPieceColor(piece);
            const type = piece.substring(1);
            pieces[color].push({ type, square: squareId });
        }
    }
    
    const whitePieces = pieces.W;
    const blackPieces = pieces.B;
    
    // Helper to check piece composition
    const hasOnly = (pieceList, ...types) => {
        return pieceList.every(p => types.includes(p.type));
    };
    
    const countType = (pieceList, type) => {
        return pieceList.filter(p => p.type === type).length;
    };
    
    // King vs King
    if (whitePieces.length === 1 && blackPieces.length === 1) {
        return true;
    }
    
    // King + Bishop vs King
    if (whitePieces.length === 2 && blackPieces.length === 1) {
        if (hasOnly(whitePieces, 'king', 'bishop')) return true;
        if (hasOnly(whitePieces, 'king', 'knight')) return true;
    }
    if (whitePieces.length === 1 && blackPieces.length === 2) {
        if (hasOnly(blackPieces, 'king', 'bishop')) return true;
        if (hasOnly(blackPieces, 'king', 'knight')) return true;
    }
    
    // King + Bishop vs King + Bishop (same color bishops)
    if (whitePieces.length === 2 && blackPieces.length === 2) {
        if (hasOnly(whitePieces, 'king', 'bishop') && hasOnly(blackPieces, 'king', 'bishop')) {
            const whiteBishop = whitePieces.find(p => p.type === 'bishop');
            const blackBishop = blackPieces.find(p => p.type === 'bishop');
            
            if (whiteBishop && blackBishop) {
                const { row: wr, col: wc } = parseSquareId(whiteBishop.square);
                const { row: br, col: bc } = parseSquareId(blackBishop.square);
                
                // Same color square if (row + col) % 2 is equal
                if ((wr + wc) % 2 === (br + bc) % 2) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Check all draw conditions
function checkDrawConditions() {
    if (isThreefoldRepetition()) {
        return { isDraw: true, reason: 'Threefold Repetition' };
    }
    if (isFiftyMoveRule()) {
        return { isDraw: true, reason: 'Fifty-Move Rule' };
    }
    if (isInsufficientMaterial()) {
        return { isDraw: true, reason: 'Insufficient Material' };
    }
    return { isDraw: false, reason: null };
}

// Handle draw by agreement
function offerDraw() {
    if (GameState.gameOver) return;
    
    const currentPlayer = GameState.currentTurn === 'W' ? 'White' : 'Black';
    const opponent = GameState.currentTurn === 'W' ? 'Black' : 'White';
    
    if (confirm(`${currentPlayer} offers a draw. Does ${opponent} accept?`)) {
        GameState.gameOver = true;
        GameState.winner = 'draw';
        AudioManager.playSound('draw');
        document.getElementById('tog').innerText = 'Draw by Agreement!';
        document.getElementById('tog').style.color = 'orange';
        alert('Game ended in a draw by mutual agreement.');
    }
}

// Update half-move clock (reset on pawn move or capture)
function updateHalfMoveClock(isPawnMove, isCapture) {
    if (isPawnMove || isCapture) {
        GameState.halfMoveClock = 0;
    } else {
        GameState.halfMoveClock++;
    }
}

// Update check status display
function updateCheckStatus() {
    const wasInCheckW = GameState.inCheck.W;
    const wasInCheckB = GameState.inCheck.B;
    
    GameState.inCheck.W = isInCheck('W');
    GameState.inCheck.B = isInCheck('B');
    
    // Play check sound if someone just got put in check
    if ((!wasInCheckW && GameState.inCheck.W) || (!wasInCheckB && GameState.inCheck.B)) {
        AudioManager.playSound('check');
    }
    
    // Remove previous check highlights
    document.querySelectorAll('.in-check').forEach(el => {
        el.classList.remove('in-check');
    });
    
    // Add check highlight to king in check
    if (GameState.inCheck.W) {
        const whiteKingSquare = findKing('W');
        if (whiteKingSquare) {
            document.getElementById(whiteKingSquare).classList.add('in-check');
        }
    }
    if (GameState.inCheck.B) {
        const blackKingSquare = findKing('B');
        if (blackKingSquare) {
            document.getElementById(blackKingSquare).classList.add('in-check');
        }
    }
    
    const togElement = document.getElementById('tog');
    if (GameState.inCheck.W && GameState.currentTurn === 'W') {
        togElement.innerText = "White's Turn - CHECK!";
        togElement.style.color = 'red';
    } else if (GameState.inCheck.B && GameState.currentTurn === 'B') {
        togElement.innerText = "Black's Turn - CHECK!";
        togElement.style.color = 'red';
    } else {
        togElement.style.color = '';
    }
}

// Check for checkmate or stalemate
function hasAnyLegalMoves(color) {
    for (const [squareId, piece] of Object.entries(GameState.board)) {
        if (piece && getPieceColor(piece) === color) {
            // Get possible target squares based on piece type
            const { row, col } = parseSquareId(squareId);
            const pieceType = piece.substring(1);
            let targetSquares = [];
            
            if (pieceType === 'pawn') {
                const dir = color === 'W' ? 1 : -1;
                // Forward moves
                if (row + dir >= 1 && row + dir <= 8) {
                    const fwd = createSquareId(row + dir, col);
                    if (isSquareEmpty(fwd)) targetSquares.push(fwd);
                }
                // Captures
                for (const dc of [-1, 1]) {
                    if (col + dc >= 1 && col + dc <= 8 && row + dir >= 1 && row + dir <= 8) {
                        const cap = createSquareId(row + dir, col + dc);
                        const target = getPieceAt(cap);
                        if (target && getPieceColor(target) !== color) targetSquares.push(cap);
                    }
                }
            } else if (pieceType === 'knight') {
                const moves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
                for (const [dr, dc] of moves) {
                    const nr = row + dr, nc = col + dc;
                    if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                        const sq = createSquareId(nr, nc);
                        const target = getPieceAt(sq);
                        if (!target || getPieceColor(target) !== color) targetSquares.push(sq);
                    }
                }
            } else if (pieceType === 'king') {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = row + dr, nc = col + dc;
                        if (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                            const sq = createSquareId(nr, nc);
                            const target = getPieceAt(sq);
                            if (!target || getPieceColor(target) !== color) targetSquares.push(sq);
                        }
                    }
                }
            } else if (pieceType === 'rook' || pieceType === 'queen') {
                const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
                for (const [dr, dc] of dirs) {
                    let nr = row + dr, nc = col + dc;
                    while (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                        const sq = createSquareId(nr, nc);
                        const target = getPieceAt(sq);
                        if (!target) {
                            targetSquares.push(sq);
                        } else {
                            if (getPieceColor(target) !== color) targetSquares.push(sq);
                            break;
                        }
                        nr += dr; nc += dc;
                    }
                }
            }
            if (pieceType === 'bishop' || pieceType === 'queen') {
                const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
                for (const [dr, dc] of dirs) {
                    let nr = row + dr, nc = col + dc;
                    while (nr >= 1 && nr <= 8 && nc >= 1 && nc <= 8) {
                        const sq = createSquareId(nr, nc);
                        const target = getPieceAt(sq);
                        if (!target) {
                            targetSquares.push(sq);
                        } else {
                            if (getPieceColor(target) !== color) targetSquares.push(sq);
                            break;
                        }
                        nr += dr; nc += dc;
                    }
                }
            }
            
            // Check if any move is legal (doesn't leave king in check)
            for (const target of targetSquares) {
                if (!wouldBeInCheck(squareId, target, color)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function checkGameEnd() {
    if (GameState.gameOver) return;
    
    const currentColor = GameState.currentTurn;
    
    // Check for draw conditions first
    const drawResult = checkDrawConditions();
    if (drawResult.isDraw) {
        GameState.gameOver = true;
        GameState.winner = 'draw';
        AudioManager.playSound('draw');
        document.getElementById('tog').innerText = `Draw: ${drawResult.reason}!`;
        document.getElementById('tog').style.color = 'orange';
        setTimeout(() => alert(`Game ended in a draw: ${drawResult.reason}`), 100);
        return;
    }
    
    if (!hasAnyLegalMoves(currentColor)) {
        if (isInCheck(currentColor)) {
            // Checkmate
            GameState.gameOver = true;
            GameState.winner = currentColor === 'W' ? 'B' : 'W';
            const winnerName = GameState.winner === 'W' ? 'White' : 'Black';
            AudioManager.playSound('checkmate');
            document.getElementById('tog').innerText = `Checkmate! ${winnerName} wins!`;
            document.getElementById('tog').style.color = 'red';
            setTimeout(() => alert(`Checkmate! ${winnerName} wins!`), 100);
        } else {
            // Stalemate
            GameState.gameOver = true;
            GameState.winner = 'draw';
            AudioManager.playSound('draw');
            document.getElementById('tog').innerText = 'Stalemate! Draw!';
            document.getElementById('tog').style.color = 'orange';
            setTimeout(() => alert('Stalemate! Game is a draw.'), 100);
        }
    }
}

// ============================================
// PAWN PROMOTION
// ============================================

let pendingPromotion = null;

function showPromotionDialog(color, squareId) {
    pendingPromotion = { color, squareId };
    
    // Create overlay if not exists
    let overlay = document.querySelector('.promotion-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'promotion-overlay';
        document.body.appendChild(overlay);
    }
    
    // Create dialog if not exists
    let dialog = document.querySelector('.promotion-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.className = 'promotion-dialog';
        dialog.innerHTML = `
            <h3>Choose Promotion</h3>
            <div class="promotion-options">
                <div class="promotion-option" data-piece="queen" title="Queen"></div>
                <div class="promotion-option" data-piece="rook" title="Rook"></div>
                <div class="promotion-option" data-piece="bishop" title="Bishop"></div>
                <div class="promotion-option" data-piece="knight" title="Knight"></div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        // Add click handlers
        dialog.querySelectorAll('.promotion-option').forEach(option => {
            option.addEventListener('click', () => {
                const piece = option.dataset.piece;
                completePromotion(piece);
            });
        });
    }
    
    // Set piece images based on color
    const options = dialog.querySelectorAll('.promotion-option');
    options[0].style.backgroundImage = `url(images/${color}queen.png)`;
    options[1].style.backgroundImage = `url(images/${color}rook.png)`;
    options[2].style.backgroundImage = `url(images/${color}bishop.png)`;
    options[3].style.backgroundImage = `url(images/${color}knight.png)`;
    
    overlay.classList.add('active');
    dialog.classList.add('active');
}

function completePromotion(pieceType) {
    if (!pendingPromotion) return;
    
    const { color, squareId } = pendingPromotion;
    const newPiece = `${color}${pieceType}`;
    
    // Play promotion sound
    AudioManager.playSound('promote');
    
    // Update game state
    GameState.board[squareId] = newPiece;
    
    // Update DOM
    const square = document.getElementById(squareId);
    square.innerHTML = `${newPiece} <img class='all-img' src="images/${newPiece}.png" alt="">`;
    
    // Hide dialog
    document.querySelector('.promotion-overlay').classList.remove('active');
    document.querySelector('.promotion-dialog').classList.remove('active');
    
    pendingPromotion = null;
    
    // Continue game flow
    updateCheckStatus();
    checkGameEnd();
}

function checkForPromotion(squareId, color) {
    const { row } = parseSquareId(squareId);
    if ((color === 'W' && row === 8) || (color === 'B' && row === 1)) {
        const piece = getPieceAt(squareId);
        if (piece && piece.includes('pawn')) {
            showPromotionDialog(color, squareId);
            return true;
        }
    }
    return false;
}

// ============================================
// CASTLING
// ============================================

function canCastle(color, side) {
    if (GameState.kingMoved[color]) return false;
    if (GameState.rookMoved[color][side]) return false;
    if (isInCheck(color)) return false;
    
    const row = color === 'W' ? 1 : 8;
    const enemyColor = color === 'W' ? 'B' : 'W';
    
    if (side === 'kingside') {
        if (!isSquareEmpty(`b${row}06`)) return false;
        if (!isSquareEmpty(`b${row}07`)) return false;
        if (isSquareAttacked(`b${row}06`, enemyColor)) return false;
        if (isSquareAttacked(`b${row}07`, enemyColor)) return false;
        return true;
    } else {
        if (!isSquareEmpty(`b${row}02`)) return false;
        if (!isSquareEmpty(`b${row}03`)) return false;
        if (!isSquareEmpty(`b${row}04`)) return false;
        if (isSquareAttacked(`b${row}03`, enemyColor)) return false;
        if (isSquareAttacked(`b${row}04`, enemyColor)) return false;
        return true;
    }
}

// ============================================
// END GAME STATE MANAGEMENT
// ============================================


//function to not remove the same team element

function reddish() {
    document.querySelectorAll('.box').forEach(i1 => {
        if (i1.style.backgroundColor == 'blue') {

            document.querySelectorAll('.box').forEach(i2 => {

                if (i2.style.backgroundColor == 'greenyellow' && i2.innerText.length !== 0) {


                    let greenyellowText = i2.innerText

                    let blueText = i1.innerText

                    let blueColor = ((Array.from(blueText)).shift()).toString()
                    let greenyellowColor = ((Array.from(greenyellowText)).shift()).toString()

                    let getId = i2.id
                    let arr = Array.from(getId)
                    arr.shift()
                    let aside = parseInt(arr.pop(), 10)
                    let aup = parseInt(arr.shift(), 10)
                    let a = aside + aup

                    if (a % 2 == 0 && blueColor == greenyellowColor) {
                        i2.style.backgroundColor = 'rgb(232 235 239)'
                    }
                    if (a % 2 !== 0 && blueColor == greenyellowColor) {
                        i2.style.backgroundColor = 'rgb(125 135 150)'
                    }

                }
            })
        }
    })
}

//reset button
document.getElementById("reset-btn").addEventListener("click", function () {
    if (confirm("Are you sure you want to reset the game?")) {
        AudioManager.playSound('start');
        setTimeout(() => location.reload(), 300);
    }
});

// draw offer button
document.getElementById("draw-btn").addEventListener("click", function () {
    offerDraw();
});

// ============================================
// AUDIO CONTROL EVENT LISTENERS
// ============================================

// Initialize AudioManager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AudioManager.init();
});

// Fullscreen button
document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);

// Music toggle button
document.getElementById('music-btn').addEventListener('click', () => {
    AudioManager.toggleMusic();
});

// Previous track button
document.getElementById('prev-track-btn').addEventListener('click', () => {
    AudioManager.prevTrack();
});

// Next track button
document.getElementById('next-track-btn').addEventListener('click', () => {
    AudioManager.nextTrack();
});

// Sound effects toggle button
document.getElementById('sfx-btn').addEventListener('click', () => {
    AudioManager.toggleSFX();
});

// Record initial position for threefold repetition
recordPosition();


let tog = 1

document.querySelectorAll('.box').forEach(item => {


    item.addEventListener('click', function () {

        // Skip if game is over
        if (GameState.gameOver) {
            return;
        }

        if (item.style.backgroundColor == 'greenyellow' && item.innerText.length == 0) {
            tog = tog + 1
        }

        else if (item.style.backgroundColor == 'greenyellow' && item.innerText.length !== 0) {
            // Prevent multiple handlers from executing for the same move
            if (GameState.moveInProgress) return;
            GameState.moveInProgress = true;

            document.querySelectorAll('.box').forEach(i => {
                if (i.style.backgroundColor == 'blue') {
                    let blueId = i.id
                    // Use GameState.board for clean piece name (innerText may have extra characters)
                    let blueText = GameState.board[blueId] || '';

                    // Self-capture prevention - verify it's an enemy piece
                    const movingPieceColor = getPieceColor(blueText);
                    const targetPiece = getPieceAt(item.id);
                    if (targetPiece && getPieceColor(targetPiece) === movingPieceColor) {
                        GameState.moveInProgress = false;
                        return; // Don't capture own piece
                    }

                    // Track captured piece before updating state
                    const capturedPiece = getPieceAt(item.id);
                    
                    // Play capture sound
                    AudioManager.playSound('capture');

                    // Update game state before move
                    GameState.board[item.id] = GameState.board[blueId];
                    GameState.board[blueId] = null;
                    GameState.currentTurn = GameState.currentTurn === 'W' ? 'B' : 'W';
                    GameState.moveCount++;
                    
                    // Track king/rook movement for castling
                    const captureMovedPiece = GameState.board[item.id];
                    if (captureMovedPiece === 'Wking') GameState.kingMoved.W = true;
                    if (captureMovedPiece === 'Bking') GameState.kingMoved.B = true;
                    if (captureMovedPiece === 'Wrook') {
                        if (blueId === 'b101') GameState.rookMoved.W.queenside = true;
                        if (blueId === 'b108') GameState.rookMoved.W.kingside = true;
                    }
                    if (captureMovedPiece === 'Brook') {
                        if (blueId === 'b801') GameState.rookMoved.B.queenside = true;
                        if (blueId === 'b808') GameState.rookMoved.B.kingside = true;
                    }

                    document.getElementById(blueId).innerText = ''
                    item.innerText = blueText
                    coloring()
                    insertImage()
                    
                    // Track en passant target
                    const movedPieceForEP = GameState.board[item.id];
                    if (movedPieceForEP && movedPieceForEP.includes('pawn')) {
                        const fromRow = parseSquareId(blueId).row;
                        const toRow = parseSquareId(item.id).row;
                        const col = parseSquareId(item.id).col;
                        
                        if (movedPieceForEP === 'Wpawn' && fromRow === 2 && toRow === 4) {
                            GameState.enPassantTarget = `b30${col}`;
                        } else if (movedPieceForEP === 'Bpawn' && fromRow === 7 && toRow === 5) {
                            GameState.enPassantTarget = `b60${col}`;
                        } else {
                            GameState.enPassantTarget = null;
                        }
                    } else {
                        GameState.enPassantTarget = null;
                    }
                    
                    // Check for pawn promotion
                    const movedPiece = GameState.board[item.id];
                    if (movedPiece && movedPiece.includes('pawn')) {
                        const color = getPieceColor(movedPiece);
                        if (checkForPromotion(item.id, color)) {
                            tog = tog + 1;
                            GameState.moveInProgress = false;
                            return; // Wait for promotion choice
                        }
                    }
                    
                    // Update half-move clock (capture resets it)
                    const isPawnMove = movedPiece && movedPiece.includes('pawn');
                    updateHalfMoveClock(isPawnMove, true); // true = capture
                    
                    // Record position for threefold repetition
                    recordPosition();
                    
                    updateCheckStatus();
                    checkGameEnd();
                    
                    // UX Improvements
                    highlightLastMove(blueId, item.id);
                    updateMoveCounter();
                    addCapturedPiece(capturedPiece);
                    
                    tog = tog + 1
                    
                    // Reset move flag
                    GameState.moveInProgress = false;

                }
            })
            
            // Reset flag if no blue square was found
            GameState.moveInProgress = false;
        }



        let getId = item.id
        let arr = Array.from(getId)
        arr.shift()
        let aside = parseInt(arr.pop(), 10)
        arr.push('0')
        let aup = parseInt(arr.join(''), 10)
        let a = aside + aup

        //function to display the available paths for all pieces

        function whosTurn(toggle) {
            // Use GameState.board for piece detection (innerText has trailing spaces after images)
            const currentPiece = GameState.board[item.id];
            
            // PAWN

            if (currentPiece === `${toggle}pawn`) {
                item.style.backgroundColor = 'blue';

                if (tog % 2 !== 0 && aup < 800) {
                    // First move for white pawns
                    if (document.getElementById(`b${a + 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + 100}`, toggle);
                        if (document.getElementById(`b${a + 200}`).innerText.length == 0 && aup < 300) {
                            highlightIfLegal(item.id, `b${a + 200}`, toggle);
                        }
                    }
                    if (aside < 8 && document.getElementById(`b${a + 100 + 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + 100 + 1}`, toggle);
                    }
                    if (aside > 1 && document.getElementById(`b${a + 100 - 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + 100 - 1}`, toggle);
                    }
                    
                    // En passant capture for White
                    if (GameState.enPassantTarget) {
                        const { row: pawnRow, col: pawnCol } = parseSquareId(item.id);
                        const { row: epRow, col: epCol } = parseSquareId(GameState.enPassantTarget);
                        
                        if (pawnRow === 5 && epRow === 6 && Math.abs(pawnCol - epCol) === 1) {
                            highlightIfLegal(item.id, GameState.enPassantTarget, toggle);
                        }
                    }
                }

                if (tog % 2 == 0 && aup > 100) {
                    // First move for black pawns
                    if (document.getElementById(`b${a - 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - 100}`, toggle);
                        if (document.getElementById(`b${a - 200}`).innerText.length == 0 && aup > 600) {
                            highlightIfLegal(item.id, `b${a - 200}`, toggle);
                        }
                    }
                    if (aside < 8 && document.getElementById(`b${a - 100 + 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - 100 + 1}`, toggle);
                    }
                    if (aside > 1 && document.getElementById(`b${a - 100 - 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - 100 - 1}`, toggle);
                    }
                    
                    // En passant capture for Black
                    if (GameState.enPassantTarget) {
                        const { row: pawnRow, col: pawnCol } = parseSquareId(item.id);
                        const { row: epRow, col: epCol } = parseSquareId(GameState.enPassantTarget);
                        
                        if (pawnRow === 4 && epRow === 3 && Math.abs(pawnCol - epCol) === 1) {
                            highlightIfLegal(item.id, GameState.enPassantTarget, toggle);
                        }
                    }
                }
                // Second move for pawns
                if (tog % 2 !== 0 && aup >= 800) {
                    if (document.getElementById(`b${a + 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + 100}`, toggle);
                    }
                    if (aside < 8 && document.getElementById(`b${a + 100 + 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + 100 + 1}`, toggle);
                    }
                    if (aside > 1 && document.getElementById(`b${a + 100 - 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + 100 - 1}`, toggle);
                    }
                }
                if (tog % 2 == 0 && aup <= 100) {
                    if (document.getElementById(`b${a - 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - 100}`, toggle);
                    }
                    if (aside < 8 && document.getElementById(`b${a - 100 + 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - 100 + 1}`, toggle);
                    }
                    if (aside > 1 && document.getElementById(`b${a - 100 - 1}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - 100 - 1}`, toggle);
                    }
                }
            }

            // KING

            if (currentPiece === `${toggle}king`) {
                const enemyColor = toggle === 'W' ? 'B' : 'W';

                if (aside < 8) {
                    const targetSq = `b${a + 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aside > 1) {
                    const targetSq = `b${a - 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aup < 800) {
                    const targetSq = `b${a + 100}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aup > 100) {
                    const targetSq = `b${a - 100}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }

                if (aup > 100 && aside < 8) {
                    const targetSq = `b${a - 100 + 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aup > 100 && aside > 1) {
                    const targetSq = `b${a - 100 - 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aup < 800 && aside < 8) {
                    const targetSq = `b${a + 100 + 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }
                if (aup < 800 && aside > 1) {
                    const targetSq = `b${a + 100 - 1}`;
                    if (!wouldBeInCheck(item.id, targetSq, toggle)) {
                        document.getElementById(targetSq).style.backgroundColor = 'greenyellow';
                    }
                }

                // Castling - Kingside
                if (canCastle(toggle, 'kingside')) {
                    const row = toggle === 'W' ? 1 : 8;
                    const targetSquare = `b${row}07`;
                    if (!wouldBeInCheck(item.id, targetSquare, toggle)) {
                        document.getElementById(targetSquare).style.backgroundColor = 'greenyellow';
                    }
                }
                // Castling - Queenside
                if (canCastle(toggle, 'queenside')) {
                    const row = toggle === 'W' ? 1 : 8;
                    const targetSquare = `b${row}03`;
                    if (!wouldBeInCheck(item.id, targetSquare, toggle)) {
                        document.getElementById(targetSquare).style.backgroundColor = 'greenyellow';
                    }
                }

                item.style.backgroundColor = 'blue'

            }

            // KNIGHT

            if (currentPiece === `${toggle}knight`) {


                if (aside < 7 && aup < 800) {
                    highlightIfLegal(item.id, `b${a + 100 + 2}`, toggle);
                }
                if (aside < 7 && aup > 200) {
                    highlightIfLegal(item.id, `b${a - 100 + 2}`, toggle);
                }
                if (aside < 8 && aup < 700) {
                    highlightIfLegal(item.id, `b${a + 200 + 1}`, toggle);
                }
                if (aside > 1 && aup < 700) {
                    highlightIfLegal(item.id, `b${a + 200 - 1}`, toggle);
                }
                if (aside > 2 && aup < 800) {
                    highlightIfLegal(item.id, `b${a - 2 + 100}`, toggle);
                }
                if (aside > 2 && aup > 100) {
                    highlightIfLegal(item.id, `b${a - 2 - 100}`, toggle);
                }
                if (aside < 8 && aup > 200) {
                    highlightIfLegal(item.id, `b${a - 200 + 1}`, toggle);
                }
                if (aside > 1 && aup > 200) {
                    highlightIfLegal(item.id, `b${a - 200 - 1}`, toggle);
                }

                item.style.backgroundColor = 'blue'

            }

            // QUEEN

            if (currentPiece === `${toggle}queen`) {

                for (let i = 1; i < 9; i++) {

                    if ((a + i * 100) < 900 && document.getElementById(`b${a + i * 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100}`, toggle);
                    }
                    else if ((a + i * 100) < 900 && document.getElementById(`b${a + i * 100}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a - i * 100) > 100 && document.getElementById(`b${a - i * 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100}`, toggle);
                    }
                    else if ((a - i * 100) > 100 && document.getElementById(`b${a - i * 100}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a + i) < (aup + 9) && document.getElementById(`b${a + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i}`, toggle);
                    }
                    else if ((a + i) < (aup + 9) && document.getElementById(`b${a + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a - i) > (aup) && document.getElementById(`b${a - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i}`, toggle);
                    }
                    else if ((a - i) > (aup) && document.getElementById(`b${a - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i}`, toggle);
                        break
                    }
                }



                for (let i = 1; i < 9; i++) {
                    if (i < (900 - aup) / 100 && i < 9 - aside && document.getElementById(`b${a + i * 100 + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 + i}`, toggle);
                    }
                    else if (i < (900 - aup) / 100 && i < 9 - aside && document.getElementById(`b${a + i * 100 + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 + i}`, toggle);
                        break
                    }
                }


                for (let i = 1; i < 9; i++) {
                    if (i < aup / 100 && i < 9 - aside && document.getElementById(`b${a - i * 100 + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 + i}`, toggle);
                    }
                    else if (i < aup / 100 && i < 9 - aside && document.getElementById(`b${a - i * 100 + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 + i}`, toggle);
                        break
                    }
                }


                for (let i = 1; i < 9; i++) {
                    if (i < (900 - aup) / 100 && i < aside && document.getElementById(`b${a + i * 100 - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 - i}`, toggle);
                    }
                    else if (i < (900 - aup) / 100 && i < aside && document.getElementById(`b${a + i * 100 - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 - i}`, toggle);
                        break
                    }

                }


                for (let i = 1; i < 9; i++) {
                    if (i < aup / 100 && i < aside && document.getElementById(`b${a - i * 100 - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 - i}`, toggle);
                    }
                    else if (i < aup / 100 && i < aside && document.getElementById(`b${a - i * 100 - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 - i}`, toggle);
                        break
                    }
                }



                item.style.backgroundColor = 'blue'

            }

            // BISHOP

            if (currentPiece === `${toggle}bishop`) {


                for (let i = 1; i < 9; i++) {
                    if (i < (900 - aup) / 100 && i < 9 - aside && document.getElementById(`b${a + i * 100 + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 + i}`, toggle);
                    }
                    else if (i < (900 - aup) / 100 && i < 9 - aside && document.getElementById(`b${a + i * 100 + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 + i}`, toggle);
                        break
                    }
                }


                for (let i = 1; i < 9; i++) {
                    if (i < aup / 100 && i < 9 - aside && document.getElementById(`b${a - i * 100 + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 + i}`, toggle);
                    }
                    else if (i < aup / 100 && i < 9 - aside && document.getElementById(`b${a - i * 100 + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 + i}`, toggle);
                        break
                    }
                }


                for (let i = 1; i < 9; i++) {
                    if (i < (900 - aup) / 100 && i < aside && document.getElementById(`b${a + i * 100 - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 - i}`, toggle);
                    }
                    else if (i < (900 - aup) / 100 && i < aside && document.getElementById(`b${a + i * 100 - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100 - i}`, toggle);
                        break
                    }

                }


                for (let i = 1; i < 9; i++) {
                    if (i < aup / 100 && i < aside && document.getElementById(`b${a - i * 100 - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 - i}`, toggle);
                    }
                    else if (i < aup / 100 && i < aside && document.getElementById(`b${a - i * 100 - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100 - i}`, toggle);
                        break
                    }
                }



                item.style.backgroundColor = 'blue'

            }

            // ROOK

            if (currentPiece === `${toggle}rook`) {

                for (let i = 1; i < 9; i++) {

                    if ((a + i * 100) < 900 && document.getElementById(`b${a + i * 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i * 100}`, toggle);
                    }
                    else if ((a + i * 100) < 900 && document.getElementById(`b${a + i * 100}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i * 100}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a - i * 100) > 100 && document.getElementById(`b${a - i * 100}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i * 100}`, toggle);
                    }
                    else if ((a - i * 100) > 100 && document.getElementById(`b${a - i * 100}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i * 100}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a + i) < (aup + 9) && document.getElementById(`b${a + i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a + i}`, toggle);
                    }
                    else if ((a + i) < (aup + 9) && document.getElementById(`b${a + i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a + i}`, toggle);
                        break
                    }
                }

                for (let i = 1; i < 9; i++) {

                    if ((a - i) > (aup) && document.getElementById(`b${a - i}`).innerText.length == 0) {
                        highlightIfLegal(item.id, `b${a - i}`, toggle);
                    }
                    else if ((a - i) > (aup) && document.getElementById(`b${a - i}`).innerText.length !== 0) {
                        highlightIfLegal(item.id, `b${a - i}`, toggle);
                        break
                    }
                }

                item.style.backgroundColor = 'blue'
            }

        }

        // Toggling the turn

        if (tog % 2 !== 0) {
            document.getElementById('tog').innerText = "White's Turn"
            whosTurn('W')
        }
        if (tog % 2 == 0) {
            document.getElementById('tog').innerText = "Black's Turn"
            whosTurn('B')
        }

        reddish()



    })
})

// Moving the element
document.querySelectorAll('.box').forEach(hathiTest => {

    hathiTest.addEventListener('click', function () {

        if (hathiTest.style.backgroundColor == 'blue') {

            document.querySelectorAll('.box').forEach(hathiTest2 => {

                hathiTest2.addEventListener('click', function () {
                    if (hathiTest2.style.backgroundColor == 'greenyellow' && hathiTest2.innerText.length == 0) {
                        // Prevent multiple handlers from executing for the same move
                        if (GameState.moveInProgress) return;
                        GameState.moveInProgress = true;
                        
                        // Find the currently selected (blue) square at the time of move
                        let currentBlueSquare = null;
                        document.querySelectorAll('.box').forEach(sq => {
                            if (sq.style.backgroundColor == 'blue') {
                                currentBlueSquare = sq;
                            }
                        });
                        
                        if (!currentBlueSquare) {
                            GameState.moveInProgress = false;
                            return; // No piece selected
                        }
                        
                        const blueId = currentBlueSquare.id;
                        const blueText = GameState.board[blueId];
                        
                        if (!blueText) {
                            GameState.moveInProgress = false;
                            return; // No piece at selected square
                        }
                        
                        // Track if this is en passant (pawn moving diagonally to empty square)
                        const wasEnPassant = hathiTest2.id === GameState.enPassantTarget;
                        
                        // Update game state before move
                        GameState.board[hathiTest2.id] = GameState.board[blueId];
                        GameState.board[blueId] = null;
                        GameState.currentTurn = GameState.currentTurn === 'W' ? 'B' : 'W';
                        GameState.moveCount++;
                        
                        // Track king/rook movement for castling
                        const regularMovedPiece = GameState.board[hathiTest2.id];
                        if (regularMovedPiece === 'Wking') GameState.kingMoved.W = true;
                        if (regularMovedPiece === 'Bking') GameState.kingMoved.B = true;
                        if (regularMovedPiece === 'Wrook') {
                            if (blueId === 'b101') GameState.rookMoved.W.queenside = true;
                            if (blueId === 'b108') GameState.rookMoved.W.kingside = true;
                        }
                        if (regularMovedPiece === 'Brook') {
                            if (blueId === 'b801') GameState.rookMoved.B.queenside = true;
                            if (blueId === 'b808') GameState.rookMoved.B.kingside = true;
                        }
                        
                        // Handle castling rook movement
                        if (regularMovedPiece && regularMovedPiece.includes('king')) {
                            const { col: fromCol } = parseSquareId(blueId);
                            const { col: toCol, row } = parseSquareId(hathiTest2.id);
                            
                            // Kingside castling
                            if (fromCol === 5 && toCol === 7) {
                                AudioManager.playSound('castle');
                                const rookFrom = `b${row}08`;
                                const rookTo = `b${row}06`;
                                GameState.board[rookTo] = GameState.board[rookFrom];
                                GameState.board[rookFrom] = null;
                                // Update DOM for rook
                                const rookPiece = GameState.board[rookTo];
                                document.getElementById(rookFrom).innerText = '';
                                document.getElementById(rookTo).innerText = rookPiece;
                            }
                            // Queenside castling
                            else if (fromCol === 5 && toCol === 3) {
                                AudioManager.playSound('castle');
                                const rookFrom = `b${row}01`;
                                const rookTo = `b${row}04`;
                                GameState.board[rookTo] = GameState.board[rookFrom];
                                GameState.board[rookFrom] = null;
                                // Update DOM for rook
                                const rookPiece = GameState.board[rookTo];
                                document.getElementById(rookFrom).innerText = '';
                                document.getElementById(rookTo).innerText = rookPiece;
                            }
                        }
                        
                        // Handle en passant capture
                        if (wasEnPassant && regularMovedPiece && regularMovedPiece.includes('pawn')) {
                            AudioManager.playSound('capture');
                            const { col: toCol, row: toRow } = parseSquareId(hathiTest2.id);
                            const capturedRow = regularMovedPiece === 'Wpawn' ? toRow - 1 : toRow + 1;
                            const capturedSquare = `b${capturedRow}0${toCol}`;
                            // Track the captured pawn for display
                            const enPassantCapturedPiece = GameState.board[capturedSquare];
                            addCapturedPiece(enPassantCapturedPiece);
                            GameState.board[capturedSquare] = null;
                            document.getElementById(capturedSquare).innerHTML = '';
                        }
                        
                        // Track en passant target
                        if (regularMovedPiece && regularMovedPiece.includes('pawn')) {
                            const fromRow = parseSquareId(blueId).row;
                            const toRow = parseSquareId(hathiTest2.id).row;
                            const col = parseSquareId(hathiTest2.id).col;
                            
                            if (regularMovedPiece === 'Wpawn' && fromRow === 2 && toRow === 4) {
                                GameState.enPassantTarget = `b30${col}`;
                            } else if (regularMovedPiece === 'Bpawn' && fromRow === 7 && toRow === 5) {
                                GameState.enPassantTarget = `b60${col}`;
                            } else {
                                GameState.enPassantTarget = null;
                            }
                        } else {
                            GameState.enPassantTarget = null;
                        }

                        document.getElementById(blueId).innerText = ''
                        hathiTest2.innerText = blueText
                        coloring()
                        insertImage()
                        
                        // Check for pawn promotion
                        const movedPiece = GameState.board[hathiTest2.id];
                        if (movedPiece && movedPiece.includes('pawn')) {
                            const color = getPieceColor(movedPiece);
                            if (checkForPromotion(hathiTest2.id, color)) {
                                GameState.moveInProgress = false;
                                return; // Wait for promotion choice
                            }
                        }
                        
                        // Update half-move clock (non-capture move)
                        const isPawnMove = movedPiece && movedPiece.includes('pawn');
                        const isEnPassantCapture = wasEnPassant && isPawnMove;
                        updateHalfMoveClock(isPawnMove, isEnPassantCapture);
                        
                        // Record position for threefold repetition
                        recordPosition();
                        
                        // Play move sound (unless it was a special sound already)
                        if (!wasEnPassant && !(regularMovedPiece && regularMovedPiece.includes('king') && Math.abs(parseSquareId(blueId).col - parseSquareId(hathiTest2.id).col) === 2)) {
                            AudioManager.playSound('move');
                        }
                        
                        updateCheckStatus();
                        checkGameEnd();
                        
                        // UX Improvements
                        highlightLastMove(blueId, hathiTest2.id);
                        updateMoveCounter();
                        
                        // Reset move flag
                        GameState.moveInProgress = false;
                    }

                })
            })

        }

    })

})




// Prvents from selecting multiple elements
let z = 0
document.querySelectorAll('.box').forEach(ee => {
  ee.addEventListener('click', function () {
      z = z + 1
      if (z % 2 == 0 && ee.style.backgroundColor !== 'greenyellow') {
          coloring()
      }
  })
})
