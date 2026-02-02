/**
 * Tic Tac Toe - Game Logic
 * 
 * Rules implemented:
 * - 3x3 grid with alternating X/O turns
 * - X always moves first
 * - Win detection for 8 possible lines
 * - Draw detection when board is full
 * - Game locks after completion
 * 
 * @author [preserved]
 */

// ============================================
// Sound System
// ============================================

let soundEnabled = true;
let musicEnabled = false;
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// Background music
let backgroundMusic = null;
const MUSIC_PATH = 'music/alexgrohl-sweet-life-luxury-chill-438146.mp3';

/**
 * Initialize audio context on first user interaction
 */
function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

/**
 * Initialize background music
 */
function initBackgroundMusic() {
    if (!backgroundMusic) {
        backgroundMusic = new Audio(MUSIC_PATH);
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.3; // 30% volume for background
    }
}

/**
 * Toggle background music on/off
 */
function toggleMusic() {
    initBackgroundMusic();
    musicEnabled = !musicEnabled;
    
    const btn = document.querySelector('.music-toggle');
    if (btn) {
        btn.textContent = musicEnabled ? '🎶' : '🎵';
        btn.setAttribute('aria-label', musicEnabled ? 'Music playing, click to stop' : 'Music stopped, click to play');
        btn.classList.toggle('music-playing', musicEnabled);
    }
    
    if (musicEnabled) {
        backgroundMusic.play().catch(e => {
            console.log('Music autoplay prevented:', e);
            musicEnabled = false;
            if (btn) {
                btn.textContent = '🎵';
                btn.classList.remove('music-playing');
            }
        });
    } else {
        backgroundMusic.pause();
    }
}

/**
 * Create and play a synthesized sound effect
 * @param {string} type - Type of sound: 'click', 'win', 'draw', 'error', 'reset'
 */
function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    
    // Resume audio context if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'click':
            // Soft pop sound
            playSynthSound(600, 0.1, 'sine', 0.15);
            break;
        case 'win':
            // Victory fanfare - ascending notes
            playSynthSound(523, 0.15, 'sine', 0.2); // C5
            setTimeout(() => playSynthSound(659, 0.15, 'sine', 0.2), 100); // E5
            setTimeout(() => playSynthSound(784, 0.15, 'sine', 0.2), 200); // G5
            setTimeout(() => playSynthSound(1047, 0.25, 'sine', 0.25), 300); // C6
            break;
        case 'draw':
            // Neutral descending tone
            playSynthSound(400, 0.2, 'sine', 0.15);
            setTimeout(() => playSynthSound(350, 0.25, 'sine', 0.15), 150);
            break;
        case 'error':
            // Short buzz
            playSynthSound(150, 0.1, 'square', 0.1);
            break;
        case 'reset':
            // Whoosh-like sweep
            playSweepSound(800, 300, 0.15, 0.1);
            break;
    }
}

/**
 * Play a synthesized tone
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} waveType - Oscillator type: 'sine', 'square', 'triangle', 'sawtooth'
 * @param {number} volume - Volume 0-1
 */
function playSynthSound(frequency, duration, waveType = 'sine', volume = 0.2) {
    if (!audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = waveType;
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

/**
 * Play a frequency sweep sound (for whoosh effects)
 * @param {number} startFreq - Starting frequency in Hz
 * @param {number} endFreq - Ending frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {number} volume - Volume 0-1
 */
function playSweepSound(startFreq, endFreq, duration, volume = 0.15) {
    if (!audioCtx) return;
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

/**
 * Toggle sound effects on/off
 */
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.querySelector('.sound-toggle');
    if (btn) {
        btn.textContent = soundEnabled ? '🔊' : '🔇';
        btn.setAttribute('aria-label', soundEnabled ? 'Sound effects on, click to mute' : 'Sound effects off, click to unmute');
    }
    if (soundEnabled) {
        playSound('click');
    }
}

// ============================================
// Game State
// ============================================

const statusDisplay = document.querySelector('.game--status');

let gameActive = true;

let currentPlayer = "X";

let gameState = ["", "", "", "", "", "", "", "", ""];

let scores = { X: 0, O: 0, draw: 0 };

const winningMessage = () => `Player ${currentPlayer} has won!`;
const drawMessage = () => `Game ended in a draw!`;
const currentPlayerTurn = () => `It's ${currentPlayer}'s turn`;

statusDisplay.innerHTML = currentPlayerTurn();

document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('click', handleCellClick));
document.querySelectorAll('.cell').forEach(cell => cell.addEventListener('keydown', handleCellKeydown));
document.querySelector('.game--restart').addEventListener('click', handleRestartGame);
document.querySelector('.game--reset-scores').addEventListener('click', handleResetScores);
document.querySelector('.sound-toggle').addEventListener('click', toggleSound);
document.querySelector('.music-toggle').addEventListener('click', toggleMusic);

// Initialize audio on first interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

/**
 * Handles keyboard events on cells (Enter or Space to place symbol)
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleCellKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleCellClick(event);
    }
}

/**
 * Announces a message to screen readers via the live region
 * @param {string} message - The message to announce
 */
function announce(message) {
    const announcer = document.getElementById('game-announcer');
    if (announcer) {
        announcer.textContent = message;
    }
}

/**
 * Handles click event on a game cell
 * @param {Event} clickedCellEvent - The click event from the cell
 */
function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(
        clickedCell.getAttribute('data-cell-index')
    );

    if (gameState[clickedCellIndex] !== "" || !gameActive) {
        // Play error sound for invalid move
        if (gameState[clickedCellIndex] !== "") {
            playSound('error');
        }
        return;
    }

    handleCellPlayed(clickedCell, clickedCellIndex);
    handleResultValidation();
}

/**
 * Updates game state and cell display
 * @param {HTMLElement} clickedCell - The DOM element of the clicked cell
 * @param {number} clickedCellIndex - The index of the clicked cell (0-8)
 */
function handleCellPlayed(clickedCell, clickedCellIndex) {

    gameState[clickedCellIndex] = currentPlayer;
    clickedCell.innerHTML = currentPlayer;
    
    // Add class for color differentiation
    clickedCell.classList.add(currentPlayer.toLowerCase());
    
    // Update aria-label for accessibility
    clickedCell.setAttribute('aria-label', `Cell ${clickedCellIndex + 1}, ${currentPlayer}`);
    
    // Announce the move to screen readers
    announce(`${currentPlayer} placed at cell ${clickedCellIndex + 1}`);
    
    // Play click sound
    playSound('click');
}

const winningConditions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

/**
 * Checks for win or draw conditions
 * Updates game status and deactivates game if round is won or drawn
 */
function handleResultValidation() {
    let roundWon = false;
    let winningCells = null;
    for (let i = 0; i <= 7; i++) {
        const winCondition = winningConditions[i];
        let a = gameState[winCondition[0]];
        let b = gameState[winCondition[1]];
        let c = gameState[winCondition[2]];
        if (a === '' || b === '' || c === "") {
            continue;
        }
        if (a === b && b === c) {
            roundWon = true;
            winningCells = winCondition;
            break
        }
    }
    if (roundWon) {
        statusDisplay.innerHTML = winningMessage();
        statusDisplay.classList.add('win-message');
        gameActive = false;
        
        // Add winner class to winning cells and disable all cells
        const cells = document.querySelectorAll('.cell');
        winningCells.forEach(index => {
            cells[index].classList.add('winner');
        });
        cells.forEach(cell => cell.classList.add('disabled'));
        
        // Update score with animation
        scores[currentPlayer]++;
        updateScoreDisplay();
        animateScoreUpdate(currentPlayer);
        
        // Announce the winner to screen readers
        announce(`${currentPlayer} wins!`);
        
        // Play win sound
        playSound('win');
        return;
    }

    let roundDraw = !gameState.includes('');
    if (roundDraw) {
        statusDisplay.innerHTML = drawMessage();
        statusDisplay.classList.add('draw-message');
        gameActive = false;
        
        // Add disabled and draw-state classes to all cells
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.add('disabled');
            cell.classList.add('draw-state');
        });
        
        // Update score with animation
        scores.draw++;
        updateScoreDisplay();
        animateScoreUpdate('draw');
        
        // Announce the draw to screen readers
        announce('Game ended in a draw');
        
        // Play draw sound
        playSound('draw');
        return;
    }

    handlePlayerChange();
}

/**
 * Switches current player from X to O or vice versa
 * Updates the status display with the new player's turn
 */
function handlePlayerChange() {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    statusDisplay.innerHTML = currentPlayerTurn();
}

/**
 * Resets the game to initial state
 * Clears all cells, resets game state array, and sets X as current player
 */
function handleRestartGame() {
    gameActive = true;
    currentPlayer = "X";
    gameState = ["", "", "", "", "", "", "", "", ""];
    statusDisplay.innerHTML = currentPlayerTurn();
    statusDisplay.classList.remove('win-message', 'draw-message');
    document.querySelectorAll('.cell')
        .forEach((cell, index) => {
            cell.innerHTML = "";
            // Remove visual feedback classes
            cell.classList.remove('x', 'o', 'winner', 'disabled', 'draw-state');
            // Reset aria-label
            cell.setAttribute('aria-label', `Cell ${index + 1}, empty`);
        });
    
    // Clear screen reader announcer
    announce('');
    
    // Play reset sound
    playSound('reset');
}

/**
 * Updates the score display in the DOM
 */
function updateScoreDisplay() {
    document.getElementById('x-score').textContent = scores.X;
    document.getElementById('o-score').textContent = scores.O;
    document.getElementById('draw-score').textContent = scores.draw;
}

/**
 * Resets all scores to zero
 */
function handleResetScores() {
    scores = { X: 0, O: 0, draw: 0 };
    updateScoreDisplay();
    announce('Scores reset');
    playSound('reset');
}

/**
 * Animates the score update for visual feedback
 * @param {string} player - 'X', 'O', or 'draw'
 */
function animateScoreUpdate(player) {
    let scoreElement;
    if (player === 'X') {
        scoreElement = document.getElementById('x-score');
    } else if (player === 'O') {
        scoreElement = document.getElementById('o-score');
    } else {
        scoreElement = document.getElementById('draw-score');
    }
    
    if (scoreElement) {
        scoreElement.classList.add('score-updated');
        setTimeout(() => {
            scoreElement.classList.remove('score-updated');
        }, 400);
    }
}
