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
// NETWORK MANAGER (Socket.io Client)
// ===========================================

/**
 * Handles all multiplayer networking
 */
class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.isSpectator = false;
        this.callbacks = {};
        this.reconnecting = false;
    }

    /**
     * Connect to the game server
     * @param {string} serverUrl - WebSocket server URL
     * @returns {Promise}
     */
    connect(serverUrl = 'http://localhost:3000') {
        return new Promise((resolve, reject) => {
            if (this.socket && this.connected) {
                resolve();
                return;
            }

            try {
                this.socket = io(serverUrl, {
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 10
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this.reconnecting = false;
                    this.updateConnectionStatus('connected');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.connected = false;
                    this.updateConnectionStatus('disconnected');
                    if (this.roomCode) {
                        this.reconnecting = true;
                        this.showReconnectingOverlay(true);
                    }
                });

                this.socket.on('connect_error', (error) => {
                    this.updateConnectionStatus('error');
                    reject(error);
                });

                this.socket.on('reconnect', () => {
                    this.connected = true;
                    this.reconnecting = false;
                    this.showReconnectingOverlay(false);
                    // Rejoin room if we were in one
                    if (this.roomCode && this.playerId) {
                        this.joinRoom(this.roomCode, null, false, this.playerId);
                    }
                });

                // Setup event listeners
                this.setupEventListeners();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Setup socket event listeners
     */
    setupEventListeners() {
        // Room events
        this.socket.on('roomCreated', (data) => {
            this.roomCode = data.roomCode;
            this.playerId = data.playerId;
            this.isHost = true;
            this.saveSession();
            this.emit('roomCreated', data);
        });

        this.socket.on('roomJoined', (data) => {
            this.roomCode = data.roomCode;
            if (data.playerId) this.playerId = data.playerId;
            this.isSpectator = data.isSpectator || false;
            if (!this.isSpectator) this.saveSession();
            this.emit('roomJoined', data);
        });

        this.socket.on('lobbyState', (data) => {
            this.emit('lobbyState', data);
        });

        this.socket.on('gameState', (data) => {
            this.emit('gameState', data);
        });

        this.socket.on('gameStarted', (data) => {
            this.emit('gameStarted', data);
        });

        this.socket.on('playerJoined', (data) => {
            this.showToast(`${data.playerName} joined!`, 'info');
            this.emit('playerJoined', data);
        });

        this.socket.on('playerLeft', (data) => {
            this.showToast(`${data.playerName} left`, 'warning');
            this.emit('playerLeft', data);
        });

        this.socket.on('playerDisconnected', (data) => {
            this.showToast(`${data.playerName} disconnected...`, 'warning');
            this.emit('playerDisconnected', data);
        });

        this.socket.on('playerReconnected', (data) => {
            this.showToast(`${data.playerName} reconnected!`, 'success');
            this.emit('playerReconnected', data);
        });

        this.socket.on('playerAITakeover', (data) => {
            this.showToast(`${data.playerName} is now AI-controlled 🤖`, 'info');
            this.emit('playerAITakeover', data);
        });

        this.socket.on('spectatorJoined', (data) => {
            this.emit('spectatorJoined', data);
        });

        this.socket.on('spectatorLeft', (data) => {
            this.emit('spectatorLeft', data);
        });

        this.socket.on('playerAction', (data) => {
            this.emit('playerAction', data);
        });

        this.socket.on('chooseColor', () => {
            this.emit('chooseColor');
        });

        this.socket.on('colorChosen', (data) => {
            this.emit('colorChosen', data);
        });

        this.socket.on('unoDeclared', (data) => {
            this.emit('unoDeclared', data);
        });

        this.socket.on('error', (data) => {
            this.showToast(data.message, 'error');
            this.emit('error', data);
        });
    }

    /**
     * Register callback for event
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Emit event to callbacks
     */
    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    /**
     * Create a new room
     */
    createRoom(playerName) {
        const savedId = this.getSavedPlayerId();
        this.socket.emit('createRoom', { playerName, playerId: savedId });
    }

    /**
     * Join an existing room
     */
    joinRoom(roomCode, playerName, asSpectator = false, playerId = null) {
        const savedId = playerId || this.getSavedPlayerId();
        this.socket.emit('joinRoom', { 
            roomCode, 
            playerName, 
            playerId: savedId,
            asSpectator 
        });
    }

    /**
     * Toggle ready status
     */
    toggleReady() {
        this.socket.emit('toggleReady', { 
            roomCode: this.roomCode, 
            playerId: this.playerId 
        });
    }

    /**
     * Start the game (host only)
     */
    startGame() {
        this.socket.emit('startGame', { 
            roomCode: this.roomCode, 
            playerId: this.playerId 
        });
    }

    /**
     * Play a card
     */
    playCard(cardId, chosenColor = null) {
        this.socket.emit('playCard', { 
            roomCode: this.roomCode, 
            playerId: this.playerId,
            cardId,
            chosenColor
        });
    }

    /**
     * Draw a card
     */
    drawCard() {
        this.socket.emit('drawCard', { 
            roomCode: this.roomCode, 
            playerId: this.playerId 
        });
    }

    /**
     * Choose color for wild card
     */
    chooseColor(color) {
        this.socket.emit('chooseColor', { 
            roomCode: this.roomCode, 
            playerId: this.playerId,
            color
        });
    }

    /**
     * Declare UNO
     */
    declareUno() {
        this.socket.emit('declareUno', { 
            roomCode: this.roomCode, 
            playerId: this.playerId 
        });
    }

    /**
     * Leave room
     */
    leaveRoom() {
        this.socket.emit('leaveRoom', { 
            roomCode: this.roomCode, 
            playerId: this.playerId 
        });
        this.roomCode = null;
        this.isHost = false;
        this.isSpectator = false;
        this.clearSession();
    }

    /**
     * Save session to localStorage for reconnection
     */
    saveSession() {
        localStorage.setItem('uno_playerId', this.playerId);
        localStorage.setItem('uno_roomCode', this.roomCode);
    }

    /**
     * Get saved player ID
     */
    getSavedPlayerId() {
        return localStorage.getItem('uno_playerId');
    }

    /**
     * Clear session
     */
    clearSession() {
        localStorage.removeItem('uno_playerId');
        localStorage.removeItem('uno_roomCode');
    }

    /**
     * Check for saved session
     */
    hasSavedSession() {
        return localStorage.getItem('uno_roomCode') && localStorage.getItem('uno_playerId');
    }

    /**
     * Get saved room code
     */
    getSavedRoomCode() {
        return localStorage.getItem('uno_roomCode');
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        statusEl.classList.remove('hidden', 'connected', 'error');
        
        const statusText = statusEl.querySelector('.status-text');
        
        switch (status) {
            case 'connected':
                statusEl.classList.add('connected');
                statusText.textContent = 'Connected';
                setTimeout(() => statusEl.classList.add('hidden'), 2000);
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected - Reconnecting...';
                break;
            case 'error':
                statusEl.classList.add('error');
                statusText.textContent = 'Connection Error';
                break;
            default:
                statusText.textContent = 'Connecting...';
        }
    }

    /**
     * Show/hide reconnecting overlay
     */
    showReconnectingOverlay(show) {
        const overlay = document.getElementById('reconnecting-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fadeOut');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Global network manager instance
const networkManager = new NetworkManager();

// ===========================================
// CONSTANTS
// ===========================================

const COLORS = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ACTIONS = ['Skip', 'Reverse', 'Draw_2'];
const WILDS = ['Wild', 'Wild_Draw_4'];

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
        
        // Multiplayer properties
        this.isMultiplayer = false;
        this.roomCode = null;
        this.localPlayerId = null;
        this.isSpectator = false;
        this.playerStatuses = {}; // Map of playerId -> status (connected, disconnected, ai)
    }

    /**
     * Initialize a new game
     */
    initGame() {
        // Reset state
        this.gameOver = false;
        this.winner = null;
        this.direction = 1;
        this.currentPlayerIndex = 0;
        this.discardPile = [];
        this.isProcessingTurn = false;
        this.pendingColorChoice = false;

        // Create players
        this.players = [
            new Player('You', true, 0),
            new Player('Bot 1', false, 1),
            new Player('Bot 2', false, 2),
            new Player('Bot 3', false, 3)
        ];

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

        // Update current color
        if (playedCard.isWild()) {
            this.currentColor = chosenColor;
        } else {
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
                // Skip next player
                this.playSound('skip');
                triggerFlyingUnicorn();
                this.currentPlayerIndex = this.getNextPlayerIndex();
                this.advanceTurn();
                break;

            case 'Reverse':
                // Reverse direction
                this.playSound('reverse');
                triggerFlyingUnicorn();
                this.direction *= -1;
                this.advanceTurn();
                break;

            case 'Draw_2':
                // Next player draws 2 and is skipped
                this.playSound('draw2');
                this.playSound('yell');
                triggerFlyingUnicorn();
                if (!nextPlayer.isHuman) {
                    this.playSound('penalty');
                }
                nextPlayer.addCards(this.drawCards(2));
                this.currentPlayerIndex = this.getNextPlayerIndex();
                this.advanceTurn();
                break;

            case 'Wild_Draw_4':
                // Next player draws 4 and is skipped
                this.playSound('wild4');
                this.playSound('yell');
                triggerFlyingUnicorn();
                setTimeout(() => {
                    if (!nextPlayer.isHuman) {
                        this.playSound('penalty');
                    }
                }, 400);
                nextPlayer.addCards(this.drawCards(4));
                this.currentPlayerIndex = this.getNextPlayerIndex();
                this.advanceTurn();
                break;

            case 'Wild':
                // Wild card played - trigger unicorn!
                triggerFlyingUnicorn();
                this.advanceTurn();
                break;

            default:
                // Regular card, just advance turn
                this.advanceTurn();
        }
    }

    /**
     * Advance to next player's turn
     */
    advanceTurn() {
        this.currentPlayerIndex = this.getNextPlayerIndex();
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

        const cards = this.drawCards(1);
        if (cards.length > 0) {
            player.addCard(cards[0]);
            this.playSound('draw');
            this.playSound('yell');
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
        winnerName.textContent = winner.isHuman ? 'You Win!' : `${winner.name} Wins!`;
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

    // ===========================================
    // MULTIPLAYER METHODS
    // ===========================================

    /**
     * Set multiplayer mode
     * @param {boolean} isMultiplayer
     * @param {string} roomCode
     * @param {string} localPlayerId
     * @param {boolean} isSpectator
     */
    setMultiplayerMode(isMultiplayer, roomCode = null, localPlayerId = null, isSpectator = false) {
        this.isMultiplayer = isMultiplayer;
        this.roomCode = roomCode;
        this.localPlayerId = localPlayerId;
        this.isSpectator = isSpectator;
    }

    /**
     * Update game state from server data
     * @param {Object} serverState
     */
    updateFromServer(serverState) {
        if (!serverState) return;

        // Update players
        this.players = serverState.players.map((p, index) => {
            const player = new Player(p.name, p.id === this.localPlayerId, index);
            player.id = p.id;
            
            // Set cards - only show full cards for local player
            if (p.id === this.localPlayerId && p.hand) {
                player.hand = p.hand.map(cardData => new Card(cardData.color, cardData.value, cardData.id));
            } else {
                // For other players, create placeholder cards based on cardCount
                player.hand = [];
                for (let i = 0; i < (p.cardCount || 0); i++) {
                    player.hand.push(new Card(null, null, `hidden_${i}`));
                }
            }
            
            player.saidUno = p.saidUno || false;
            return player;
        });

        // Update player statuses
        this.playerStatuses = {};
        serverState.players.forEach(p => {
            this.playerStatuses[p.id] = p.status || 'connected';
        });

        // Update discard pile (server sends top card)
        if (serverState.discardPile && serverState.discardPile.length > 0) {
            const topCardData = serverState.discardPile[serverState.discardPile.length - 1];
            this.discardPile = [new Card(topCardData.color, topCardData.value, topCardData.id)];
        }

        // Update draw pile count
        this.drawPileCount = serverState.drawPileCount || 0;

        // Update game properties
        this.currentPlayerIndex = serverState.currentPlayerIndex;
        this.direction = serverState.direction;
        this.currentColor = serverState.currentColor;
        this.gameOver = serverState.gameOver || false;
        this.pendingColorChoice = serverState.pendingColorChoice || false;

        if (serverState.winner) {
            const winnerIndex = this.players.findIndex(p => p.id === serverState.winner);
            this.winner = winnerIndex >= 0 ? this.players[winnerIndex] : null;
        }
    }

    /**
     * Get the local player (in multiplayer mode)
     * @returns {Player|null}
     */
    getLocalPlayer() {
        if (!this.isMultiplayer) return this.players[0];
        return this.players.find(p => p.id === this.localPlayerId);
    }

    /**
     * Check if it's the local player's turn
     * @returns {boolean}
     */
    isLocalPlayerTurn() {
        if (!this.isMultiplayer) return this.currentPlayerIndex === 0;
        if (this.isSpectator) return false;
        const localPlayer = this.getLocalPlayer();
        return localPlayer && this.players[this.currentPlayerIndex]?.id === localPlayer.id;
    }

    /**
     * Get player status emoji
     * @param {Player} player
     * @returns {string}
     */
    getPlayerStatusEmoji(player) {
        const status = this.playerStatuses[player.id];
        switch (status) {
            case 'connected': return '🟢';
            case 'disconnected': return '🟡';
            case 'ai': return '🤖';
            default: return '🟢';
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
        const localPlayer = this.gameState.getLocalPlayer();
        const localPlayerIndex = localPlayer ? this.gameState.players.indexOf(localPlayer) : 0;
        
        for (let i = 0; i < this.gameState.players.length; i++) {
            const player = this.gameState.players[i];
            
            // Calculate position relative to local player (local player always at bottom)
            let positionIndex = i;
            if (this.gameState.isMultiplayer && localPlayerIndex >= 0) {
                positionIndex = (i - localPlayerIndex + this.gameState.players.length) % this.gameState.players.length;
            }
            
            const position = positions[positionIndex];
            const playerArea = document.getElementById(`player-${position}`);
            if (!playerArea) continue;
            
            const handContainer = playerArea.querySelector('.player-hand');
            const cardCount = playerArea.querySelector('.card-count');
            const nameEl = playerArea.querySelector('.player-name');
            
            // Update player name with status in multiplayer
            if (this.gameState.isMultiplayer && nameEl) {
                const statusEmoji = this.gameState.getPlayerStatusEmoji(player);
                nameEl.innerHTML = `${statusEmoji} ${player.name}`;
            } else if (nameEl) {
                nameEl.textContent = player.name;
            }
            
            // Update card count
            cardCount.textContent = player.cardCount();
            
            // Clear hand
            handContainer.innerHTML = '';
            
            // Render cards based on player type and multiplayer mode
            const isLocalPlayer = this.gameState.isMultiplayer 
                ? (player.id === this.gameState.localPlayerId)
                : player.isHuman;
            
            if (isLocalPlayer && !this.gameState.isSpectator) {
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
        }
        
        // Show spectator banner if spectating
        const spectatorBanner = document.getElementById('spectator-game-banner');
        if (spectatorBanner) {
            if (this.gameState.isSpectator) {
                spectatorBanner.classList.remove('hidden');
            } else {
                spectatorBanner.classList.add('hidden');
            }
        }
    }

    /**
     * Render human player's hand (face up, clickable)
     * @param {Player} player
     * @param {HTMLElement} container
     */
    renderHumanHand(player, container) {
        const topCard = this.gameState.getTopCard();
        const currentColor = this.gameState.currentColor;
        const isMyTurn = this.gameState.isMultiplayer 
            ? this.gameState.isLocalPlayerTurn()
            : this.gameState.currentPlayerIndex === player.index;
        
        for (const card of player.hand) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.backgroundImage = `url('${card.getImagePath()}')`;
            cardEl.dataset.cardId = card.id;
            
            // Check if playable
            const isPlayable = player.canPlay(card, topCard, currentColor);
            
            if (isMyTurn && isPlayable && !this.gameState.isProcessingTurn && !this.gameState.pendingColorChoice) {
                cardEl.classList.add('playable');
                cardEl.addEventListener('click', () => this.handleCardClick(card));
                cardEl.addEventListener('mouseenter', () => this.gameState.playSound('hover'));
            }
            
            container.appendChild(cardEl);
        }
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
        if (this.gameState.isSpectator) return;
        
        // In multiplayer, check if it's our turn
        if (this.gameState.isMultiplayer) {
            if (!this.gameState.isLocalPlayerTurn()) return;
            
            // If wild card, show color picker
            if (card.isWild()) {
                this.gameState.playSound('wild');
                this.showColorPicker((color) => {
                    this.gameState.playSound('colorselect');
                    networkManager.playCard(card.id, color);
                });
            } else {
                this.gameState.playSound('play');
                networkManager.playCard(card.id);
            }
        } else {
            // Single player mode - original logic
            const player = this.gameState.getCurrentPlayer();
            if (!player.isHuman) return;
            
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
        
        if (topCard) {
            discardEl.className = 'card discard-top';
            discardEl.style.backgroundImage = `url('${topCard.getImagePath()}')`;
        }
    }

    /**
     * Render draw pile indicator
     */
    renderDrawPile() {
        const drawPile = document.getElementById('draw-pile');
        const pileLabel = drawPile.querySelector('.pile-label');
        
        // In multiplayer, use the count from server
        const count = this.gameState.isMultiplayer 
            ? (this.gameState.drawPileCount || 0)
            : this.gameState.drawPile.count();
        
        pileLabel.textContent = `DRAW (${count})`;
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
        } else if (this.gameState.isSpectator) {
            turnText.textContent = `${currentPlayer?.name || 'Player'}'s Turn`;
        } else if (this.gameState.isMultiplayer) {
            const isMyTurn = this.gameState.isLocalPlayerTurn();
            turnText.textContent = isMyTurn ? 'Your Turn' : `${currentPlayer?.name || 'Player'}'s Turn`;
        } else if (currentPlayer?.isHuman) {
            turnText.textContent = 'Your Turn';
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
            // It's the human player's turn - play notification sound
            this.gameState.playSound('yourturn');
        }
    }

    /**
     * Process AI player's turn
     * @param {Player} aiPlayer
     */
    processAITurn(aiPlayer) {
        this.gameState.isProcessingTurn = true;
        this.render();
        
        setTimeout(() => {
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
        if (this.gameState.isSpectator) return;
        
        // In multiplayer, use network manager
        if (this.gameState.isMultiplayer) {
            if (!this.gameState.isLocalPlayerTurn()) return;
            this.gameState.playSound('draw');
            networkManager.drawCard();
        } else {
            // Single player mode - original logic
            const player = this.gameState.getCurrentPlayer();
            if (!player.isHuman) return;
            
            // Check if player has playable cards
            const playableCards = player.getPlayableCards(
                this.gameState.getTopCard(),
                this.gameState.currentColor
            );
            
            // Draw a card
            const drawnCard = this.gameState.drawCardForPlayer(player);
            
            if (drawnCard) {
                this.render();
                
                // Check if drawn card is playable
                if (player.canPlay(drawnCard, this.gameState.getTopCard(), this.gameState.currentColor)) {
                    // Allow playing the drawn card (it will be highlighted)
                    // Player can choose to play it or pass
                    setTimeout(() => {
                        // If player doesn't play within 3 seconds, auto-advance
                        // But for now, just let them click it
                    }, 100);
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
        this.setupNetworkListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Mode selection buttons
        const playAiBtn = document.getElementById('play-ai-btn');
        if (playAiBtn) {
            playAiBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        const createRoomBtn = document.getElementById('create-room-btn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                this.showView('create-room-view');
            });
        }
        
        const joinRoomBtn = document.getElementById('join-room-btn');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                this.showView('join-room-view');
            });
        }
        
        // Create room form
        const createRoomForm = document.getElementById('create-room-form');
        if (createRoomForm) {
            createRoomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('create-player-name').value.trim() || 'Player';
                this.createRoom(name);
            });
        }
        
        // Join room form
        const joinRoomForm = document.getElementById('join-room-form');
        if (joinRoomForm) {
            joinRoomForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('join-player-name').value.trim() || 'Player';
                const code = document.getElementById('room-code-input').value.trim().toUpperCase();
                if (code.length === 4) {
                    this.joinRoom(code, name, false);
                }
            });
        }
        
        // Spectate button
        const spectateBtn = document.getElementById('spectate-btn');
        if (spectateBtn) {
            spectateBtn.addEventListener('click', () => {
                const code = document.getElementById('room-code-input').value.trim().toUpperCase();
                if (code.length === 4) {
                    this.joinRoom(code, 'Spectator', true);
                }
            });
        }
        
        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showView('mode-selection');
            });
        });
        
        // Lobby ready toggle
        const readyToggle = document.getElementById('ready-toggle');
        if (readyToggle) {
            readyToggle.addEventListener('click', () => {
                networkManager.toggleReady();
            });
        }
        
        // Lobby start game button
        const lobbyStartBtn = document.getElementById('lobby-start-btn');
        if (lobbyStartBtn) {
            lobbyStartBtn.addEventListener('click', () => {
                networkManager.startGame();
            });
        }
        
        // Leave lobby button
        const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
        if (leaveLobbyBtn) {
            leaveLobbyBtn.addEventListener('click', () => {
                networkManager.leaveRoom();
                this.showView('mode-selection');
            });
        }

        // Start game button (single player - legacy support)
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            if (this.gameState.isMultiplayer) {
                // In multiplayer, go back to mode selection
                networkManager.leaveRoom();
                this.showView('mode-selection');
            } else {
                this.startGame();
            }
        });

        // Play again button
        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('winner-modal').classList.add('hidden');
            if (this.gameState.isMultiplayer) {
                networkManager.leaveRoom();
                this.showView('mode-selection');
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

        // Draw pile click
        document.getElementById('draw-pile').addEventListener('click', () => {
            this.renderer.handleDrawClick();
        });
    }
    
    /**
     * Setup network event listeners
     */
    setupNetworkListeners() {
        networkManager.on('roomCreated', (data) => {
            this.showLobby(data.roomCode, true);
        });
        
        networkManager.on('roomJoined', (data) => {
            if (data.isSpectator) {
                this.showView('spectator-view');
                this.gameState.setMultiplayerMode(true, data.roomCode, null, true);
            } else {
                this.showLobby(data.roomCode, false);
            }
        });
        
        networkManager.on('lobbyState', (data) => {
            this.updateLobbyUI(data);
        });
        
        networkManager.on('gameStarted', (data) => {
            this.startMultiplayerGame();
        });
        
        networkManager.on('gameState', (data) => {
            this.handleGameStateUpdate(data);
        });
        
        networkManager.on('chooseColor', () => {
            this.renderer.showColorPicker((color) => {
                this.gameState.playSound('colorselect');
                networkManager.chooseColor(color);
            });
        });
        
        networkManager.on('colorChosen', (data) => {
            this.gameState.currentColor = data.color;
            this.renderer.render();
        });
        
        networkManager.on('unoDeclared', (data) => {
            const player = this.gameState.players.find(p => p.id === data.playerId);
            if (player) {
                this.gameState.triggerUnoAlert(player);
            }
        });
        
        networkManager.on('playerAction', (data) => {
            // Play appropriate sound
            if (data.action === 'playCard') {
                this.gameState.playSound('play');
            } else if (data.action === 'drawCard') {
                this.gameState.playSound('draw');
            }
        });

        networkManager.on('error', (data) => {
            if (data.code === 'ROOM_NOT_FOUND') {
                this.showView('join-room-view');
            }
        });
    }
    
    /**
     * Show a specific view
     * @param {string} viewId
     */
    showView(viewId) {
        const views = [
            'mode-selection', 'start-modal', 'create-room-view', 
            'join-room-view', 'lobby-view', 'spectator-view'
        ];
        
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) {
                if (v === viewId) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        });
        
        this.currentView = viewId;
    }
    
    /**
     * Create a new multiplayer room
     * @param {string} playerName
     */
    async createRoom(playerName) {
        try {
            await networkManager.connect();
            networkManager.createRoom(playerName);
        } catch (error) {
            networkManager.showToast('Failed to connect to server', 'error');
        }
    }
    
    /**
     * Join an existing room
     * @param {string} roomCode
     * @param {string} playerName
     * @param {boolean} asSpectator
     */
    async joinRoom(roomCode, playerName, asSpectator = false) {
        try {
            await networkManager.connect();
            networkManager.joinRoom(roomCode, playerName, asSpectator);
        } catch (error) {
            networkManager.showToast('Failed to connect to server', 'error');
        }
    }
    
    /**
     * Show lobby view
     * @param {string} roomCode
     * @param {boolean} isHost
     */
    showLobby(roomCode, isHost) {
        this.showView('lobby-view');
        
        const codeDisplay = document.getElementById('lobby-room-code');
        if (codeDisplay) {
            codeDisplay.textContent = roomCode;
        }
        
        const startBtn = document.getElementById('lobby-start-btn');
        if (startBtn) {
            startBtn.classList.toggle('hidden', !isHost);
        }
    }
    
    /**
     * Update lobby UI with player list
     * @param {Object} data
     */
    updateLobbyUI(data) {
        const playerList = document.getElementById('lobby-player-list');
        if (!playerList) return;
        
        playerList.innerHTML = '';
        
        data.players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'player-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            if (player.isHost) {
                nameSpan.textContent += ' 👑';
            }
            
            const statusSpan = document.createElement('span');
            statusSpan.className = `status-badge ${player.isReady ? 'ready' : 'not-ready'}`;
            statusSpan.textContent = player.isReady ? 'Ready' : 'Not Ready';
            
            li.appendChild(nameSpan);
            li.appendChild(statusSpan);
            playerList.appendChild(li);
        });
        
        // Update spectator count
        const spectatorCount = document.getElementById('spectator-count');
        if (spectatorCount && data.spectatorCount !== undefined) {
            spectatorCount.textContent = `${data.spectatorCount} spectator(s)`;
        }
        
        // Update ready toggle button state
        const readyToggle = document.getElementById('ready-toggle');
        if (readyToggle) {
            const localPlayer = data.players.find(p => p.id === networkManager.playerId);
            if (localPlayer) {
                readyToggle.textContent = localPlayer.isReady ? 'Not Ready' : 'Ready Up';
                readyToggle.classList.toggle('ready', localPlayer.isReady);
            }
        }
        
        // Enable/disable start button
        const startBtn = document.getElementById('lobby-start-btn');
        if (startBtn && networkManager.isHost) {
            const allReady = data.players.length >= 2 && data.players.every(p => p.isReady);
            startBtn.disabled = !allReady;
            startBtn.title = allReady ? 'Start the game' : 'Need 2+ players, all ready';
        }
    }
    
    /**
     * Start multiplayer game
     */
    startMultiplayerGame() {
        this.showView('game'); // Hide all modals
        
        // Hide all modal views
        ['mode-selection', 'start-modal', 'create-room-view', 'join-room-view', 'lobby-view', 'spectator-view']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
        
        // Set multiplayer mode
        this.gameState.setMultiplayerMode(
            true, 
            networkManager.roomCode, 
            networkManager.playerId,
            networkManager.isSpectator
        );
        
        // Initialize audio
        if (!soundManager.audioContext) {
            soundManager.init();
        }
        
        this.gameState.startBackgroundMusic();
        this.gameState.playSound('gamestart');
    }
    
    /**
     * Handle game state update from server
     * @param {Object} data
     */
    handleGameStateUpdate(data) {
        const wasMyTurn = this.gameState.isLocalPlayerTurn();
        
        // Update local game state from server
        this.gameState.updateFromServer(data);
        
        // Render
        this.renderer.render();
        
        // Play turn notification if it became our turn
        const isMyTurn = this.gameState.isLocalPlayerTurn();
        if (!wasMyTurn && isMyTurn && !this.gameState.gameOver) {
            this.gameState.playSound('yourturn');
        }
        
        // Check for game over
        if (this.gameState.gameOver && this.gameState.winner) {
            this.gameState.endGame(this.gameState.winner);
        }
    }

    /**
     * Start a new game (single player)
     */
    startGame() {
        // Hide all modal views for single-player
        ['mode-selection', 'start-modal', 'create-room-view', 'join-room-view', 'lobby-view', 'spectator-view']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
        
        // Reset to single-player mode
        this.gameState.setMultiplayerMode(false);
        
        // Initialize audio context on user interaction
        if (!soundManager.audioContext) {
            soundManager.init();
        }
        
        // Start background music
        this.gameState.startBackgroundMusic();
        
        // Play game start jingle
        this.gameState.playSound('gamestart');
        
        // Initialize game
        this.gameState.initGame();
        
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
