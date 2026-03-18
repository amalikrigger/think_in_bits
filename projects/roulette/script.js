// --- Constants ---
const WHEEL_SEQUENCE = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const PAYOUTS = {
    'number': 35,
    'color': 1,
    'parity': 1,
    'range': 1,
    'dozen': 2,
    'column': 2
};

// --- Game State ---
let balance = 1000;
let currentBets = []; // Array of { type, value, amount, element }
let selectedChip = 5;
let betMode = 'add'; // 'add' or 'remove'
let isSpinning = false;
let history = [];
let currentRotation = 0;

// --- Audio ---
// Create audio elements programmatically using Web Audio API for generated sounds
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let audioInitialized = false;

// HTML5 Audio for background music (MP3 file)
let backgroundMusic = null;

// Volume controls (0 to 1)
let musicVolume = 0.5;
let sfxVolume = 0.7;

// Master gain nodes for volume control
let musicGainNode = null;
let sfxGainNode = null;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new AudioContext();
            
            // Create master gain nodes for volume control
            musicGainNode = audioCtx.createGain();
            musicGainNode.gain.setValueAtTime(musicVolume, audioCtx.currentTime);
            musicGainNode.connect(audioCtx.destination);
            
            sfxGainNode = audioCtx.createGain();
            sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
            sfxGainNode.connect(audioCtx.destination);
        } catch (e) {
            console.error('Failed to create AudioContext:', e);
            return;
        }
    }
    
    // Resume audio context if suspended (required after user interaction)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Initialize audio system on first user interaction
    if (!audioInitialized) {
        audioInitialized = true;
        startJazzMusic();
        setupVolumeControls();
    }
}

let volumeControlsSetup = false;

function setupVolumeControls() {
    if (volumeControlsSetup) return;
    volumeControlsSetup = true;
    
    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const musicValueEl = document.getElementById('music-volume-value');
    const sfxValueEl = document.getElementById('sfx-volume-value');
    
    if (musicSlider) {
        // Set initial value from slider
        musicVolume = musicSlider.value / 100;
        updateMusicVolume(musicVolume);
        
        musicSlider.addEventListener('input', (e) => {
            musicVolume = e.target.value / 100;
            updateMusicVolume(musicVolume);
            if (musicValueEl) {
                musicValueEl.textContent = `${e.target.value}%`;
            }
        });
    }
    
    if (sfxSlider) {
        // Set initial value from slider
        sfxVolume = sfxSlider.value / 100;
        
        sfxSlider.addEventListener('input', (e) => {
            sfxVolume = e.target.value / 100;
            if (sfxGainNode && audioCtx) {
                sfxGainNode.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
            }
            if (sfxValueEl) {
                sfxValueEl.textContent = `${e.target.value}%`;
            }
        });
    }
}

// --- Jazz Lobby Music ---
function startJazzMusic() {
    tryStartMusic();
}

function updateMusicVolume(volume) {
    musicVolume = volume;
    if (backgroundMusic) {
        backgroundMusic.volume = musicVolume;
    }
}

// Pause music temporarily for sound effects
function pauseMusicForEffect(durationMs) {
    if (backgroundMusic && !backgroundMusic.paused && musicEnabled) {
        backgroundMusic.pause();
        setTimeout(() => {
            if (backgroundMusic && musicEnabled) {
                backgroundMusic.play().catch(e => {});
            }
        }, durationMs);
    }
}

// --- Sad Trombone ---
function playSadTrombone() {
    initAudio();
    if (!audioCtx) return;
    
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Pause lobby music during this sound effect (total duration ~2 seconds)
    pauseMusicForEffect(2200);
    
    // Classic "wah wah wah wahhh" descending pattern
    const notes = [
        { freq: 311.13, duration: 0.4 },  // Eb4
        { freq: 293.66, duration: 0.4 },  // D4
        { freq: 277.18, duration: 0.4 },  // C#4
        { freq: 246.94, duration: 0.8 },  // B3 (longer, sadder)
    ];
    
    let startTime = audioCtx.currentTime;
    
    notes.forEach((note, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        // Trombone-like sawtooth wave
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, startTime);
        
        // Add slight pitch bend down for sadness
        if (index === notes.length - 1) {
            osc.frequency.linearRampToValueAtTime(note.freq * 0.9, startTime + note.duration);
        }
        
        // Brass-like filter
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, startTime);
        filter.frequency.linearRampToValueAtTime(800, startTime + note.duration);
        filter.Q.setValueAtTime(2, startTime);
        
        // Envelope with slight attack
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.setValueAtTime(0.25, startTime + note.duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGainNode || audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + note.duration + 0.1);
        
        startTime += note.duration;
    });
}

function playChipSound() {
    initAudio();
    if (!audioCtx) return;
    
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(sfxGainNode || audioCtx.destination);
    
    // Apply current SFX volume
    const volume = 0.6 * sfxVolume;
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
}

function playSpinSound() {
    initAudio();
    if (!audioCtx) return;
    
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Create a drumroll sound effect - more spaced out for realistic drum
    const duration = 5; // Match spin animation duration
    
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Create drumroll - spaced out hits that slow down at the end
    let hitInterval = 80; // More spaced out (milliseconds between hits)
    let sampleIndex = 0;
    let nextHit = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        
        // Keep steady drumroll until near the end, then slow down
        if (progress < 0.7) {
            hitInterval = 80 + (progress * 40);
        } else {
            hitInterval = 120 + ((progress - 0.7) / 0.3) * 300;
        }
        
        if (sampleIndex >= nextHit) {
            // Create a drum hit sound - more pronounced
            const hitDuration = 600;
            for (let j = 0; j < hitDuration && (i + j) < bufferSize; j++) {
                const envelope = Math.exp(-j / 120);
                // Mix of low thump and higher attack for snare-like sound
                const lowFreq = Math.sin(j * 0.03) * envelope * 0.5;
                const midFreq = Math.sin(j * 0.08) * envelope * 0.3;
                const highFreq = (Math.random() * 2 - 1) * Math.exp(-j / 40) * 0.25;
                // Fade out volume towards the end
                const volumeFade = progress < 0.8 ? 1 : (1 - (progress - 0.8) / 0.2);
                data[i + j] += (lowFreq + midFreq + highFreq) * volumeFade;
            }
            nextHit = sampleIndex + (audioCtx.sampleRate / 1000 * hitInterval);
        }
        sampleIndex++;
    }
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    
    // Add a low-pass filter for warmer drum sound
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, audioCtx.currentTime);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(sfxGainNode || audioCtx.destination);
    
    source.start();
    source.stop(audioCtx.currentTime + duration);
}

function playWinSound() {
    initAudio();
    if (!audioCtx) return;
    
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Play celebratory arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(sfxGainNode || audioCtx.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscillator.type = 'sine';
        
        const startTime = audioCtx.currentTime + index * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
    });
    
    // Play "yay" sound effect
    playYaySound();
}

// Store active yay sound oscillators for stopping them
let activeYaySounds = [];

function playYaySound(customDuration = null) {
    initAudio();
    if (!audioCtx) return;
    
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Create a cheerful "yay" vocal-like sound - extended duration
    // If customDuration is provided, use it (for syncing with confetti)
    const duration = customDuration || 1.2;
    
    // Pause lobby music during this sound effect
    pauseMusicForEffect(duration * 1000 + 500);
    
    // Main "yay" sound - starts with 'y' then sweeps up for 'ay'
    const oscillator1 = audioCtx.createOscillator();
    const oscillator2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // First formant (vowel sound)
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(250, audioCtx.currentTime);
    oscillator1.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.15);
    oscillator1.frequency.linearRampToValueAtTime(380, audioCtx.currentTime + 0.5);
    oscillator1.frequency.linearRampToValueAtTime(350, audioCtx.currentTime + duration);
    
    // Second formant for brightness
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator2.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
    oscillator2.frequency.linearRampToValueAtTime(1100, audioCtx.currentTime + 0.6);
    oscillator2.frequency.linearRampToValueAtTime(1000, audioCtx.currentTime + duration);
    
    // Formant filter
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(1500, audioCtx.currentTime + 0.15);
    filter.frequency.linearRampToValueAtTime(1400, audioCtx.currentTime + duration);
    filter.Q.setValueAtTime(2, audioCtx.currentTime);
    
    // Envelope - longer sustain
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.08);
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime + 0.5);
    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(sfxGainNode || audioCtx.destination);
    
    oscillator1.start(audioCtx.currentTime);
    oscillator2.start(audioCtx.currentTime);
    oscillator1.stop(audioCtx.currentTime + duration);
    oscillator2.stop(audioCtx.currentTime + duration);
    
    // Track these oscillators
    activeYaySounds.push({ osc: oscillator1, gain: gainNode });
    activeYaySounds.push({ osc: oscillator2, gain: gainNode });
    
    // Add a second higher "yay" for chorus effect - also longer
    setTimeout(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filt = audioCtx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(450, audioCtx.currentTime + 0.8);
        
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(1200, audioCtx.currentTime);
        filt.Q.setValueAtTime(2, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
        
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(sfxGainNode || audioCtx.destination);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 1.0);
    }, 150);
    
    // Add a third voice for richer sound
    setTimeout(() => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filt = audioCtx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(550, audioCtx.currentTime + 0.12);
        
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(1400, audioCtx.currentTime);
        filt.Q.setValueAtTime(2, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);
        
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(sfxGainNode || audioCtx.destination);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.9);
    }, 250);
}

// Confetti duration in seconds
const CONFETTI_DURATION = 4;
let confettiYayInterval = null;

// --- Confetti ---
let confettiContainer = null;

function createConfetti() {
    // Remove existing confetti if any
    removeConfetti();
    
    // Start the extended yay sound that loops until confetti ends
    startExtendedYaySound();
    
    confettiContainer = document.createElement('div');
    confettiContainer.id = 'confetti-container';
    confettiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        overflow: hidden;
    `;
    document.body.appendChild(confettiContainer);
    
    const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#00bcd4', '#ff9800'];
    const confettiCount = 150;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5;
        const left = Math.random() * 100;
        const animDuration = Math.random() * 2 + 2;
        const animDelay = Math.random() * 0.5;
        const rotation = Math.random() * 360;
        const shape = Math.random() > 0.5 ? '50%' : '0';
        
        confetti.style.cssText = `
            position: absolute;
            top: -20px;
            left: ${left}%;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: ${shape};
            transform: rotate(${rotation}deg);
            animation: confetti-fall ${animDuration}s ease-out ${animDelay}s forwards;
        `;
        
        confettiContainer.appendChild(confetti);
    }
    
    // Add keyframes if not already present
    if (!document.getElementById('confetti-styles')) {
        const style = document.createElement('style');
        style.id = 'confetti-styles';
        style.textContent = `
            @keyframes confetti-fall {
                0% {
                    transform: translateY(0) rotate(0deg) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translateY(100vh) rotate(720deg) scale(0.5);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function removeConfetti() {
    if (confettiContainer) {
        confettiContainer.remove();
        confettiContainer = null;
    }
    // Stop the extended yay sound
    stopExtendedYaySound();
}

function startExtendedYaySound() {
    // Play yay sound immediately with longer duration
    playYaySound(CONFETTI_DURATION);
    
    // Also play additional overlapping yay sounds for a crowd effect
    confettiYayInterval = setInterval(() => {
        if (!confettiContainer) {
            stopExtendedYaySound();
            return;
        }
        // Play quieter background yays
        playQuietYay();
    }, 800);
}

function stopExtendedYaySound() {
    if (confettiYayInterval) {
        clearInterval(confettiYayInterval);
        confettiYayInterval = null;
    }
    // Fade out any remaining sounds
    activeYaySounds.forEach(sound => {
        try {
            if (sound.gain && audioCtx) {
                sound.gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            }
        } catch (e) { /* ignore */ }
    });
    activeYaySounds = [];
}

function playQuietYay() {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    // Random pitch variation for crowd effect
    const pitchOffset = (Math.random() - 0.5) * 100;
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280 + pitchOffset, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(420 + pitchOffset, audioCtx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(380 + pitchOffset, audioCtx.currentTime + 0.6);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100 + pitchOffset, audioCtx.currentTime);
    filter.Q.setValueAtTime(2, audioCtx.currentTime);
    
    // Quieter for background crowd
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGainNode || audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.7);
    
    activeYaySounds.push({ osc, gain });
}

// --- DOM Elements ---
const numbersGrid = document.getElementById('numbers-grid');
const balanceEl = document.getElementById('balance-amount');
const betAmountEl = document.getElementById('bet-amount');
const spinBtn = document.getElementById('spin-btn');
const clearBtn = document.getElementById('clear-btn');
const wheelInner = document.getElementById('wheel-inner');
const winningNumEl = document.getElementById('winning-number');
const winningColorEl = document.getElementById('winning-color');
const historyList = document.getElementById('history-list');
const chipBtns = document.querySelectorAll('.chip-btn');

// --- Initialization ---
function init() {
    generateGrid();
    generateWheel();
    setupEventListeners();
    setupFirstClickAudioInit();
    updateUI();
    
    // Try to start music immediately (will likely be blocked, but worth trying)
    tryStartMusic();
}

// Music enabled state
let musicEnabled = true;

// Music playlist - all tracks in the music folder
const musicTracks = [
    'music/backgroundmusicforvideos-jazz-background-music-bar-restaurant-casino-mafia-whiskey-249670.mp3',
    'music/lnplusmusic-jazz-jazz-music-469468.mp3',
    'music/music_for_videos-casino-164235.mp3',
    'music/tavccitypop-tavc-city-pop-361233.mp3'
];

let shuffledPlaylist = [];
let currentTrackIndex = 0;

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Play the next track in the shuffled playlist
function playNextTrack() {
    currentTrackIndex++;
    if (currentTrackIndex >= shuffledPlaylist.length) {
        // Reshuffle when we've played all tracks
        shuffledPlaylist = shuffleArray(musicTracks);
        currentTrackIndex = 0;
    }
    
    if (backgroundMusic && musicEnabled) {
        backgroundMusic.src = shuffledPlaylist[currentTrackIndex];
        backgroundMusic.play().catch(e => {});
    }
}

// Try to start music - called on load and on interactions
function tryStartMusic() {
    if (!backgroundMusic) {
        // Shuffle the playlist on first init
        shuffledPlaylist = shuffleArray(musicTracks);
        currentTrackIndex = 0;
        
        // Create audio element for the shuffled music
        backgroundMusic = new Audio(shuffledPlaylist[currentTrackIndex]);
        backgroundMusic.volume = musicVolume;
        backgroundMusic.preload = 'auto';
        
        // When track ends, play next shuffled track
        backgroundMusic.addEventListener('ended', playNextTrack);
    }
    
    if (musicEnabled && backgroundMusic.paused) {
        backgroundMusic.play().catch(e => {
            // Autoplay blocked, will play on user interaction
        });
    }
}

// Toggle music on/off
function toggleMusic() {
    musicEnabled = !musicEnabled;
    
    if (musicEnabled) {
        if (backgroundMusic) {
            backgroundMusic.play().catch(e => {});
        } else {
            tryStartMusic();
        }
    } else {
        if (backgroundMusic) {
            backgroundMusic.pause();
        }
    }
    
    updateMusicToggleButton();
}

function updateMusicToggleButton() {
    const btn = document.getElementById('music-toggle-btn');
    if (btn) {
        btn.textContent = musicEnabled ? '🔊 Music On' : '🔇 Music Off';
        btn.classList.toggle('music-off', !musicEnabled);
    }
}

// Ensure audio starts on first user interaction (browser requirement)
function setupFirstClickAudioInit() {
    const startAudioOnInteraction = () => {
        initAudio();
        tryStartMusic();
    };
    
    // Listen for any user interaction to initialize audio
    document.addEventListener('click', startAudioOnInteraction);
    document.addEventListener('keydown', startAudioOnInteraction);
    document.addEventListener('touchstart', startAudioOnInteraction);
    
    // Also setup volume controls immediately so they work before audio starts
    setupVolumeControls();
}

function generateGrid() {
    // Numbers 1-36 are usually arranged in 3 rows
    for (let i = 1; i <= 36; i++) {
        const cell = document.createElement('div');
        cell.classList.add('bet-cell');
        
        const color = RED_NUMBERS.includes(i) ? 'red-bg' : 'black-bg';
        cell.classList.add(color);
        cell.dataset.betType = 'number';
        cell.dataset.betValue = i;
        cell.textContent = i;
        
        numbersGrid.appendChild(cell);
    }
}

function generateWheel() {
    const totalPockets = WHEEL_SEQUENCE.length;
    const anglePerPocket = 360 / totalPockets;

    WHEEL_SEQUENCE.forEach((num, i) => {
        const pocket = document.createElement('div');
        pocket.classList.add('wheel-pocket');
        
        const colorClass = num === 0 ? 'green-pocket' : (RED_NUMBERS.includes(num) ? 'red-pocket' : 'black-pocket');
        pocket.classList.add(colorClass);
        
        // Position the pocket - offset by half a pocket width for centering
        const rotation = i * anglePerPocket;
        pocket.style.transform = `rotate(${rotation}deg)`;
        
        const span = document.createElement('span');
        span.textContent = num;
        // Rotate the number to be readable from outside
        span.style.transform = `rotate(0deg)`;
        pocket.appendChild(span);
        
        wheelInner.appendChild(pocket);
    });
    
    // Add ball element
    const ball = document.createElement('div');
    ball.id = 'wheel-ball';
    ball.classList.add('wheel-ball');
    wheelInner.parentElement.appendChild(ball);
}

function setupEventListeners() {
    // Betting clicks (Event Delegation)
    document.querySelector('.roulette-table').addEventListener('click', (e) => {
        const cell = e.target.closest('.bet-cell');
        if (cell && !isSpinning) {
            placeBet(cell);
        }
    });

    // Chip selection (clicking on chip itself)
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chipBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedChip = parseInt(btn.dataset.value);
        });
    });
    
    // Chip action buttons (+/-)
    const chipActions = document.querySelectorAll('.chip-action');
    chipActions.forEach(action => {
        action.addEventListener('click', () => {
            const chipValue = parseInt(action.dataset.value);
            const mode = action.dataset.mode;
            
            // Update selected chip
            selectedChip = chipValue;
            chipBtns.forEach(b => b.classList.remove('active'));
            document.querySelector(`.chip-btn[data-value="${chipValue}"]`).classList.add('active');
            
            // Update bet mode
            betMode = mode;
            
            // Update action button visuals
            chipActions.forEach(a => a.classList.remove('active'));
            // Activate all buttons of the same mode
            document.querySelectorAll(`.chip-action[data-mode="${mode}"]`).forEach(a => {
                if (parseInt(a.dataset.value) === chipValue) {
                    a.classList.add('active');
                }
            });
        });
    });

    spinBtn.addEventListener('click', spin);
    clearBtn.addEventListener('click', clearBets);
}

// --- Logic ---

function placeBet(cell) {
    const type = cell.dataset.betType;
    const value = cell.dataset.betValue;

    // Check if bet already exists on this cell
    const existingBet = currentBets.find(b => b.type === type && b.value === value);

    if (betMode === 'add') {
        // Add mode
        if (balance < selectedChip) {
            alert("Insufficient balance!");
            return;
        }
        
        playChipSound();
        
        if (existingBet) {
            existingBet.amount += selectedChip;
            updateChipDisplay(cell, existingBet.amount);
        } else {
            const bet = { type, value, amount: selectedChip, cell };
            currentBets.push(bet);
            addChipToCell(cell, selectedChip);
        }
        
        balance -= selectedChip;
        updateUI();
    } else {
        // Remove mode
        if (!existingBet) {
            // No bet to remove
            return;
        }
        
        const removeAmount = Math.min(selectedChip, existingBet.amount);
        
        playChipSound();
        existingBet.amount -= removeAmount;
        balance += removeAmount;
        
        if (existingBet.amount <= 0) {
            // Remove the bet entirely
            const index = currentBets.indexOf(existingBet);
            if (index > -1) {
                currentBets.splice(index, 1);
            }
            // Remove chip from cell
            const chip = cell.querySelector('.chip');
            if (chip) chip.remove();
        } else {
            updateChipDisplay(cell, existingBet.amount);
        }
        
        updateUI();
    }
}

function addChipToCell(cell, amount) {
    const chip = document.createElement('div');
    chip.classList.add('chip');
    chip.textContent = amount;
    cell.appendChild(chip);
}

function updateChipDisplay(cell, amount) {
    const chip = cell.querySelector('.chip');
    if (chip) chip.textContent = amount;
}

function clearBets() {
    if (isSpinning) return;
    
    // Refund active bets to balance
    const totalCurrentBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
    balance += totalCurrentBet;
    
    // Clear DOM
    document.querySelectorAll('.chip').forEach(c => c.remove());
    document.querySelectorAll('.winning-highlight').forEach(c => c.classList.remove('winning-highlight'));
    
    currentBets = [];
    updateUI();
}

function spin() {
    if (isSpinning || currentBets.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    clearBtn.disabled = true;

    // Play spinning sound
    playSpinSound();

    // Remove old highlights
    document.querySelectorAll('.winning-highlight').forEach(c => c.classList.remove('winning-highlight'));

    // 1. Pick Winner
    const winnerIndex = Math.floor(Math.random() * WHEEL_SEQUENCE.length);
    const winningNumber = WHEEL_SEQUENCE[winnerIndex];

    // 2. Animate Wheel
    const pocketDegrees = 360 / WHEEL_SEQUENCE.length;
    const extraSpins = 5;
    
    const currentPos = currentRotation % 360;
    const targetPos = winnerIndex * pocketDegrees;
    
    let distance = targetPos - currentPos;
    if (distance < 0) distance += 360;
    
    // Total accumulated rotation
    currentRotation += (extraSpins * 360) + distance;
    
    // We rotate negative because the wheel moves clockwise relative to the top pointer
    wheelInner.style.transform = `rotate(-${currentRotation}deg)`;
    
    // 3. Animate Ball (spins opposite direction, faster initially)
    const ball = document.getElementById('wheel-ball');
    if (ball) {
        ball.classList.add('spinning');
        // Ball starts spinning in opposite direction and slows down
        ball.style.animation = 'ball-spin 5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards';
    }

    // 4. Resolve After Animation (5s)
    setTimeout(() => {
        if (ball) {
            ball.classList.remove('spinning');
            ball.style.animation = '';
        }
        resolveSpin(winningNumber);
    }, 5000);
}

function resolveSpin(winNum) {
    const winColor = winNum === 0 ? 'green' : (RED_NUMBERS.includes(winNum) ? 'red' : 'black');
    
    // Update Display
    winningNumEl.textContent = winNum;
    winningColorEl.textContent = winColor;
    winningColorEl.style.color = winColor === 'green' ? '#27ae60' : (winColor === 'red' ? '#e74c3c' : '#ffffff');

    // Highlight winning number on table
    const winCell = document.querySelector(`.bet-cell[data-bet-type="number"][data-bet-value="${winNum}"]`);
    if (winCell) winCell.classList.add('winning-highlight');

    // Evaluate Bets
    let totalWin = 0;
    currentBets.forEach(bet => {
        if (checkBetWon(bet, winNum, winColor)) {
            const payoutMultiplier = PAYOUTS[bet.type];
            // payout including original bet: (amount * multiplier) + amount
            totalWin += (bet.amount * payoutMultiplier) + bet.amount;
        }
    });

    balance += totalWin;
    updateHistory(winNum, winColor);
    
    // Finalize round
    currentBets = [];
    // We don't remove chips immediately so player can see what happened
    // They will be cleared by the next bet or manual clear
    
    isSpinning = false;
    spinBtn.disabled = false;
    clearBtn.disabled = false;
    
    updateUI();
    
    if (totalWin > 0) {
        // Show confetti and play sounds (yay sound plays with confetti automatically)
        createConfetti();
        playWinSound();
        
        // Show alert after confetti ends, then remove confetti when dismissed
        setTimeout(() => {
            alert(`You won ${totalWin} chips!`);
            removeConfetti();
        }, CONFETTI_DURATION * 1000);
    } else {
        // Player lost - play sad trombone
        setTimeout(() => {
            playSadTrombone();
        }, 200);
    }
}

function checkBetWon(bet, winNum, winColor) {
    const val = bet.value;

    switch (bet.type) {
        case 'number':
            return parseInt(val) === winNum;
        case 'color':
            return val === winColor;
        case 'parity':
            if (winNum === 0) return false;
            return (winNum % 2 === 0 && val === 'even') || (winNum % 2 !== 0 && val === 'odd');
        case 'range':
            if (winNum === 0) return false;
            return (winNum <= 18 && val === 'low') || (winNum >= 19 && val === 'high');
        case 'dozen':
            if (winNum === 0) return false;
            const dozen = Math.ceil(winNum / 12);
            return parseInt(val) === dozen;
        case 'column':
            if (winNum === 0) return false;
            const column = winNum % 3 === 0 ? 3 : winNum % 3;
            return parseInt(val) === column;
        default:
            return false;
    }
}

function updateHistory(num, color) {
    history.unshift({ num, color });
    if (history.length > 10) history.pop();

    historyList.innerHTML = '';
    history.forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.style.backgroundColor = item.color === 'red' ? '#e74c3c' : (item.color === 'black' ? '#2c3e50' : '#27ae60');
        el.textContent = item.num;
        historyList.appendChild(el);
    });
}

function updateUI() {
    balanceEl.textContent = balance;
    const totalBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
    betAmountEl.textContent = totalBet;
    updateProbabilityPanel();
}

// --- Probability Panel ---
const TOTAL_POCKETS = 37; // European roulette (0-36)

const BET_COVERAGE = {
    'number': 1,      // Single number
    'color': 18,      // Red or Black (18 numbers each)
    'parity': 18,     // Even or Odd (18 numbers each)
    'range': 18,      // 1-18 or 19-36
    'dozen': 12,      // 1st, 2nd, or 3rd 12
    'column': 12      // Column bets
};

function getBetDisplayName(type, value) {
    switch (type) {
        case 'number': return `#${value}`;
        case 'color': return value.charAt(0).toUpperCase() + value.slice(1);
        case 'parity': return value.charAt(0).toUpperCase() + value.slice(1);
        case 'range': return value === 'low' ? '1-18' : '19-36';
        case 'dozen': return `${value}${value === '1' ? 'st' : value === '2' ? 'nd' : 'rd'} Dozen`;
        case 'column': return `Column ${value}`;
        default: return value;
    }
}

function updateProbabilityPanel() {
    const content = document.getElementById('probability-content');
    const overallChance = document.getElementById('overall-chance');
    const expectedValue = document.getElementById('expected-value');
    
    if (!content) return;
    
    // Get all bets currently visible on the board (chips on cells)
    const boardBets = [];
    document.querySelectorAll('.bet-cell .chip').forEach(chip => {
        const cell = chip.parentElement;
        const type = cell.dataset.betType;
        const value = cell.dataset.betValue;
        const amount = parseInt(chip.textContent) || 0;
        if (amount > 0) {
            boardBets.push({ type, value, amount, cell });
        }
    });
    
    if (boardBets.length === 0) {
        content.innerHTML = '<p class="no-bets">Place bets to see win probabilities</p>';
        overallChance.textContent = '0%';
        expectedValue.textContent = '--';
        expectedValue.className = '';
        return;
    }
    
    // Calculate coverage (unique winning numbers across all bets)
    let coveredNumbers = new Set();
    let totalBetAmount = 0;
    let totalExpectedReturn = 0;
    
    content.innerHTML = '';
    
    // Helper function to get the actual numbers covered by each bet
    function getNumbersCoveredByBet(bet) {
        const numbers = new Set();
        const val = bet.value;
        
        switch (bet.type) {
            case 'number':
                numbers.add(parseInt(val));
                break;
            case 'color':
                if (val === 'red') {
                    RED_NUMBERS.forEach(n => numbers.add(n));
                } else {
                    for (let i = 1; i <= 36; i++) {
                        if (!RED_NUMBERS.includes(i)) numbers.add(i);
                    }
                }
                break;
            case 'parity':
                for (let i = 1; i <= 36; i++) {
                    if ((val === 'even' && i % 2 === 0) || (val === 'odd' && i % 2 !== 0)) {
                        numbers.add(i);
                    }
                }
                break;
            case 'range':
                if (val === 'low') {
                    for (let i = 1; i <= 18; i++) numbers.add(i);
                } else {
                    for (let i = 19; i <= 36; i++) numbers.add(i);
                }
                break;
            case 'dozen':
                const dozenStart = (parseInt(val) - 1) * 12 + 1;
                for (let i = dozenStart; i < dozenStart + 12; i++) numbers.add(i);
                break;
            case 'column':
                const col = parseInt(val);
                for (let i = col; i <= 36; i += 3) numbers.add(i);
                break;
        }
        return numbers;
    }
    
    boardBets.forEach(bet => {
        const coverage = BET_COVERAGE[bet.type] || 1;
        const probability = (coverage / TOTAL_POCKETS) * 100;
        const payout = PAYOUTS[bet.type];
        const potentialWin = bet.amount * payout + bet.amount;
        
        // Calculate expected value for this bet
        const winProb = coverage / TOTAL_POCKETS;
        const ev = (winProb * (bet.amount * payout)) - ((1 - winProb) * bet.amount);
        totalExpectedReturn += ev;
        totalBetAmount += bet.amount;
        
        // Add the actual winning numbers to our coverage set
        const betNumbers = getNumbersCoveredByBet(bet);
        betNumbers.forEach(n => coveredNumbers.add(n));
        
        const item = document.createElement('div');
        item.className = 'prob-item';
        item.innerHTML = `
            <div class="bet-type">${bet.type}</div>
            <div class="bet-value">${getBetDisplayName(bet.type, bet.value)}</div>
            <div class="bet-stats">
                <span class="win-chance">${probability.toFixed(1)}% chance</span>
                <span class="payout">${payout}:1</span>
            </div>
        `;
        content.appendChild(item);
    });
    
    // Calculate overall win chance based on unique numbers covered
    // This correctly accounts for overlapping bets
    const totalCoveredNumbers = coveredNumbers.size;
    const overallProb = (totalCoveredNumbers / TOTAL_POCKETS) * 100;
    overallChance.textContent = `${overallProb.toFixed(1)}%`;
    
    // Display expected value
    const evPercent = (totalExpectedReturn / totalBetAmount) * 100;
    expectedValue.textContent = `${evPercent >= 0 ? '+' : ''}${evPercent.toFixed(2)}%`;
    expectedValue.className = evPercent >= 0 ? 'positive' : 'negative';
}

// Start
init();
