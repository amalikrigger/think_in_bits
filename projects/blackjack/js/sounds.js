class SoundManager {
    constructor() {
        this.sounds = {
            deal: new Audio('assets/sounds/card-deal.mp3'),
            flip: new Audio('assets/sounds/card-flip.mp3'),
            chip: new Audio('assets/sounds/chip.mp3'),
            win: new Audio('assets/sounds/win.mp3'),
            lose: new Audio('assets/sounds/lose.mp3'),
            click: new Audio('assets/sounds/click.mp3')
        };

        // Track which sounds failed to load so we use synth fallback
        this._synthFallback = {};
        this._audioCtx = null;
        
        // Preload sounds
        Object.entries(this.sounds).forEach(([name, sound]) => {
            sound.load();
            sound.volume = 0.5;
            sound.onerror = () => {
                this._synthFallback[name] = true;
            };
        });

        this.enabled = true;
        this.musicEnabled = false;
        this.musicTracks = [
            'hitslab-lounge-jazz-elevator-music-324902.mp3',
            'lo-fi-music-loop-sentimental-jazzy-love-473154.mp3',
            'no-sleep-hiphop-music-473847.mp3'
        ];
        this.currentTrackIndex = 0;
        this.musicAudio = new Audio();
        this.musicAudio.loop = true;
        this.musicAudio.volume = 0.3;
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        // Use synth fallback if file failed to load
        if (this._synthFallback[soundName]) {
            this._playSynth(soundName);
            return;
        }

        const sound = this.sounds[soundName];
        sound.currentTime = 0;
        sound.play().catch(() => {
            // If play fails at runtime, try synth
            this._synthFallback[soundName] = true;
            this._playSynth(soundName);
        });
    }

    _getAudioCtx() {
        if (!this._audioCtx) {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this._audioCtx;
    }

    _playSynth(name) {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            const gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.3, now);

            const synthMap = {
                deal:  { freq: 600, type: 'sine', dur: 0.08 },
                flip:  { freq: 800, type: 'sine', dur: 0.1 },
                chip:  { freq: 1200, type: 'triangle', dur: 0.06 },
                click: { freq: 1000, type: 'square', dur: 0.04 },
                win:   { freq: 523, type: 'sine', dur: 0.3, sweep: 784 },
                lose:  { freq: 400, type: 'sawtooth', dur: 0.3, sweep: 200 }
            };

            const cfg = synthMap[name] || synthMap.click;
            const osc = ctx.createOscillator();
            osc.type = cfg.type;
            osc.frequency.setValueAtTime(cfg.freq, now);
            if (cfg.sweep) osc.frequency.linearRampToValueAtTime(cfg.sweep, now + cfg.dur);
            osc.connect(gain);
            gain.gain.linearRampToValueAtTime(0, now + cfg.dur);
            osc.start(now);
            osc.stop(now + cfg.dur);
        } catch (e) {
            // Silently ignore if Web Audio not available
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Music methods
    playMusic() {
        if (!this.musicEnabled) return;
        
        // If no src is set or we are changing tracks, set the source
        const trackName = this.musicTracks[this.currentTrackIndex];
        const trackPath = `assets/music/${trackName}`;
        
        // Check if we need to load a new source
        if (!this.musicAudio.src || !this.musicAudio.src.includes(encodeURI(trackName))) {
             this.musicAudio.src = trackPath;
        }
        
        this.musicAudio.play().catch(e => console.log('Music play failed:', e));
    }

    pauseMusic() {
        this.musicAudio.pause();
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.playMusic();
        } else {
            this.pauseMusic();
        }
        return this.musicEnabled;
    }

    setTrack(index) {
        if (index >= 0 && index < this.musicTracks.length) {
            this.currentTrackIndex = index;
            if (this.musicEnabled) {
                this.playMusic();
            }
        }
    }

    getTrackName(index) {
        return this.musicTracks[index];
    }
}

// Global instance
window.soundManager = new SoundManager();
