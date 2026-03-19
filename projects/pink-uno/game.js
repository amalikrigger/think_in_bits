/**
 * ===========================================
 * UNO Card Game - Complete Game Logic
 * ===========================================
 * 
 * This file contains all game logic including:
 * - Card and Deck classes
 * - Game state management
 * - Turn and rule enforcement
 * - AI player behavior
 * - UI rendering and event handling
 * - Sound effects management
 */

// ===========================================
// SOUND EFFECTS MANAGER (Web Audio API)
// ===========================================

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playNoise(duration, volume = 0.2) {
        if (!this.enabled || !this.audioContext) return;

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        noise.start();
        noise.stop(this.audioContext.currentTime + duration);
    }

    // Card play sound - satisfying "pop"
    playCardSound() {
        this.playTone(800, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.2), 50);
    }

    // Card draw sound - soft swoosh
    playDrawSound() {
        this.playNoise(0.15, 0.15);
        this.playTone(400, 0.1, 'sine', 0.1);
    }

    // UNO alert sound - exciting fanfare
    playUnoSound() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.25), i * 100);
        });
    }

    // Win sound - victory melody
    playWinSound() {
        const melody = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major scale
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.3), i * 80);
        });
        setTimeout(() => {
            this.playTone(1047, 0.5, 'sine', 0.4);
            this.playTone(784, 0.5, 'sine', 0.3);
            this.playTone(523, 0.5, 'sine', 0.2);
        }, 700);
    }

    // Shuffle sound
    playShuffleSound() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playNoise(0.05, 0.1), i * 60);
        }
    }

    // Invalid move sound
    playInvalidSound() {
        this.playTone(200, 0.15, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.15), 100);
    }

    // Button click sound
    playClickSound() {
        this.playTone(600, 0.05, 'sine', 0.2);
    }

    // Skip card sound - whoosh past
    playSkipSound() {
        this.playTone(800, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(400, 0.15, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(200, 0.1, 'sine', 0.1), 150);
    }

    // Reverse card sound - spinning effect
    playReverseSound() {
        const freqs = [400, 500, 600, 700, 600, 500, 400];
        freqs.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.08, 'triangle', 0.2), i * 50);
        });
    }

    // Draw 2 card sound - double hit
    playDraw2Sound() {
        this.playTone(300, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(350, 0.1, 'square', 0.2), 120);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.25), 240);
    }

    // Wild card sound - magical shimmer
    playWildSound() {
        const shimmer = [523, 659, 784, 1047, 1319, 1568];
        shimmer.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.15), i * 40);
        });
    }

    // Wild Draw 4 sound - dramatic power up
    playWildDraw4Sound() {
        // Low rumble
        this.playTone(100, 0.3, 'sawtooth', 0.15);
        // Rising power
        setTimeout(() => {
            const rise = [200, 300, 400, 600, 800, 1000, 1200];
            rise.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 0.1, 'square', 0.2), i * 35);
            });
        }, 100);
        // Final blast
        setTimeout(() => this.playTone(1500, 0.25, 'sawtooth', 0.3), 400);
    }

    // Your turn notification - gentle chime
    playYourTurnSound() {
        this.playTone(880, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.25), 150);
    }

    // Opponent plays - subtle notification
    playOpponentSound() {
        this.playTone(500, 0.08, 'triangle', 0.15);
    }

    // Card hover sound - soft tick
    playHoverSound() {
        this.playTone(1200, 0.03, 'sine', 0.1);
    }

    // Game start jingle - cute melody
    playGameStartSound() {
        const melody = [523, 659, 784, 659, 523, 784, 1047];
        const durations = [0.1, 0.1, 0.1, 0.1, 0.1, 0.15, 0.3];
        let time = 0;
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, durations[i], 'sine', 0.25), time);
            time += durations[i] * 800;
        });
    }

    // Penalty sound - uh oh!
    playPenaltySound() {
        this.playTone(300, 0.15, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(250, 0.15, 'sawtooth', 0.18), 150);
        setTimeout(() => this.playTone(200, 0.2, 'sawtooth', 0.15), 300);
    }

    // Color selected sound - confirmation ping
    playColorSelectSound() {
        this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.25), 100);
        setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.2), 200);
    }

    // Sparkle effect - for special moments
    playSparkleSound() {
        const sparkles = [1200, 1400, 1600, 1800, 2000];
        sparkles.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.08, 'sine', 0.1 + Math.random() * 0.1), i * 50 + Math.random() * 30);
        });
    }

    // Dramatic tension sound - when someone has few cards
    playTensionSound() {
        this.playTone(150, 0.3, 'triangle', 0.15);
        setTimeout(() => this.playTone(160, 0.3, 'triangle', 0.18), 400);
        setTimeout(() => this.playTone(170, 0.3, 'triangle', 0.2), 800);
    }

    // Last card warning sound!
    playLastCardSound() {
        const notes = [600, 800, 600, 800, 1000];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'square', 0.15), i * 120);
        });
    }

    // Exciting moment - for when winning is close
    playExcitingSound() {
        const notes = [523, 659, 784, 1047]; // C major chord arpeggio
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.2), i * 100);
        });
    }

    // Yelling sound effect for drawing cards - LOUD MEME VERSION
    playYellSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const duration = 0.5;
        
        // Main loud crunchy oscillator
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const dist = this.audioContext.createWaveShaper();

        // Distortion curve for that "fried" meme sound
        function makeDistortionCurve(amount) {
            let k = typeof amount === 'number' ? amount : 50,
                n_samples = 44100,
                curve = new Float32Array(n_samples),
                deg = Math.PI / 180,
                i = 0,
                x;
            for ( ; i < n_samples; ++i ) {
                x = i * 2 / n_samples - 1;
                curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
            }
            return curve;
        }
        dist.curve = makeDistortionCurve(400);

        osc1.type = 'sawtooth';
        osc2.type = 'square'; // Added for extra crunch
        
        // Chaotic frequency sweep (AUGH-like)
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        osc1.frequency.exponentialRampToValueAtTime(100, now + duration);

        osc2.frequency.setValueAtTime(155, now); // Slightly detuned
        osc2.frequency.exponentialRampToValueAtTime(1210, now + 0.1);
        osc2.frequency.exponentialRampToValueAtTime(105, now + duration);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.05); // LOUDER
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc1.connect(dist);
        osc2.connect(dist);
        dist.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);

        // Add extra white noise blast
        this.playNoise(0.3, 0.4);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global sound manager instance
const soundManager = new SoundManager();

// ===========================================
// FLYING UNICORN EFFECT
// ===========================================

/**
 * Trigger a flying unicorn across the screen for special cards
 */
function triggerFlyingUnicorn() {
    // Create rainbow background flash
    const rainbow = document.createElement('div');
    rainbow.className = 'unicorn-rainbow';
    document.body.appendChild(rainbow);
    
    // Create the unicorn
    const unicorn = document.createElement('div');
    unicorn.className = 'flying-unicorn';
    unicorn.textContent = '🦄';
    document.body.appendChild(unicorn);
    
    // Create sparkle trail
    const sparkleInterval = setInterval(() => {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: fixed;
            font-size: 1.5rem;
            z-index: 9999;
            pointer-events: none;
            left: ${unicorn.offsetLeft - 50 + Math.random() * 30}px;
            top: ${unicorn.offsetTop + Math.random() * 50}px;
            animation: sparkleTrail 0.5s ease-out forwards;
        `;
        sparkle.textContent = ['✨', '💫', '⭐', '🌟', '💖'][Math.floor(Math.random() * 5)];
        document.body.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 500);
    }, 100);
    
    // Clean up after animation
    setTimeout(() => {
        clearInterval(sparkleInterval);
        unicorn.remove();
        rainbow.remove();
    }, 2000);
}

/**
 * Trigger a glitter rain effect
 */
function triggerGlitterRain() {
    const colors = ['#FFD700', '#FF69B4', '#00E5FF', '#FF00FF', '#FFFFFF', '#FFB6C1'];
    const particlesCount = 100;
    const icons = ['✨', '⭐', '💖', '💎', '🌸'];

    for (let i = 0; i < particlesCount; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'glitter-particle';
            
            const size = Math.random() * 1.5 + 0.5;
            const left = Math.random() * 100;
            const duration = Math.random() * 3 + 2;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const icon = icons[Math.floor(Math.random() * icons.length)];

            particle.style.left = left + 'vw';
            particle.style.fontSize = size + 'rem';
            particle.style.color = color;
            particle.style.animationDuration = duration + 's';
            particle.style.textShadow = `0 0 10px ${color}`;
            particle.textContent = icon;

            document.body.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        }, i * 50); // Staggered start
    }
}

// Start glitter rain loop
setInterval(triggerGlitterRain, 20000); // Every 20 seconds
// Initial trigger after 5 seconds
setTimeout(triggerGlitterRain, 5000);

// ===========================================
// CONSTANTS
// ===========================================

const COLORS = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTIONS = ['Skip', 'Reverse', 'Draw_2'];
const WILDS = ['Wild', 'Wild_Draw_4'];

// Pink cards: special unique abilities, one of each in the deck
const PINK_CARDS = ['Pink_Bomb', 'Pink_Shuffle', 'Pink_Peek', 'Pink_Shield'];

const PLAYER_COUNT = 4;
const STARTING_HAND_SIZE = 7;
const AI_TURN_DELAY = 1200; // milliseconds

// ===========================================
// CARD CLASS
// ===========================================

/**
 * Represents a single UNO card
 */
class Card {
    /**
     * @param {string|null} color - Card color (red, blue, green, yellow, or null for wild)
     * @param {string} value - Card value (0-9, Skip, Reverse, Draw_2, Wild, Wild_Draw_4)
     */
    constructor(color, value) {
        this.color = color;
        this.value = value;
        this.id = `${color || 'wild'}_${value}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get the image path for this card
     * Handles the RED_Reverse.jpg naming inconsistency
     * @returns {string} Path to card image
     */
    getImagePath() {
        // Pink cards use a special rendered image
        if (this.color === 'pink') {
            return `cards/Pink_${this.value.replace('Pink_', '')}.jpg`;
        }
        
        if (this.color === null) {
            // Wild cards
            return `cards/${this.value}.jpg`;
        }
        
        // Handle the RED_Reverse naming inconsistency
        let colorName = this.color.charAt(0).toUpperCase() + this.color.slice(1);
        if (this.color === 'red' && this.value === 'Reverse') {
            colorName = 'RED';
        }
        
        return `cards/${colorName}_${this.value}.jpg`;
    }

    /**
     * Check if this card is an action card
     * @returns {boolean}
     */
    isAction() {
        return ACTIONS.includes(this.value);
    }

    /**
     * Check if this card is a wild card
     * @returns {boolean}
     */
    isWild() {
        return this.color === null;
    }

    /**
     * Check if this is a pink special card
     * @returns {boolean}
     */
    isPink() {
        return this.color === 'pink';
    }

    /**
     * Get display name for the card
     * @returns {string}
     */
    getDisplayName() {
        const colorStr = this.color ? this.color.charAt(0).toUpperCase() + this.color.slice(1) : '';
        const valueStr = this.value.replace(/_/g, ' ');
        return this.color ? `${colorStr} ${valueStr}` : valueStr;
    }
}

// ===========================================
// DECK CLASS
// ===========================================

/**
 * Represents the UNO deck with all 108 cards
 */
class Deck {
    constructor() {
        this.cards = [];
        this.createDeck();
        this.shuffle();
    }

    /**
     * Create a standard 108-card UNO deck
     * - One 0 per color
     * - Two of each 1-9 per color
     * - Two of each action card per color
     * - Four Wild cards
     * - Four Wild Draw Four cards
     */
    createDeck() {
        this.cards = [];

        for (const color of COLORS) {
            // One 0 per color
            this.cards.push(new Card(color, '0'));

            // Two of each 1-9 per color
            for (let i = 1; i <= 9; i++) {
                this.cards.push(new Card(color, i.toString()));
                this.cards.push(new Card(color, i.toString()));
            }

            // Two of each action card per color
            for (const action of ACTIONS) {
                this.cards.push(new Card(color, action));
                this.cards.push(new Card(color, action));
            }
        }

        // Four Wild cards
        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card(null, 'Wild'));
        }

        // Four Wild Draw Four cards
        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card(null, 'Wild_Draw_4'));
        }

        // Pink special cards (one each)
        for (const pinkType of PINK_CARDS) {
            this.cards.push(new Card('pink', pinkType));
        }
    }

    /**
     * Fisher-Yates shuffle algorithm
     * Ensures a truly random shuffle of the deck
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Draw a card from the top of the deck
     * @returns {Card|null}
     */
    draw() {
        return this.cards.pop() || null;
    }

    /**
     * Draw multiple cards
     * @param {number} count
     * @returns {Card[]}
     */
    drawMultiple(count) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) drawn.push(card);
        }
        return drawn;
    }

    /**
     * Check if deck is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.cards.length === 0;
    }

    /**
     * Get remaining card count
     * @returns {number}
     */
    count() {
        return this.cards.length;
    }

    /**
     * Add cards to bottom of deck
     * @param {Card[]} cards
     */
    addToBottom(cards) {
        this.cards.unshift(...cards);
    }
}

// ===========================================
// PLAYER CLASS
// ===========================================

/**
 * Represents a player (human or AI)
 */
class Player {
    /**
     * @param {string} name
     * @param {boolean} isHuman
     * @param {number} index
     */
    constructor(name, isHuman, index) {
        this.name = name;
        this.isHuman = isHuman;
        this.index = index;
        this.hand = [];
        this.saidUno = false;
    }

    /**
     * Add a card to the player's hand
     * @param {Card} card
     */
    addCard(card) {
        this.hand.push(card);
        this.saidUno = false; // Reset UNO status when drawing
    }

    /**
     * Add multiple cards to hand
     * @param {Card[]} cards
     */
    addCards(cards) {
        cards.forEach(card => this.addCard(card));
    }

    /**
     * Remove a card from hand by ID
     * @param {string} cardId
     * @returns {Card|null}
     */
    removeCard(cardId) {
        const index = this.hand.findIndex(card => card.id === cardId);
        if (index !== -1) {
            return this.hand.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * Check if player has any playable cards
     * @param {Card} topCard
     * @param {string} currentColor
     * @returns {boolean}
     */
    hasPlayableCard(topCard, currentColor) {
        return this.hand.some(card => this.canPlay(card, topCard, currentColor));
    }

    /**
     * Get all playable cards
     * @param {Card} topCard
     * @param {string} currentColor
     * @returns {Card[]}
     */
    getPlayableCards(topCard, currentColor) {
        return this.hand.filter(card => this.canPlay(card, topCard, currentColor));
    }

    /**
     * Check if a specific card can be played
     * @param {Card} card
     * @param {Card} topCard
     * @param {string} currentColor
     * @returns {boolean}
     */
    canPlay(card, topCard, currentColor) {
        // Pink cards can always be played (like wild)
        if (card.isPink()) {
            return true;
        }

        // Wild cards can always be played
        if (card.isWild()) {
            return true;
        }

        // Match by color
        if (card.color === currentColor) {
            return true;
        }

        // Match by value/symbol (number or action)
        if (card.value === topCard.value) {
            return true;
        }

        return false;
    }

    /**
     * Get card count
     * @returns {number}
     */
    cardCount() {
        return this.hand.length;
    }

    /**
     * Check if player has won (no cards left)
     * @returns {boolean}
     */
    hasWon() {
        return this.hand.length === 0;
    }
}

// ===========================================
// GAME STATE CLASS
// ===========================================

/**
 * Main game state manager
 */
class GameState {
    constructor() {
        this.players = [];
        this.drawPile = null;
        this.discardPile = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 = clockwise, -1 = counterclockwise
        this.currentColor = null;
        this.gameOver = false;
        this.winner = null;
        this.isProcessingTurn = false;
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.backgroundMusic = null;
        this.pendingColorChoice = false;
        this.drawPenalty = 0; // Accumulated draw penalty from stacked Draw_2 / Wild_Draw_4
        this.hasDrawnThisTurn = false; // Enforce single draw per turn
        this.shieldedPlayerIndex = -1; // Player protected by Pink Shield (-1 = none)
        this.pendingPeekSteal = null; // Pending Peek & Steal interaction data
        this.localMultiplayer = false; // True when playing local pass-and-play
        this.playerPins = {}; // PIN map: playerIndex -> 4-digit string (or null)
        this.justPassedTo = false; // Flag: next human turn needs pass screen
    }

    /**
     * Initialize a new game
     * @param {Array<{name: string, isHuman: boolean, pin?: string}>} [playerConfig] - Optional player config for local multiplayer
     */
    initGame(playerConfig) {
        // Reset state
        this.gameOver = false;
        this.winner = null;
        this.direction = 1;
        this.currentPlayerIndex = 0;
        this.discardPile = [];
        this.isProcessingTurn = false;
        this.pendingColorChoice = false;
        this.drawPenalty = 0;
        this.hasDrawnThisTurn = false;
        this.shieldedPlayerIndex = -1;
        this.pendingPeekSteal = null;
        this.justPassedTo = false;
        this.playerPins = {};

        // Create players from config or default
        if (playerConfig && playerConfig.length > 0) {
            this.players = playerConfig.map((cfg, i) => new Player(cfg.name, cfg.isHuman, i));
            playerConfig.forEach((cfg, i) => {
                if (cfg.pin) this.playerPins[i] = cfg.pin;
            });
        } else {
            this.players = [
                new Player('You', true, 0),
                new Player('Bot 1', false, 1),
                new Player('Bot 2', false, 2),
                new Player('Bot 3', false, 3)
            ];
        }

        // Create and shuffle deck
        this.drawPile = new Deck();
        
        // Play shuffle sound
        this.playSound('shuffle');

        // Deal 7 cards to each player
        for (const player of this.players) {
            player.addCards(this.drawPile.drawMultiple(STARTING_HAND_SIZE));
        }

        // Flip first card to discard pile
        // Make sure first card is not a Wild Draw 4
        let firstCard = this.drawPile.draw();
        while (firstCard.value === 'Wild_Draw_4') {
            this.drawPile.addToBottom([firstCard]);
            this.drawPile.shuffle();
            firstCard = this.drawPile.draw();
        }
        
        this.discardPile.push(firstCard);
        
        // Set initial color
        if (firstCard.isWild()) {
            // Random color for initial wild
            this.currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        } else {
            this.currentColor = firstCard.color;
        }

        // Handle special first card effects
        this.handleFirstCardEffect(firstCard);
    }

    /**
     * Handle effects of the first card flipped
     * @param {Card} card
     */
    handleFirstCardEffect(card) {
        switch (card.value) {
            case 'Skip':
                // Skip first player
                this.currentPlayerIndex = this.getNextPlayerIndex();
                break;
            case 'Reverse':
                // Reverse direction (in 4-player game, acts like skip in 2-player)
                this.direction *= -1;
                break;
            case 'Draw_2':
                // First player draws 2 and is skipped
                const player = this.getCurrentPlayer();
                player.addCards(this.drawCards(2));
                this.currentPlayerIndex = this.getNextPlayerIndex();
                break;
        }
    }

    /**
     * Get the current player
     * @returns {Player}
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    /**
     * Get the top card of the discard pile
     * @returns {Card}
     */
    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    /**
     * Get the next player index based on direction
     * @returns {number}
     */
    getNextPlayerIndex() {
        let next = this.currentPlayerIndex + this.direction;
        if (next >= PLAYER_COUNT) next = 0;
        if (next < 0) next = PLAYER_COUNT - 1;
        return next;
    }

    /**
     * Draw cards from draw pile, reshuffling discard if needed
     * @param {number} count
     * @returns {Card[]}
     */
    drawCards(count) {
        const drawn = [];
        
        for (let i = 0; i < count; i++) {
            // Check if draw pile is empty
            if (this.drawPile.isEmpty()) {
                this.reshuffleDiscard();
            }
            
            const card = this.drawPile.draw();
            if (card) {
                drawn.push(card);
            }
        }
        
        return drawn;
    }

    /**
     * Reshuffle discard pile into draw pile (keeping top card)
     */
    reshuffleDiscard() {
        if (this.discardPile.length <= 1) return;

        const topCard = this.discardPile.pop();
        const cardsToShuffle = this.discardPile.splice(0);
        
        this.drawPile.addToBottom(cardsToShuffle);
        this.drawPile.shuffle();
        
        this.discardPile = [topCard];
    }

    /**
     * Play a card from a player's hand
     * @param {Player} player
     * @param {Card} card
     * @param {string} chosenColor - For wild cards
     * @returns {boolean} Success
     */
    playCard(player, card, chosenColor = null) {
        // Verify it's this player's turn
        if (player.index !== this.currentPlayerIndex) {
            return false;
        }

        // Verify card is playable
        if (!player.canPlay(card, this.getTopCard(), this.currentColor)) {
            return false;
        }

        // Remove card from hand
        const playedCard = player.removeCard(card.id);
        if (!playedCard) return false;

        // Add to discard pile
        this.discardPile.push(playedCard);

        // Update current color (pink cards don't change color)
        if (playedCard.isWild()) {
            this.currentColor = chosenColor;
        } else if (!playedCard.isPink()) {
            this.currentColor = playedCard.color;
        }

        // Play sound
        this.playSound('play');

        // Check for UNO
        if (player.cardCount() === 1) {
            this.triggerUnoAlert(player);
            this.playSound('lastcard');
        }
        
        // Play tension sound when any player has 2-3 cards left
        if (player.cardCount() >= 2 && player.cardCount() <= 3) {
            this.playSound('tension');
        }
        
        // Play exciting sound when player is about to win
        if (player.cardCount() === 1 && player.isHuman) {
            setTimeout(() => this.playSound('exciting'), 500);
        }

        // Check for win
        if (player.hasWon()) {
            this.endGame(player);
            return true;
        }

        // Apply card effects
        this.applyCardEffect(playedCard);

        return true;
    }

    /**
     * Apply special card effects
     * @param {Card} card
     */
    applyCardEffect(card) {
        const nextIndex = this.getNextPlayerIndex();
        const nextPlayer = this.players[nextIndex];

        switch (card.value) {
            case 'Skip':
                // Shield blocks Skip
                if (nextIndex === this.shieldedPlayerIndex) {
                    this.shieldedPlayerIndex = -1;
                    this.playSound('skip');
                    triggerFlyingUnicorn();
                    this.showPinkEffect('🛡️ Shield blocked Skip!');
                    this.advanceTurn();
                    break;
                }
                this.playSound('skip');
                triggerFlyingUnicorn();
                this.currentPlayerIndex = this.getNextPlayerIndex();
                this.advanceTurn();
                break;

            case 'Reverse':
                this.playSound('reverse');
                triggerFlyingUnicorn();
                this.direction *= -1;
                this.advanceTurn();
                break;

            case 'Draw_2':
                this.playSound('draw2');
                this.playSound('yell');
                triggerFlyingUnicorn();
                // Shield absorbs Draw_2
                if (nextIndex === this.shieldedPlayerIndex) {
                    this.shieldedPlayerIndex = -1;
                    this.showPinkEffect('🛡️ Shield blocked Draw 2!');
                    this.drawPenalty = 0;
                    this.advanceTurn();
                    break;
                }
                this.drawPenalty += 2;
                if (this.canStackDraw(nextPlayer)) {
                    this.advanceTurn();
                } else {
                    if (!nextPlayer.isHuman) this.playSound('penalty');
                    nextPlayer.addCards(this.drawCards(this.drawPenalty));
                    this.drawPenalty = 0;
                    this.currentPlayerIndex = this.getNextPlayerIndex();
                    this.advanceTurn();
                }
                break;

            case 'Wild_Draw_4':
                this.playSound('wild4');
                this.playSound('yell');
                triggerFlyingUnicorn();
                // Shield absorbs Wild Draw 4
                if (nextIndex === this.shieldedPlayerIndex) {
                    this.shieldedPlayerIndex = -1;
                    this.showPinkEffect('🛡️ Shield blocked Wild Draw 4!');
                    this.advanceTurn();
                    break;
                }
                setTimeout(() => {
                    if (!nextPlayer.isHuman) this.playSound('penalty');
                }, 400);
                nextPlayer.addCards(this.drawCards(4));
                this.currentPlayerIndex = this.getNextPlayerIndex();
                this.advanceTurn();
                break;

            case 'Wild':
                triggerFlyingUnicorn();
                this.advanceTurn();
                break;

            // Pink card effects
            case 'Pink_Bomb':
                this.applyPinkBomb();
                break;

            case 'Pink_Shuffle':
                this.applyPinkShuffle();
                break;

            case 'Pink_Peek':
                // Handled separately in UIRenderer for human, AI handled in processAITurn
                this.advanceTurn();
                break;

            case 'Pink_Shield':
                this.applyPinkShield();
                break;

            default:
                this.advanceTurn();
        }
    }

    /**
     * Pink Bomb: all other players draw 2
     */
    applyPinkBomb() {
        triggerGlitterRain();
        this.playSound('draw2');
        for (const player of this.players) {
            if (player.index !== this.currentPlayerIndex) {
                player.addCards(this.drawCards(2));
                if (!player.isHuman) this.playSound('penalty');
            }
        }
        this.showPinkEffect('💥 Pink Bomb! Everyone else draws 2!');
        this.advanceTurn();
    }

    /**
     * Pink Shuffle: all hands collected, shuffled, redistributed
     */
    applyPinkShuffle() {
        triggerGlitterRain();
        this.playSound('shuffle');
        // Collect all cards from all hands
        const allCards = [];
        const handSizes = this.players.map(p => p.hand.length);
        for (const player of this.players) {
            allCards.push(...player.hand.splice(0));
        }
        // Fisher-Yates shuffle
        for (let i = allCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }
        // Redistribute same hand sizes
        let idx = 0;
        for (let p = 0; p < this.players.length; p++) {
            const size = handSizes[p];
            this.players[p].hand = allCards.splice(0, size);
        }
        // Any leftover cards go back to draw pile bottom
        if (allCards.length > 0) {
            this.drawPile.addToBottom(allCards);
        }
        this.showPinkEffect('🔀 Pink Shuffle! All hands redistributed!');
        this.advanceTurn();
    }

    /**
     * Pink Shield: protect current player from next targeting action
     */
    applyPinkShield() {
        this.shieldedPlayerIndex = this.currentPlayerIndex;
        triggerGlitterRain();
        this.showPinkEffect('🛡️ Pink Shield activated! Next action is blocked!');
        this.advanceTurn();
    }

    /**
     * Show a pink card effect banner
     * @param {string} message
     */
    showPinkEffect(message) {
        let banner = document.getElementById('pink-effect-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'pink-effect-banner';
            banner.className = 'pink-effect-banner';
            document.getElementById('game-container').appendChild(banner);
        }
        banner.textContent = message;
        banner.classList.remove('hidden');
        banner.classList.add('show');
        clearTimeout(this._pinkBannerTimeout);
        this._pinkBannerTimeout = setTimeout(() => {
            banner.classList.remove('show');
            banner.classList.add('hidden');
        }, 2500);
    }

    /**
     * Check if a player can stack a Draw_2 on the current penalty
     * @param {Player} player
     * @returns {boolean}
     */
    canStackDraw(player) {
        return player.hand.some(card => card.value === 'Draw_2');
    }

    /**
     * Advance to next player's turn
     */
    advanceTurn() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
        this.hasDrawnThisTurn = false;
        // In local multiplayer, flag that the next human player needs a pass screen
        if (this.localMultiplayer && this.players[this.currentPlayerIndex]?.isHuman) {
            this.justPassedTo = true;
        }
    }

    /**
     * Player draws a card
     * @param {Player} player
     * @returns {Card|null}
     */
    drawCardForPlayer(player) {
        if (player.index !== this.currentPlayerIndex) {
            return null;
        }

        // Enforce single draw per turn
        if (this.hasDrawnThisTurn) {
            return null;
        }

        // If there's a draw penalty, player must draw the full penalty
        if (this.drawPenalty > 0) {
            const cards = this.drawCards(this.drawPenalty);
            player.addCards(cards);
            this.playSound('draw');
            this.playSound('penalty');
            this.drawPenalty = 0;
            this.hasDrawnThisTurn = true;
            return null; // Return null since multiple cards drawn — turn ends
        }

        const cards = this.drawCards(1);
        if (cards.length > 0) {
            player.addCard(cards[0]);
            this.playSound('draw');
            this.hasDrawnThisTurn = true;
            return cards[0];
        }
        return null;
    }

    /**
     * Trigger UNO alert for a player
     * @param {Player} player
     */
    triggerUnoAlert(player) {
        player.saidUno = true;
        this.playSound('uno');
        
        // Show UNO alert
        const alert = document.getElementById('uno-alert');
        alert.classList.remove('hidden');
        alert.classList.add('show');
        
        // Highlight player
        const playerArea = document.querySelector(`[data-player="${player.index}"]`);
        if (playerArea) {
            playerArea.classList.add('uno-alert');
        }
        
        // Hide after delay
        setTimeout(() => {
            alert.classList.remove('show');
            alert.classList.add('hidden');
            if (playerArea) {
                playerArea.classList.remove('uno-alert');
            }
        }, 2000);
    }

    /**
     * End the game with a winner
     * @param {Player} winner
     */
    endGame(winner) {
        this.gameOver = true;
        this.winner = winner;
        this.playSound('win');
        
        // Show winner modal
        const modal = document.getElementById('winner-modal');
        const winnerName = modal.querySelector('.winner-name');
        if (this.localMultiplayer) {
            winnerName.textContent = `${winner.name} Wins!`;
        } else {
            winnerName.textContent = winner.isHuman ? 'You Win!' : `${winner.name} Wins!`;
        }
        modal.classList.remove('hidden');
    }

    /**
     * Play a sound effect using Web Audio API
     * @param {string} type - 'play', 'draw', 'uno', 'win', etc.
     */
    playSound(type) {
        if (!this.soundEnabled) return;
        
        // Initialize audio context on first user interaction
        if (!soundManager.audioContext) {
            soundManager.init();
        }
        
        switch(type) {
            case 'play':
                soundManager.playCardSound();
                break;
            case 'draw':
                soundManager.playDrawSound();
                break;
            case 'uno':
                soundManager.playUnoSound();
                break;
            case 'win':
                soundManager.playWinSound();
                break;
            case 'shuffle':
                soundManager.playShuffleSound();
                break;
            case 'invalid':
                soundManager.playInvalidSound();
                break;
            case 'click':
                soundManager.playClickSound();
                break;
            case 'skip':
                soundManager.playSkipSound();
                break;
            case 'reverse':
                soundManager.playReverseSound();
                break;
            case 'draw2':
                soundManager.playDraw2Sound();
                break;
            case 'wild':
                soundManager.playWildSound();
                break;
            case 'wild4':
                soundManager.playWildDraw4Sound();
                break;
            case 'yourturn':
                soundManager.playYourTurnSound();
                break;
            case 'opponent':
                soundManager.playOpponentSound();
                break;
            case 'hover':
                soundManager.playHoverSound();
                break;
            case 'gamestart':
                soundManager.playGameStartSound();
                break;
            case 'penalty':
                soundManager.playPenaltySound();
                break;
            case 'colorselect':
                soundManager.playColorSelectSound();
                break;
            case 'sparkle':
                soundManager.playSparkleSound();
                break;
            case 'tension':
                soundManager.playTensionSound();
                break;
            case 'lastcard':
                soundManager.playLastCardSound();
                break;
            case 'exciting':
                soundManager.playExcitingSound();
                break;
            case 'yell':
                soundManager.playYellSound();
                break;
        }
    }

    /**
     * Toggle sound on/off
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        soundManager.enabled = this.soundEnabled;
        
        const soundOn = document.querySelector('.sound-on');
        const soundOff = document.querySelector('.sound-off');
        
        if (this.soundEnabled) {
            soundOn.style.display = 'inline';
            soundOff.style.display = 'none';
        } else {
            soundOn.style.display = 'none';
            soundOff.style.display = 'inline';
        }
        
        // Play a click sound to confirm
        if (this.soundEnabled) {
            this.playSound('click');
        }
    }

    /**
     * Toggle background music on/off
     */
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        const musicBtn = document.getElementById('music-toggle');
        const musicOn = musicBtn.querySelector('.music-on');
        const musicOff = musicBtn.querySelector('.music-off');
        
        if (this.musicEnabled) {
            musicOn.style.display = 'inline';
            musicOff.style.display = 'none';
            musicBtn.classList.remove('music-off');
            if (this.backgroundMusic) {
                this.backgroundMusic.play();
            }
        } else {
            musicOn.style.display = 'none';
            musicOff.style.display = 'inline';
            musicBtn.classList.add('music-off');
            if (this.backgroundMusic) {
                this.backgroundMusic.pause();
            }
        }
    }

    /**
     * Start playing background music
     */
    startBackgroundMusic() {
        if (!this.backgroundMusic) {
            this.backgroundMusic = document.getElementById('background-music');
            this.backgroundMusic.volume = 0.3; // Set to 30% volume
        }
        
        if (this.musicEnabled) {
            this.backgroundMusic.play().catch(e => {
                // Autoplay may be blocked, will start on next user interaction
                console.log('Music autoplay blocked, will start on interaction');
            });
        }
    }

}

// ===========================================
// AI PLAYER LOGIC
// ===========================================

/**
 * AI decision making for computer players
 */
class AIPlayer {
    /**
     * Choose a card to play
     * @param {Player} player
     * @param {Card[]} playableCards
     * @returns {Card|null}
     */
    static chooseCard(player, playableCards) {
        if (playableCards.length === 0) return null;

        // Priority order for strategic play:
        // 1. Draw Two (offensive)
        // 2. Skip (defensive)
        // 3. Reverse (tactical)
        // 4. Color match (prefer color with most cards)
        // 5. Number match
        // 6. Wild cards (save for when needed)
        // 7. Wild Draw 4 (save for emergencies)

        // Separate cards by type
        const drawTwos = playableCards.filter(c => c.value === 'Draw_2');
        const skips = playableCards.filter(c => c.value === 'Skip');
        const reverses = playableCards.filter(c => c.value === 'Reverse');
        const numbers = playableCards.filter(c => !c.isAction() && !c.isWild());
        const wilds = playableCards.filter(c => c.value === 'Wild');
        const wildDraw4s = playableCards.filter(c => c.value === 'Wild_Draw_4');

        // If down to 2 cards and have action cards, use them
        if (player.cardCount() <= 3) {
            if (drawTwos.length > 0) return drawTwos[0];
            if (skips.length > 0) return skips[0];
            if (reverses.length > 0) return reverses[0];
        }

        // Prefer action cards
        if (drawTwos.length > 0) return drawTwos[0];
        if (skips.length > 0) return skips[0];
        if (reverses.length > 0) return reverses[0];

        // Play number cards
        if (numbers.length > 0) {
            // Prefer cards that match color we have most of
            const colorCounts = this.countColors(player.hand);
            numbers.sort((a, b) => (colorCounts[b.color] || 0) - (colorCounts[a.color] || 0));
            return numbers[0];
        }

        // Use wild as last resort (before Wild Draw 4)
        if (wilds.length > 0) return wilds[0];
        if (wildDraw4s.length > 0) return wildDraw4s[0];

        return playableCards[0];
    }

    /**
     * Choose color for wild card
     * @param {Card[]} hand
     * @returns {string}
     */
    static chooseColor(hand) {
        const colorCounts = this.countColors(hand);
        
        let maxColor = 'red';
        let maxCount = 0;
        
        for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
                maxCount = count;
                maxColor = color;
            }
        }
        
        // If no colored cards left, pick random
        if (maxCount === 0) {
            return COLORS[Math.floor(Math.random() * COLORS.length)];
        }
        
        return maxColor;
    }

    /**
     * Count cards by color in hand
     * @param {Card[]} hand
     * @returns {Object}
     */
    static countColors(hand) {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        
        for (const card of hand) {
            if (card.color && counts[card.color] !== undefined) {
                counts[card.color]++;
            }
        }
        
        return counts;
    }
}

// ===========================================
// UI RENDERER
// ===========================================

/**
 * Handles all UI rendering
 */
class UIRenderer {
    constructor(gameState) {
        this.gameState = gameState;
    }

    /**
     * Render the complete game state
     */
    render() {
        this.renderPlayers();
        this.renderDiscardPile();
        this.renderDrawPile();
        this.renderDirectionIndicator();
        this.renderCurrentColor();
        this.renderTurnIndicator();
    }

    /**
     * Render all player hands
     */
    renderPlayers() {
        const positions = ['bottom', 'left', 'top', 'right'];
        
        for (let i = 0; i < this.gameState.players.length; i++) {
            const player = this.gameState.players[i];
            const position = positions[i];
            const playerArea = document.getElementById(`player-${position}`);
            if (!playerArea) continue;
            
            const handContainer = playerArea.querySelector('.player-hand');
            const cardCount = playerArea.querySelector('.card-count');
            const nameEl = playerArea.querySelector('.player-name');
            
            if (nameEl) {
                nameEl.textContent = player.name;
            }
            
            // Update card count
            cardCount.textContent = player.cardCount();
            
            // Clear hand
            handContainer.innerHTML = '';
            
            // Render cards based on player type
            // In local multiplayer, only the active human sees their hand face-up
            const isActiveHuman = player.isHuman && i === this.gameState.currentPlayerIndex;
            const showFaceUp = !this.gameState.localMultiplayer ? player.isHuman : isActiveHuman;
            if (showFaceUp) {
                this.renderHumanHand(player, handContainer);
            } else {
                this.renderAIHand(player, handContainer);
            }
            
            // Highlight active player
            if (i === this.gameState.currentPlayerIndex && !this.gameState.gameOver) {
                playerArea.classList.add('active');
            } else {
                playerArea.classList.remove('active');
            }

            // Shield indicator
            if (i === this.gameState.shieldedPlayerIndex) {
                playerArea.classList.add('shielded');
            } else {
                playerArea.classList.remove('shielded');
            }
        }
    }

    /**
     * Build a card DOM element, using CSS rendering for pink cards
     * @param {Card} card
     * @returns {HTMLElement}
     */
    buildCardElement(card) {
        const cardEl = document.createElement('div');
        if (card.isPink()) {
            cardEl.className = 'card pink-card';
            const icons = {
                Pink_Bomb: { icon: '💥', label: 'Pink Bomb' },
                Pink_Shuffle: { icon: '🔀', label: 'Pink Shuffle' },
                Pink_Peek: { icon: '👁️', label: 'Peek & Steal' },
                Pink_Shield: { icon: '🛡️', label: 'Pink Shield' }
            };
            const info = icons[card.value] || { icon: '🩷', label: card.value };
            cardEl.innerHTML = `<span class="pink-icon" aria-hidden="true">${info.icon}</span><span class="pink-label">${info.label}</span>`;
            cardEl.setAttribute('aria-label', info.label);
        } else {
            cardEl.className = 'card';
            cardEl.style.backgroundImage = `url('${card.getImagePath()}')`;
            const colorName = card.color ? card.color.charAt(0).toUpperCase() + card.color.slice(1) : '';
            const valueName = card.value.replace('_', ' ');
            cardEl.setAttribute('aria-label', colorName ? `${colorName} ${valueName}` : valueName);
        }
        return cardEl;
    }

    /**
     * Render human player's hand (face up, clickable)
     * @param {Player} player
     * @param {HTMLElement} container
     */
    renderHumanHand(player, container) {
        const topCard = this.gameState.getTopCard();
        const currentColor = this.gameState.currentColor;
        const isMyTurn = this.gameState.currentPlayerIndex === player.index;
        const prevCardIds = this._prevHandIds || new Set();
        const newPrevIds = new Set();
        
        for (const card of player.hand) {
            const cardEl = this.buildCardElement(card);
            cardEl.dataset.cardId = card.id;
            newPrevIds.add(card.id);
            
            // Bounce-in animation for newly added cards
            if (!prevCardIds.has(card.id)) {
                cardEl.classList.add('bounce-in');
            }
            
            // Check if playable — when draw penalty is active, only Draw_2 can be stacked
            let isPlayable;
            if (this.gameState.drawPenalty > 0) {
                isPlayable = card.value === 'Draw_2';
            } else {
                isPlayable = player.canPlay(card, topCard, currentColor);
            }
            
            if (isMyTurn && isPlayable && !this.gameState.isProcessingTurn && !this.gameState.pendingColorChoice) {
                cardEl.classList.add('playable');
                cardEl.setAttribute('role', 'button');
                cardEl.setAttribute('tabindex', '0');
                cardEl.setAttribute('aria-label', (cardEl.getAttribute('aria-label') || '') + ' — playable');
                cardEl.addEventListener('click', () => this.handleCardClick(card));
                cardEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleCardClick(card);
                    }
                });
                cardEl.addEventListener('mouseenter', () => this.gameState.playSound('hover'));
            }
            
            container.appendChild(cardEl);
        }
        this._prevHandIds = newPrevIds;
    }

    /**
     * Render AI player's hand (face down)
     * @param {Player} player
     * @param {HTMLElement} container
     */
    renderAIHand(player, container) {
        for (let i = 0; i < player.cardCount(); i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card card-back';
            container.appendChild(cardEl);
        }
    }

    /**
     * Handle card click for human player
     * @param {Card} card
     */
    handleCardClick(card) {
        if (this.gameState.isProcessingTurn || this.gameState.gameOver) return;
        
        const player = this.gameState.getCurrentPlayer();
        if (!player.isHuman) return;
        
        // Animate the card before playing it
        const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
        if (cardEl) cardEl.classList.add('playing');
        
        // Pink_Peek requires a special interaction
        if (card.value === 'Pink_Peek') {
            this.gameState.playSound('wild');
            this.gameState.playCard(player, card);
            this.render();
            this.showPeekStealPicker(player);
            return;
        }
        
        // If wild card, show color picker
        if (card.isWild()) {
            this.gameState.playSound('wild');
            this.showColorPicker((color) => {
                this.gameState.playSound('colorselect');
                this.gameState.playCard(player, card, color);
                this.render();
                this.processTurn();
            });
        } else {
            this.gameState.playCard(player, card);
            this.render();
            this.processTurn();
        }
    }

    /**
     * Show picker to choose a target for Pink Peek & Steal
     * @param {Player} human
     */
    showPeekStealPicker(human) {
        const opponents = this.gameState.players.filter(p => p.index !== human.index);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal peek-steal-modal';
        overlay.id = 'peek-steal-modal';
        overlay.innerHTML = `
            <div class="modal-content peek-steal-content">
                <h2 class="peek-steal-title">🩷 Pink Peek & Steal</h2>
                <p class="peek-steal-sub">Choose a player to peek at their hand and steal a card:</p>
                <div class="peek-steal-targets" id="peek-steal-targets"></div>
            </div>
        `;
        document.getElementById('game-container').appendChild(overlay);
        
        const targetsDiv = overlay.querySelector('#peek-steal-targets');
        opponents.forEach(opponent => {
            const btn = document.createElement('button');
            btn.className = 'peek-target-btn';
            btn.textContent = `${opponent.name} (${opponent.cardCount()} cards)`;
            btn.addEventListener('click', () => {
                overlay.remove();
                this.showStealPicker(human, opponent);
            });
            targetsDiv.appendChild(btn);
        });
    }

    /**
     * Show the target player's hand and let the human steal a card
     * @param {Player} human
     * @param {Player} target
     */
    showStealPicker(human, target) {
        const overlay = document.createElement('div');
        overlay.className = 'modal peek-steal-modal';
        overlay.innerHTML = `
            <div class="modal-content peek-steal-content">
                <h2 class="peek-steal-title">🩷 Steal from ${target.name}</h2>
                <p class="peek-steal-sub">Click a card to steal it:</p>
                <div class="peek-hand" id="peek-hand"></div>
            </div>
        `;
        document.getElementById('game-container').appendChild(overlay);
        
        const handDiv = overlay.querySelector('#peek-hand');
        for (const card of target.hand) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card peek-card';
            cardEl.style.backgroundImage = `url('${card.getImagePath()}')`;
            cardEl.addEventListener('click', () => {
                // Steal the card
                target.removeCard(card.id);
                human.addCard(card);
                overlay.remove();
                this.gameState.showPinkEffect(`🩷 You stole a card from ${target.name}!`);
                triggerGlitterRain();
                this.render();
                this.processTurn();
            });
            handDiv.appendChild(cardEl);
        }
    }

    /**
     * Show color picker modal
     * @param {Function} callback
     */
    showColorPicker(callback) {
        const modal = document.getElementById('color-picker-modal');
        modal.classList.remove('hidden');
        this.gameState.playSound('sparkle');
        
        const buttons = modal.querySelectorAll('.color-btn');
        
        const handleClick = (e) => {
            const color = e.target.dataset.color;
            this.gameState.playSound('colorselect');
            modal.classList.add('hidden');
            
            // Remove listeners
            buttons.forEach(btn => {
                btn.removeEventListener('click', handleClick);
                btn.removeEventListener('mouseenter', handleHover);
            });
            
            callback(color);
        };
        
        const handleHover = () => {
            this.gameState.playSound('hover');
        };
        
        buttons.forEach(btn => {
            btn.addEventListener('click', handleClick);
            btn.addEventListener('mouseenter', handleHover);
        });
    }

    /**
     * Render the discard pile (top card)
     */
    renderDiscardPile() {
        const topCard = this.gameState.getTopCard();
        const discardEl = document.querySelector('#discard-pile .card');
        const discardPile = document.getElementById('discard-pile');
        
        if (topCard) {
            const prevId = discardEl.dataset.topCardId;
            const changed = prevId !== String(topCard.id);

            if (topCard.isPink()) {
                const built = this.buildCardElement(topCard);
                discardEl.className = built.className + ' discard-top';
                discardEl.style.backgroundImage = '';
                discardEl.innerHTML = built.innerHTML;
            } else {
                discardEl.className = 'card discard-top';
                discardEl.innerHTML = '';
                discardEl.style.backgroundImage = `url('${topCard.getImagePath()}')`;
            }
            discardEl.dataset.topCardId = topCard.id;

            // Trigger pop animation when top card changes
            if (changed) {
                discardPile.classList.remove('card-landed');
                void discardPile.offsetWidth; // reflow to restart animation
                discardPile.classList.add('card-landed');
                setTimeout(() => discardPile.classList.remove('card-landed'), 350);
            }
        }
    }

    /**
     * Render draw pile indicator
     */
    renderDrawPile() {
        const drawPile = document.getElementById('draw-pile');
        const pileLabel = drawPile.querySelector('.pile-label');
        const count = this.gameState.drawPile.count();
        
        if (this.gameState.drawPenalty > 0) {
            pileLabel.textContent = `DRAW +${this.gameState.drawPenalty}`;
            drawPile.setAttribute('aria-label', `Draw pile — penalty: draw ${this.gameState.drawPenalty} cards`);
        } else {
            pileLabel.textContent = `DRAW (${count})`;
            drawPile.setAttribute('aria-label', `Draw pile — ${count} cards remaining`);
        }
    }

    /**
     * Render direction indicator
     */
    renderDirectionIndicator() {
        const arrow = document.querySelector('.direction-arrow');
        if (this.gameState.direction === 1) {
            arrow.classList.add('clockwise');
            arrow.classList.remove('counterclockwise');
            arrow.textContent = '↻';
        } else {
            arrow.classList.remove('clockwise');
            arrow.classList.add('counterclockwise');
            arrow.textContent = '↺';
        }
    }

    /**
     * Render current color indicator
     */
    renderCurrentColor() {
        const colorDisplay = document.querySelector('.color-display');
        colorDisplay.className = 'color-display';
        if (this.gameState.currentColor) {
            colorDisplay.classList.add(this.gameState.currentColor);
        }
    }

    /**
     * Render turn indicator
     */
    renderTurnIndicator() {
        const turnText = document.querySelector('.turn-text');
        const currentPlayer = this.gameState.getCurrentPlayer();
        
        if (this.gameState.gameOver) {
            turnText.textContent = 'Game Over';
        } else if (currentPlayer?.isHuman) {
            if (this.gameState.localMultiplayer) {
                turnText.textContent = `${currentPlayer.name}'s Turn`;
            } else {
                turnText.textContent = 'Your Turn';
            }
        } else {
            turnText.textContent = `${currentPlayer?.name || 'AI'}'s Turn`;
        }
    }

    /**
     * Process turns (trigger AI if needed)
     */
    processTurn() {
        if (this.gameState.gameOver) return;
        
        const currentPlayer = this.gameState.getCurrentPlayer();
        
        if (!currentPlayer.isHuman) {
            this.processAITurn(currentPlayer);
        } else {
            // In local multiplayer, show pass screen before revealing hand
            if (this.gameState.localMultiplayer && this.gameState.justPassedTo) {
                this.gameState.justPassedTo = false;
                const pin = this.gameState.playerPins[currentPlayer.index] || null;
                this.showPassScreen(currentPlayer.name, pin, () => {
                    this.render();
                    this.gameState.playSound('yourturn');
                });
            } else {
                // It's the human player's turn - play notification sound
                this.gameState.playSound('yourturn');
            }
        }
    }

    /**
     * Show pass screen between turns in local multiplayer
     * @param {string} playerName
     * @param {string|null} pin
     * @param {Function} onReveal
     */
    showPassScreen(playerName, pin, onReveal) {
        const screen = document.getElementById('pass-screen');
        const titleEl = document.getElementById('pass-screen-title');
        const pinSection = document.getElementById('pass-pin-section');
        const revealBtn = document.getElementById('pass-reveal-btn');
        const pinError = document.getElementById('pass-pin-error');
        const pinInputs = document.querySelectorAll('.pass-pin-digit');

        // Reset state
        titleEl.textContent = `Pass to ${playerName}`;
        pinError.classList.add('hidden');
        pinInputs.forEach(inp => { inp.value = ''; });

        if (pin) {
            pinSection.classList.remove('hidden');
            revealBtn.classList.add('hidden');

            // Auto-focus first pin digit
            setTimeout(() => pinInputs[0].focus(), 100);

            // Auto-advance through PIN digits
            pinInputs.forEach((inp, i) => {
                inp.addEventListener('input', () => {
                    inp.value = inp.value.replace(/\D/, '');
                    if (inp.value.length === 1 && i < pinInputs.length - 1) {
                        pinInputs[i + 1].focus();
                    }
                    // Check complete PIN
                    const entered = Array.from(pinInputs).map(d => d.value).join('');
                    if (entered.length === 4) {
                        if (entered === pin) {
                            screen.classList.add('hidden');
                            onReveal();
                        } else {
                            pinError.classList.remove('hidden');
                            setTimeout(() => {
                                pinError.classList.add('hidden');
                                pinInputs.forEach(d => { d.value = ''; });
                                pinInputs[0].focus();
                            }, 1200);
                        }
                    }
                });
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && inp.value === '' && i > 0) {
                        pinInputs[i - 1].focus();
                    }
                });
            });

            // Clean up listeners when screen hides
            const oldRevealHandler = revealBtn._handler;
            if (oldRevealHandler) revealBtn.removeEventListener('click', oldRevealHandler);

        } else {
            pinSection.classList.add('hidden');
            revealBtn.classList.remove('hidden');

            const handler = () => {
                revealBtn.removeEventListener('click', handler);
                screen.classList.add('hidden');
                onReveal();
            };
            revealBtn._handler = handler;
            revealBtn.addEventListener('click', handler);
        }

        screen.classList.remove('hidden');
    }

    /**
     * Process AI player's turn
     * @param {Player} aiPlayer
     */
    processAITurn(aiPlayer) {
        this.gameState.isProcessingTurn = true;
        this.render();
        
        setTimeout(() => {
            // If there's a draw penalty, AI must stack or draw
            if (this.gameState.drawPenalty > 0) {
                const draw2Cards = aiPlayer.hand.filter(c => c.value === 'Draw_2');
                if (draw2Cards.length > 0) {
                    // AI stacks a Draw_2
                    const cardToPlay = draw2Cards[0];
                    this.gameState.playSound('opponent');
                    this.gameState.playCard(aiPlayer, cardToPlay);
                } else {
                    // AI must draw the penalty
                    this.gameState.drawCardForPlayer(aiPlayer);
                    this.gameState.advanceTurn();
                }
                this.gameState.isProcessingTurn = false;
                this.render();
                if (!this.gameState.gameOver) {
                    this.processTurn();
                }
                return;
            }

            const playableCards = aiPlayer.getPlayableCards(
                this.gameState.getTopCard(),
                this.gameState.currentColor
            );
            
            if (playableCards.length > 0) {
                // AI chooses a card
                const cardToPlay = AIPlayer.chooseCard(aiPlayer, playableCards);
                
                // Choose color for wild
                let chosenColor = null;
                if (cardToPlay.isWild()) {
                    chosenColor = AIPlayer.chooseColor(aiPlayer.hand);
                }
                
                // Play opponent sound
                this.gameState.playSound('opponent');
                
                // Play the card
                this.gameState.playCard(aiPlayer, cardToPlay, chosenColor);

                // Handle Pink_Peek: AI auto-steals from player with most cards
                if (cardToPlay.value === 'Pink_Peek') {
                    const targets = this.gameState.players.filter(p => p.index !== aiPlayer.index && p.hand.length > 0);
                    if (targets.length > 0) {
                        const target = targets.reduce((a, b) => a.hand.length > b.hand.length ? a : b);
                        const stolenCard = target.hand[Math.floor(Math.random() * target.hand.length)];
                        target.removeCard(stolenCard.id);
                        aiPlayer.addCard(stolenCard);
                        this.gameState.showPinkEffect(`🩷 ${aiPlayer.name} peeked and stole from ${target.name}!`);
                    }
                }
            } else {
                // AI draws a card
                const drawnCard = this.gameState.drawCardForPlayer(aiPlayer);
                
                // Check if drawn card is playable
                if (drawnCard && aiPlayer.canPlay(drawnCard, this.gameState.getTopCard(), this.gameState.currentColor)) {
                    // Play it immediately
                    setTimeout(() => {
                        let chosenColor = null;
                        if (drawnCard.isWild()) {
                            chosenColor = AIPlayer.chooseColor(aiPlayer.hand);
                        }
                        this.gameState.playSound('opponent');
                        this.gameState.playCard(aiPlayer, drawnCard, chosenColor);
                        this.gameState.isProcessingTurn = false;
                        this.render();
                        this.processTurn();
                    }, 500);
                    return;
                } else {
                    // Can't play, advance turn
                    this.gameState.advanceTurn();
                }
            }
            
            this.gameState.isProcessingTurn = false;
            this.render();
            
            // Continue processing if next player is also AI
            if (!this.gameState.gameOver) {
                this.processTurn();
            }
        }, AI_TURN_DELAY);
    }

    /**
     * Handle draw pile click
     */
    handleDrawClick() {
        if (this.gameState.isProcessingTurn || this.gameState.gameOver) return;
        
        const player = this.gameState.getCurrentPlayer();
        if (!player.isHuman) return;
        
        // If there's a draw penalty, player must accept it
        if (this.gameState.drawPenalty > 0) {
            this.gameState.drawCardForPlayer(player);
            this.render();
            setTimeout(() => {
                this.gameState.advanceTurn();
                this.render();
                this.processTurn();
            }, 500);
            return;
        }
        
        // Draw a card
        const drawnCard = this.gameState.drawCardForPlayer(player);
        
        if (drawnCard) {
            this.render();
            
            // Check if drawn card is playable
            if (player.canPlay(drawnCard, this.gameState.getTopCard(), this.gameState.currentColor)) {
                // Allow playing the drawn card (it will be highlighted)
            } else {
                // Can't play, advance turn
                setTimeout(() => {
                    this.gameState.advanceTurn();
                    this.render();
                    this.processTurn();
                }, 500);
            }
        }
    }
}

// ===========================================
// GAME CONTROLLER
// ===========================================

/**
 * Main game controller - ties everything together
 */
class GameController {
    constructor() {
        this.gameState = new GameState();
        this.renderer = new UIRenderer(this.gameState);
        this.currentView = 'mode-selection';
        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Play vs AI button
        const playAiBtn = document.getElementById('play-ai-btn');
        if (playAiBtn) {
            playAiBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Start game button (legacy support)
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        // New game button — show mode selection screen
        document.getElementById('new-game-btn').addEventListener('click', () => {
            document.getElementById('local-setup').classList.add('hidden');
            document.getElementById('mode-selection').classList.remove('hidden');
            const startModal = document.getElementById('start-modal');
            if (startModal) startModal.classList.remove('hidden');
        });

        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('winner-modal').classList.add('hidden');
            if (this.gameState.localMultiplayer && this._lastPlayerConfig) {
                this.startGame(this._lastPlayerConfig);
            } else {
                this.startGame();
            }
        });

        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => {
            this.gameState.toggleSound();
        });

        // Music toggle
        document.getElementById('music-toggle').addEventListener('click', () => {
            this.gameState.toggleMusic();
        });

        // Fullscreen toggle
        document.getElementById('fullscreen-toggle').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Listen for fullscreen change to update button
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());

        // Draw pile click + keyboard activation
        const drawPileEl = document.getElementById('draw-pile');
        drawPileEl.addEventListener('click', () => {
            this.renderer.handleDrawClick();
        });
        drawPileEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.renderer.handleDrawClick();
            }
        });

        // Rules button
        document.getElementById('rules-btn').addEventListener('click', () => {
            document.getElementById('rules-modal').classList.remove('hidden');
        });

        // Rules close button
        document.getElementById('rules-close-btn').addEventListener('click', () => {
            document.getElementById('rules-modal').classList.add('hidden');
        });

        // Close rules modal on backdrop click
        document.getElementById('rules-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('rules-modal')) {
                document.getElementById('rules-modal').classList.add('hidden');
            }
        });

        // Local Multiplayer button
        const playLocalBtn = document.getElementById('play-local-btn');
        if (playLocalBtn) {
            playLocalBtn.addEventListener('click', () => {
                this.showLocalSetup();
            });
        }

        // Cancel local setup
        const cancelLocalBtn = document.getElementById('cancel-local-btn');
        if (cancelLocalBtn) {
            cancelLocalBtn.addEventListener('click', () => {
                document.getElementById('local-setup').classList.add('hidden');
                document.getElementById('mode-selection').classList.remove('hidden');
            });
        }

        // Player count buttons
        const countMinus = document.getElementById('count-minus');
        const countPlus = document.getElementById('count-plus');
        if (countMinus && countPlus) {
            countMinus.addEventListener('click', () => this.adjustPlayerCount(-1));
            countPlus.addEventListener('click', () => this.adjustPlayerCount(1));
        }

        // Start local game button
        const startLocalBtn = document.getElementById('start-local-btn');
        if (startLocalBtn) {
            startLocalBtn.addEventListener('click', () => {
                this.startLocalGame();
            });
        }
    }

    /**
     * Show local multiplayer setup screen
     */
    showLocalSetup() {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('local-setup').classList.remove('hidden');
        this._localPlayerCount = 2;
        document.getElementById('player-count-display').textContent = '2';
        this.renderPlayerNameInputs();
    }

    /**
     * Adjust local player count (+1 or -1)
     * @param {number} delta
     */
    adjustPlayerCount(delta) {
        const min = 2, max = 4;
        this._localPlayerCount = Math.min(max, Math.max(min, (this._localPlayerCount || 2) + delta));
        document.getElementById('player-count-display').textContent = this._localPlayerCount;
        this.renderPlayerNameInputs();
    }

    /**
     * Render player name + optional PIN input rows
     */
    renderPlayerNameInputs() {
        const container = document.getElementById('player-name-inputs');
        container.innerHTML = '';
        const count = this._localPlayerCount || 2;
        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'player-name-row';
            row.innerHTML = `
                <input type="text" class="player-name-input" id="player-name-${i}"
                    placeholder="Player ${i + 1}" maxlength="12" value="Player ${i + 1}">
                <label class="player-pin-toggle">
                    <input type="checkbox" id="use-pin-${i}"> Use PIN
                </label>
            `;
            container.appendChild(row);

            // PIN input row (hidden by default)
            const pinRow = document.createElement('div');
            pinRow.className = 'player-pin-row hidden';
            pinRow.id = `pin-row-${i}`;
            pinRow.innerHTML = `
                <p class="player-pin-label">4-digit PIN for Player ${i + 1}:</p>
                <input type="password" class="player-pin-input" id="player-pin-${i}"
                    maxlength="4" placeholder="••••" inputmode="numeric" pattern="[0-9]*">
            `;
            container.appendChild(pinRow);

            // Toggle PIN row visibility
            const checkbox = row.querySelector(`#use-pin-${i}`);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    pinRow.classList.remove('hidden');
                } else {
                    pinRow.classList.add('hidden');
                }
            });
        }
    }

    /**
     * Start a local pass-and-play game with the configured players
     */
    startLocalGame() {
        const count = this._localPlayerCount || 2;
        const playerConfig = [];

        for (let i = 0; i < count; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            const pinInput = document.getElementById(`player-pin-${i}`);
            const usePinCheckbox = document.getElementById(`use-pin-${i}`);
            const name = (nameInput?.value.trim()) || `Player ${i + 1}`;
            const pin = (usePinCheckbox?.checked && pinInput?.value.length === 4) ? pinInput.value : null;
            playerConfig.push({ name, isHuman: true, pin });
        }

        // Fill remaining seats with AI (always 4 players total)
        const aiCount = 4 - count;
        for (let i = 0; i < aiCount; i++) {
            playerConfig.push({ name: `Bot ${i + 1}`, isHuman: false, pin: null });
        }

        this.gameState.localMultiplayer = true;
        this.gameState.justPassedTo = false;
        this.startGame(playerConfig);
    }

    /**
     * Start a new game
     * @param {Array} [playerConfig] - Optional player config for local multiplayer
     */
    startGame(playerConfig) {
        // Hide start modal
        const startModal = document.getElementById('start-modal');
        if (startModal) startModal.classList.add('hidden');
        
        // Initialize audio context on user interaction
        if (!soundManager.audioContext) {
            soundManager.init();
        }
        
        // Start background music
        this.gameState.startBackgroundMusic();
        
        // Play game start jingle
        this.gameState.playSound('gamestart');
        
        // If no playerConfig, reset localMultiplayer mode
        if (!playerConfig) {
            this.gameState.localMultiplayer = false;
            this.gameState.justPassedTo = false;
            this._lastPlayerConfig = null;
        } else {
            this._lastPlayerConfig = playerConfig;
        }

        // Initialize game
        this.gameState.initGame(playerConfig);
        
        // Render
        this.renderer.render();
        
        // Play your turn sound if human starts
        if (this.gameState.getCurrentPlayer().isHuman) {
            setTimeout(() => this.gameState.playSound('yourturn'), 800);
        }
        
        // If first player is AI, start their turn
        if (!this.gameState.getCurrentPlayer().isHuman) {
            this.renderer.processTurn();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const elem = document.documentElement;
        
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
            // Enter fullscreen
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    /**
     * Update fullscreen button appearance
     */
    updateFullscreenButton() {
        const btn = document.getElementById('fullscreen-toggle');
        const enterIcon = btn.querySelector('.fullscreen-enter');
        const exitIcon = btn.querySelector('.fullscreen-exit');
        
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                             document.mozFullScreenElement || document.msFullscreenElement;
        
        if (isFullscreen) {
            enterIcon.style.display = 'none';
            exitIcon.style.display = 'inline';
            btn.title = 'Exit Fullscreen';
        } else {
            enterIcon.style.display = 'inline';
            exitIcon.style.display = 'none';
            btn.title = 'Enter Fullscreen';
        }
    }
}

// ===========================================
// INITIALIZE GAME ON LOAD
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    window.game = new GameController();
});
