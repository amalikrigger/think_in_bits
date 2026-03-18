/**
 * Roulette Academy - Full Betting System with Bankroll Management
 */

// --- CONFIGURATION ---
const WHEEL_DATA = {
    european: {
        numbers: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
        slots: 37
    },
    american: {
        numbers: [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2],
        slots: 38
    }
};

const BET_TYPES = [
    { id: 'straight', name: 'Straight Up (1 number)', coverage: 1, payout: 35, requiresNumber: true },
    { id: 'split', name: 'Split (2 numbers)', coverage: 2, payout: 17, requiresNumber: true },
    { id: 'street', name: 'Street (3 numbers)', coverage: 3, payout: 11, requiresNumber: true },
    { id: 'corner', name: 'Corner (4 numbers)', coverage: 4, payout: 8, requiresNumber: true },
    { id: 'sixline', name: 'Six Line (6 numbers)', coverage: 6, payout: 5, requiresNumber: true },
    { id: 'basket', name: 'Basket (0,1,2,3)', coverage: 5, payout: 6, variant: 'american', requiresNumber: false },
    { id: 'dozen', name: 'Dozen (1-12, 13-24, 25-36)', coverage: 12, payout: 2, requiresNumber: true },
    { id: 'column', name: 'Column', coverage: 12, payout: 2, requiresNumber: true },
    { id: 'redblack', name: 'Red / Black', coverage: 18, payout: 1, requiresNumber: true },
    { id: 'evenodd', name: 'Even / Odd', coverage: 18, payout: 1, requiresNumber: true },
    { id: 'highlow', name: 'High (19-36) / Low (1-18)', coverage: 18, payout: 1, requiresNumber: true }
];

const MUSIC_TRACKS = [
    { name: 'Dark Mystery', path: 'music/dark-mystery-trailer-taking-our-time-131566.mp3' },
    { name: 'Lounge Jazz', path: 'music/hitslab-lounge-jazz-elevator-music-324902.mp3' },
    { name: 'No-Sleep Hip Hop', path: 'music/no-sleep-hiphop-music-473847.mp3' },
    { name: 'Brazilian Phonk', path: 'music/screwedqueen-brazilian-phonk-468913.mp3' },
    { name: 'Brazil Phonk 2026', path: 'music/shimafm-2026-in-brazil-phonk-477338.mp3' },
    { name: 'Anime Theme', path: 'music/superpuyofans1234-anime-239882.mp3' },
    { name: 'Upbeat', path: 'music/upbeat-music-upbeat-462284.mp3' }
];

// --- STATE MANAGEMENT ---
let currentVariant = 'european';
let bankroll = 1000;
let totalWagered = 0;
let sessionStats = {
    spins: 0,
    wins: 0,
    losses: 0,
    history: [],
    fullHistory: []
};
let placedBets = []; // Array of { type, number, amount, payout }
let currentBetTemp = { type: null, number: null, amount: 0 };
let chipValue = 1;
let isSpinning = false;
let currentWheelRotation = 0;
let currentBallRotation = 0;
let isMusicEnabled = false;
let isSfxEnabled = true;
let currentAudio = null;

// --- SOUND EFFECTS ENGINE ---
const SoundEffects = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, type, duration, vol = 0.1, ramp = true) {
        if (!isSfxEnabled) return;
        this.init(); // Ensure context exists and is running
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        if (ramp) {
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        } else {
            gain.gain.setValueAtTime(0, this.ctx.currentTime + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playChip() {
        // Crisp plastic click
        this.playTone(2500, 'sine', 0.05, 0.05);
        setTimeout(() => this.playTone(3000, 'sine', 0.03, 0.03), 20);
    },

    playSpinStart() {
        // Rising energetic sound
        if (!isSfxEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    },

    playTick() {
        // Mechanical wheel tick
        this.playTone(800, 'triangle', 0.02, 0.03);
    },

    playBallDrop() {
        this.playTone(2000, 'sine', 0.1, 0.05);
    },

    playWin() {
        // Happy major arpeggio
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.1), i * 100);
        });
    },

    playLose() {
        // Sad descending tones
        [392.00, 369.99, 349.23].forEach((freq, i) => {
             setTimeout(() => this.playTone(freq, 'triangle', 0.5, 0.15, false), i * 250);
        });
    },
    
    playUI() {
        this.playTone(1500, 'sine', 0.05, 0.02);
    }
};

// --- DOM ELEMENTS ---
const elements = {
    btnEuro: document.getElementById('btn-european'),
    btnAmer: document.getElementById('btn-american'),
    betTable: document.querySelector('#bet-table tbody'),
    balance: document.getElementById('balance'),
    earnings: document.getElementById('earnings'),
    totalWageredEl: document.getElementById('total-wagered'),
    resetBankroll: document.getElementById('reset-bankroll'),
    
    // Betting UI
    chipBtns: document.querySelectorAll('.chip-btn'),
    allInBtn: document.getElementById('btn-all-in'),
    betTypeSelect: document.getElementById('bet-type'),
    numberSelector: document.getElementById('number-selector'),
    betNumber: document.getElementById('bet-number'),
    betAmount: document.getElementById('bet-amount'),
    potentialWin: document.getElementById('potential-win'),
    totalReturn: document.getElementById('total-return'),
    btnAddBet: document.getElementById('btn-add-bet'),
    btnClearBet: document.getElementById('btn-clear-bet'),
    placedBetsList: document.getElementById('placed-bets-list'),
    btnSpinWithBets: document.getElementById('btn-spin-with-bets'),
    
    // Audio Controls
    musicToggle: document.getElementById('music-toggle'),
    sfxToggle: document.getElementById('sfx-toggle'),
    musicSelect: document.getElementById('music-select'),
    
    // Fullscreen
    btnFullscreen: document.getElementById('btn-fullscreen'),
    btnExitFullscreen: document.getElementById('btn-exit-fullscreen'),

    // Probability Lab
    calcBetType: document.getElementById('calc-bet-type'),
    calcSingleChance: document.getElementById('calc-single-chance'),
    calcSpinsInput: document.getElementById('calc-spins-input'),
    calcSpinsVal: document.getElementById('calc-spins-val'),
    calcProbWin: document.getElementById('calc-prob-win'),
    calcProbLose: document.getElementById('calc-prob-lose'),
    // Combined probability elements
    calcAType: document.getElementById('calc-a-type'),
    calcASelection: document.getElementById('calc-a-selection'),
    calcBType: document.getElementById('calc-b-type'),
    calcBSelection: document.getElementById('calc-b-selection'),
    calcPA: document.getElementById('calc-pA'),
    calcPB: document.getElementById('calc-pB'),
    calcPAandB: document.getElementById('calc-pAandB'),
    calcProduct: document.getElementById('calc-product'),
    calcPAorB: document.getElementById('calc-pAorB'),
    calcIndependence: document.getElementById('calc-independence'),

    // Wheel & Display
    wheel: document.getElementById('wheel'),
    ball: document.getElementById('ball'),
    resetBtn: document.getElementById('reset-button'),
    
    // Stats
    statSpins: document.getElementById('stat-spins'),
    statWinLoss: document.getElementById('stat-winloss'),
    statLast: document.getElementById('stat-last'),
    statWinRate: document.getElementById('stat-win-rate'),
    statRoi: document.getElementById('stat-roi'),
    statProgress: document.getElementById('stat-progress'),
    historyLog: document.getElementById('history-log')
};

// --- INITIALIZATION ---
function init() {
    renderWheel();
    populateBetTypes();
    updateMathTable();
    attachEventListeners();
    updateBankrollDisplay();
    initAudio();
    initProbabilityCalculator();
    initCollapsibles();
    initLessons();
}

function initAudio() {
    elements.musicSelect.innerHTML = MUSIC_TRACKS.map((track, index) =>
        `<option value="${index}">${track.name}</option>`
    ).join('');

    elements.musicToggle.addEventListener('change', (e) => {
        isMusicEnabled = e.target.checked;
        if (isMusicEnabled) {
            SoundEffects.init();
            playBackgroundMusic(); // Start playing immediately
        } else {
            stopBackgroundMusic();
        }
    });
    
    elements.musicSelect.addEventListener('change', () => {
        if (isMusicEnabled) {
            playBackgroundMusic(); // Switch track
        }
    });

    if (elements.sfxToggle) {
        elements.sfxToggle.addEventListener('change', (e) => {
            isSfxEnabled = e.target.checked;
            if (isSfxEnabled) SoundEffects.init();
        });
    }
}

function playBackgroundMusic() {
    if (!isMusicEnabled) return;

    if (SoundEffects.ctx && SoundEffects.ctx.state === 'suspended') {
        SoundEffects.ctx.resume();
    }

    const trackIndex = elements.musicSelect.value;
    const track = MUSIC_TRACKS[trackIndex] || MUSIC_TRACKS[0];

    // If already playing this track, do nothing
    if (currentAudio && !currentAudio.paused && currentAudio.src.includes(track.path)) {
        return; 
    }

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    currentAudio = new Audio(track.path);
    currentAudio.loop = true;
    currentAudio.volume = 0.3; // Lower volume for background
    
    const playPromise = currentAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("Auto-play prevented:", error);
        });
    }
}

function stopBackgroundMusic() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
}

// --- PROBABILITY LAB ---

function initProbabilityCalculator() {
    // Populate dropdown
    elements.calcBetType.innerHTML = BET_TYPES
        .filter(bet => !bet.variant || bet.variant === currentVariant)
        .map(bet => `<option value="${bet.id}">${bet.name}</option>`)
        .join('');
    
    // Populate combined-calculator dropdowns
    elements.calcAType.innerHTML = elements.calcBType.innerHTML = BET_TYPES
        .filter(bet => !bet.variant || bet.variant === currentVariant)
        .map(bet => `<option value="${bet.id}">${bet.name}</option>`)
        .join('');

    // Populate selection containers for A and B
    populateCalcSelections('A');
    populateCalcSelections('B');

    // Set listeners
    elements.calcBetType.addEventListener('change', updateProbabilityCalc);
    elements.calcSpinsInput.addEventListener('input', (e) => {
        elements.calcSpinsVal.textContent = e.target.value;
        updateProbabilityCalc();
    });

    // Listeners for combined calculator
    elements.calcAType.addEventListener('change', () => { populateCalcSelections('A'); updateCombinedProbabilityCalc(); });
    elements.calcBType.addEventListener('change', () => { populateCalcSelections('B'); updateCombinedProbabilityCalc(); });

    // Initial combined calc
    elements.calcAType.addEventListener('input', updateCombinedProbabilityCalc);
    elements.calcBType.addEventListener('input', updateCombinedProbabilityCalc);

    // Initial calc
    updateProbabilityCalc();

    // Run combined calculator initially
    updateCombinedProbabilityCalc();
}

// Return array of covered numbers (strings) for a given bet type + selection
function numbersForBet(betId, selection) {
    const data = WHEEL_DATA[currentVariant];
    const allNums = data.numbers.map(n => String(n));

    switch(betId) {
        case 'straight':
            return selection ? [String(selection)] : allNums.slice();
        case 'split':
        case 'street':
        case 'corner':
        case 'sixline':
            return selection.split('-').map(s => String(s.trim()));
        case 'basket':
            // American basket includes '00'
            return currentVariant === 'american' ? ['0','1','2','3','00'] : ['0','1','2','3'];
        case 'dozen':
            if (selection.includes('First')) return allNums.filter(n => { const v = parseInt(n); return v >=1 && v <=12; });
            if (selection.includes('Second')) return allNums.filter(n => { const v = parseInt(n); return v >=13 && v <=24; });
            if (selection.includes('Third')) return allNums.filter(n => { const v = parseInt(n); return v >=25 && v <=36; });
            break;
        case 'column':
            if (selection.includes('Column 1')) return allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v % 3 === 1; });
            if (selection.includes('Column 2')) return allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v % 3 === 2; });
            if (selection.includes('Column 3')) return allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v % 3 === 0; });
            break;
        case 'redblack':
            const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].map(n=>String(n));
            return selection === 'Red' ? reds : allNums.filter(n => n !== '0' && n !== '00' && !reds.includes(n));
        case 'evenodd':
            return selection === 'Even' ? allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v % 2 === 0; }) : allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v % 2 === 1; });
        case 'highlow':
            return selection.includes('High') ? allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v >=19 && v <=36; }) : allNums.filter(n => { const v = parseInt(n); return !isNaN(v) && v >=1 && v <=18; });
    }

    return [];
}

function populateCalcSelections(which) {
    const typeEl = which === 'A' ? elements.calcAType : elements.calcBType;
    const container = which === 'A' ? elements.calcASelection : elements.calcBSelection;
    const betId = typeEl.value;
    container.innerHTML = '';

    const bet = BET_TYPES.find(b => b.id === betId);
    if (!bet) return;

    if (!bet.requiresNumber) {
        const span = document.createElement('div');
        span.textContent = bet.name;
        container.appendChild(span);
        return;
    }

    // For selections, build small buttons similar to numberSelector but simplified
    const options = [];
    switch(betId) {
        case 'straight':
            WHEEL_DATA[currentVariant].numbers.forEach(n => options.push(String(n)));
            break;
        case 'split':
            options.push('1-2','2-3','4-5','5-6','7-8','8-9','10-11','11-12','13-14','14-15','16-17','17-18');
            break;
        case 'street':
            options.push('1-2-3','4-5-6','7-8-9','10-11-12','13-14-15','16-17-18','19-20-21','22-23-24','25-26-27','28-29-30','31-32-33','34-35-36');
            break;
        case 'corner':
            options.push('1-2-4-5','2-3-5-6','4-5-7-8','5-6-8-9','7-8-10-11','8-9-11-12','10-11-13-14','11-12-14-15','13-14-16-17','14-15-17-18','16-17-19-20','17-18-20-21','19-20-22-23','20-21-23-24','22-23-25-26','23-24-26-27','25-26-28-29','26-27-29-30','28-29-31-32','29-30-32-33','31-32-34-35','32-33-35-36');
            break;
        case 'sixline':
            options.push('1-2-3-4-5-6','4-5-6-7-8-9','7-8-9-10-11-12','10-11-12-13-14-15','13-14-15-16-17-18','16-17-18-19-20-21','19-20-21-22-23-24','22-23-24-25-26-27','25-26-27-28-29-30','28-29-30-31-32-33','31-32-33-34-35-36');
            break;
        case 'dozen':
            options.push('1-12 (First Dozen)','13-24 (Second Dozen)','25-36 (Third Dozen)');
            break;
        case 'column':
            options.push('Column 1 (1,4,7...34)','Column 2 (2,5,8...35)','Column 3 (3,6,9...36)');
            break;
        case 'redblack':
            options.push('Red','Black');
            break;
        case 'evenodd':
            options.push('Even','Odd');
            break;
        case 'highlow':
            options.push('High (19-36)','Low (1-18)');
            break;
    }

    options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'number-btn';
        btn.textContent = opt;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            SoundEffects.playUI();
            
            // Remove 'selected' class from siblings
            Array.from(container.children).forEach(child => child.classList.remove('selected'));
            
            // Select this button
            btn.classList.add('selected');
            
            // Update data attribute
            container.dataset.selection = opt;
            
            // Trigger calculation
            updateCombinedProbabilityCalc();
        });
        container.appendChild(btn);

        // default-select first option so UI is immediately interactive
        if (idx === 0) {
            btn.classList.add('selected');
            container.dataset.selection = opt;
        }
    });

    // ensure an initial combined calc after populating
    updateCombinedProbabilityCalc();
}

// Collapsible panels init
function initCollapsibles() {
    document.querySelectorAll('[data-collapsible="true"]').forEach(card => {
        const btn = card.querySelector('.collapse-btn');
        const body = card.querySelector('.card-body');
        if (!btn || !body) return;

        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            if (expanded) {
                body.style.display = 'none';
                btn.textContent = '+';
                btn.setAttribute('aria-expanded', 'false');
            } else {
                body.style.display = '';
                btn.textContent = '−';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function updateCombinedProbabilityCalc() {
    const aType = elements.calcAType.value;
    const bType = elements.calcBType.value;
    const aSel = elements.calcASelection.dataset.selection || (elements.calcASelection.textContent || '').trim();
    const bSel = elements.calcBSelection.dataset.selection || (elements.calcBSelection.textContent || '').trim();

    const slots = WHEEL_DATA[currentVariant].slots;

    const numsA = numbersForBet(aType, aSel);
    const numsB = numbersForBet(bType, bSel);

    const setA = new Set(numsA);
    const setB = new Set(numsB);

    const inter = numsA.filter(n => setB.has(n));

    const pA = numsA.length / slots;
    const pB = numsB.length / slots;
    const pAandB = inter.length / slots;
    const product = pA * pB;
    const pAorB = pA + pB - pAandB;

    const fmt = (v) => `${(v * 100).toFixed(2)}%`;

    elements.calcPA.textContent = fmt(pA);
    elements.calcPB.textContent = fmt(pB);
    elements.calcPAandB.textContent = fmt(pAandB);
    elements.calcProduct.textContent = fmt(product);
    elements.calcPAorB.textContent = fmt(pAorB);

    const independent = Math.abs(pAandB - product) < 1e-9 || Math.abs((pAandB - product) / Math.max(1e-9, pAandB)) < 1e-6;
    elements.calcIndependence.textContent = independent ? 'Yes' : 'No';
}

function updateProbabilityCalc() {
    const betTypeId = elements.calcBetType.value;
    const spins = parseInt(elements.calcSpinsInput.value);
    const betType = BET_TYPES.find(b => b.id === betTypeId);
    
    if (!betType) return;

    const slots = WHEEL_DATA[currentVariant].slots;
    const pWin = betType.coverage / slots;
    const pLose = 1 - pWin;

    // Single spin chance
    elements.calcSingleChance.textContent = `${(pWin * 100).toFixed(2)}%`;

    // Probability of losing ALL spins
    // P(lose all) = (pLose)^spins
    const probLoseAll = Math.pow(pLose, spins);
    
    // Probability of winning at least once
    // P(win >= 1) = 1 - P(lose all)
    const probWinAtLeastOnce = 1 - probLoseAll;

    elements.calcProbWin.textContent = `${(probWinAtLeastOnce * 100).toFixed(2)}%`;
    elements.calcProbLose.textContent = `${(probLoseAll * 100).toFixed(2)}%`;
}

// --- CORE BET LOGIC ---

function populateBetTypes() {
    elements.betTypeSelect.innerHTML = BET_TYPES
        .filter(bet => !bet.variant || bet.variant === currentVariant)
        .map(bet => `<option value="${bet.id}">${bet.name}</option>`)
        .join('');
    
    updateNumberSelector();
}

function updateNumberSelector() {
    const betTypeId = elements.betTypeSelect.value;
    const betType = BET_TYPES.find(b => b.id === betTypeId);
    
    elements.numberSelector.innerHTML = '';
    elements.numberSelector.style.display = betType?.requiresNumber ? 'grid' : 'none';
    
    if (!betType?.requiresNumber) {
        elements.betNumber.value = betType.name;
        return;
    }

    const data = WHEEL_DATA[currentVariant];
    let options = [];

    switch(betTypeId) {
        case 'straight':
            options = data.numbers.map(n => n);
            break;
        case 'split':
            options = ['1-2', '2-3', '4-5', '5-6', '7-8', '8-9', '10-11', '11-12', '13-14', '14-15', '16-17', '17-18'];
            break;
        case 'street':
            options = ['1-2-3', '4-5-6', '7-8-9', '10-11-12', '13-14-15', '16-17-18', '19-20-21', '22-23-24', '25-26-27', '28-29-30', '31-32-33', '34-35-36'];
            break;
        case 'corner':
            options = ['1-2-4-5', '2-3-5-6', '4-5-7-8', '5-6-8-9', '7-8-10-11', '8-9-11-12', '10-11-13-14', '11-12-14-15', '13-14-16-17', '14-15-17-18', '16-17-19-20', '17-18-20-21', '19-20-22-23', '20-21-23-24', '22-23-25-26', '23-24-26-27', '25-26-28-29', '26-27-29-30', '28-29-31-32', '29-30-32-33', '31-32-34-35', '32-33-35-36'];
            break;
        case 'sixline':
            options = ['1-2-3-4-5-6', '4-5-6-7-8-9', '7-8-9-10-11-12', '10-11-12-13-14-15', '13-14-15-16-17-18', '16-17-18-19-20-21', '19-20-21-22-23-24', '22-23-24-25-26-27', '25-26-27-28-29-30', '28-29-30-31-32-33', '31-32-33-34-35-36'];
            break;
        case 'dozen':
            options = ['1-12 (First Dozen)', '13-24 (Second Dozen)', '25-36 (Third Dozen)'];
            break;
        case 'column':
            options = ['Column 1 (1,4,7...34)', 'Column 2 (2,5,8...35)', 'Column 3 (3,6,9...36)'];
            break;
        case 'redblack':
            options = ['Red', 'Black'];
            break;
        case 'evenodd':
            options = ['Even', 'Odd'];
            break;
        case 'highlow':
            options = ['High (19-36)', 'Low (1-18)'];
            break;
    }

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => selectNumber(opt, btn));
        elements.numberSelector.appendChild(btn);
    });

    if (elements.numberSelector.children.length > 6) {
        elements.numberSelector.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
}

function selectNumber(num, btnEl) {
    SoundEffects.playUI();
    document.querySelectorAll('.number-btn.selected').forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');
    currentBetTemp.number = num;
    elements.betNumber.value = num;
    updateBetPreview();
}

function updateBetPreview() {
    const betTypeId = elements.betTypeSelect.value;
    const betType = BET_TYPES.find(b => b.id === betTypeId);
    
    if (!betType) return;

    currentBetTemp.type = betTypeId;
    currentBetTemp.amount = chipValue;
    
    const potential = chipValue * betType.payout;
    const total = chipValue + potential;

    elements.betAmount.textContent = `$${chipValue}`;
    elements.potentialWin.textContent = `$${potential}`;
    elements.totalReturn.textContent = `$${total}`;
}

function addBet() {
    if (!currentBetTemp.type) {
        alert('Please select a bet type');
        return;
    }

    const betType = BET_TYPES.find(b => b.id === currentBetTemp.type);
    if (betType.requiresNumber && currentBetTemp.number === null) {
        alert('Please select a number/option');
        return;
    }

    if (bankroll < chipValue) {
        alert('Insufficient funds');
        return;
    }

    SoundEffects.playChip();

    const payout = betType.payout;
    placedBets.push({
        type: currentBetTemp.type,
        typeName: betType.name,
        number: currentBetTemp.number,
        amount: currentBetTemp.amount,
        payout: payout,
        isNew: true
    });

    // Deduct from bankroll immediately
    bankroll -= currentBetTemp.amount;
    totalWagered += currentBetTemp.amount;
    
    updateBankrollDisplay();
    updatePlacedBetsList();
    clearBetTemp();
}

function getLockedFunds() {
    return placedBets.reduce((sum, bet) => sum + bet.amount, 0);
}

function removeBet(index) {
    const bet = placedBets[index];
    
    // Only refund if the bet hasn't been "consumed" by a spin yet
    // Persistent bets have already had their stakes returned to bankroll (if won)
    // or lost (if lost).
    if (bet.isNew) {
        bankroll += bet.amount;
        totalWagered -= bet.amount;
    }
    
    placedBets.splice(index, 1);
    
    updateBankrollDisplay();
    updatePlacedBetsList();
}

function clearBetTemp() {
    currentBetTemp = { type: null, number: null, amount: 0 };
    elements.betNumber.value = '';
    elements.betAmount.textContent = '$0';
    elements.potentialWin.textContent = '$0';
    elements.totalReturn.textContent = '$0';
    document.querySelectorAll('.number-btn.selected').forEach(b => b.classList.remove('selected'));
}

function updatePlacedBetsList() {
    if (placedBets.length === 0) {
        elements.placedBetsList.innerHTML = '<div class="empty-bets">No bets placed</div>';
        elements.btnSpinWithBets.disabled = true;
        updateBetAnalysis();
        return;
    }

    elements.placedBetsList.innerHTML = placedBets.map((bet, idx) => {
        let betHistProb = 0;
        if (sessionStats.fullHistory.length > 0) {
            const betNums = numbersForBet(bet.type, bet.number);
            const hits = sessionStats.fullHistory.filter(h => betNums.includes(h)).length;
            betHistProb = (hits / sessionStats.fullHistory.length) * 100;
        }

        return `
        <div class="bet-item">
            <div class="bet-item-info">
                <div class="bet-item-type">
                    ${bet.typeName} 
                    <span style="font-size:0.85em; color:var(--accent-color); margin-left:0.5rem; opacity:0.8;">
                        (Hist: ${betHistProb.toFixed(1)}%)
                    </span>
                </div>
                <div class="bet-item-amount">${bet.number} • $${bet.amount} @ ${bet.payout}:1 = $${bet.amount * (bet.payout + 1)} potential</div>
            </div>
            <button class="bet-item-remove" onclick="removeBet(${idx})">Remove</button>
        </div>
    `}).join('');

    elements.btnSpinWithBets.disabled = false;
    updateBetAnalysis();
}

function updateBetAnalysis() {
    const totalWager = placedBets.reduce((sum, bet) => sum + bet.amount, 0);
    const slots = WHEEL_DATA[currentVariant].slots;
    const coveredNumbers = new Set();
    let totalEV = 0;

    placedBets.forEach(bet => {
        const nums = numbersForBet(bet.type, bet.number);
        nums.forEach(n => coveredNumbers.add(n));
        
        const betCoverage = nums.length;
        const winChance = betCoverage / slots;
        // EV calculation: Wager * ((Payout + 1) * WinChance - 1)
        const ev = bet.amount * ((bet.payout + 1) * winChance - 1);
        totalEV += ev;
    });

    const coverageCount = coveredNumbers.size;
    const winProb = coverageCount / slots;

    let histProb = 0;
    if (sessionStats.fullHistory.length > 0) {
        const histWins = sessionStats.fullHistory.filter(n => coveredNumbers.has(n)).length;
        histProb = histWins / sessionStats.fullHistory.length;
    }

    if (document.getElementById('analysis-coverage')) {
        document.getElementById('analysis-coverage').textContent = `${coverageCount} / ${slots}`;
        document.getElementById('analysis-probability').textContent = `${(winProb * 100).toFixed(2)}%`;
        
        const histEl = document.getElementById('analysis-history-prob');
        if (histEl) {
             histEl.textContent = `${(histProb * 100).toFixed(1)}%`;
        }

        const evEl = document.getElementById('analysis-ev');
        evEl.textContent = `$${totalEV.toFixed(2)}`;
        
        if (totalEV > 0.01) evEl.style.color = 'var(--success-color)';
        else if (totalEV < -0.01) evEl.style.color = 'var(--danger-color)';
        else evEl.style.color = 'var(--text-color)';
    }
}


// --- WHEEL & SPIN LOGIC ---

function renderWheel() {
    const data = WHEEL_DATA[currentVariant];
    const step = 360 / data.slots;
    
    let gradientParts = data.numbers.map((num, i) => {
        const color = getNumberColor(num);
        const start = i * step;
        const end = (i + 1) * step;
        return `${color} ${start}deg ${end}deg`;
    });

    elements.wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;

    elements.wheel.innerHTML = '';
    data.numbers.forEach((num, i) => {
        const numDiv = document.createElement('div');
        numDiv.className = 'wheel-number';
        numDiv.textContent = num;
        const angle = i * step + (step / 2);
        numDiv.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        elements.wheel.appendChild(numDiv);
    });
}

function playSpinMusic() {
    if (!isMusicEnabled) return;

    // Ensure AudioContext is ready if we are using Web Audio API elsewhere
    if (SoundEffects.ctx && SoundEffects.ctx.state === 'suspended') {
        SoundEffects.ctx.resume();
    }

    const trackIndex = elements.musicSelect.value;
    const track = MUSIC_TRACKS[trackIndex] || MUSIC_TRACKS[0];

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    console.log("Playing music:", track.path);
    currentAudio = new Audio(track.path);
    currentAudio.loop = true;
    currentAudio.volume = 0.5;
    
    currentAudio.play().catch(e => {
        console.error("Audio play failed:", e);
        // Sometimes reloading the element helps in some browsers?
    });
}

function stopSpinMusic() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
}

async function spin() {
    if (isSpinning || placedBets.length === 0) return;
    
    // Deduct stakes for persistent bets (those already on the table from previous rounds)
    const persistentStakes = placedBets.reduce((sum, bet) => bet.isNew ? sum : sum + bet.amount, 0);
    if (bankroll < persistentStakes) {
        alert("Insufficient funds to maintain current bets!");
        return;
    }

    if (persistentStakes > 0) {
        bankroll -= persistentStakes;
        totalWagered += persistentStakes;
        updateBankrollDisplay();
    }

    // Mark all bets as no longer new
    placedBets.forEach(bet => bet.isNew = false);

    try {
        isSpinning = true;
        elements.wheel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elements.btnSpinWithBets.disabled = true;
        
        // Ensure background music is playing if enabled (in case context was suspended)
        if (isMusicEnabled) playBackgroundMusic();
        
        SoundEffects.playSpinStart();

        const data = WHEEL_DATA[currentVariant];
        const winningIndex = Math.floor(Math.random() * data.slots);
        const winningNumber = data.numbers[winningIndex];
        
        const spinDuration = 5000;
        const wheelSpins = 6 + Math.floor(Math.random() * 4);
        const ballSpins = 8 + Math.floor(Math.random() * 4);
        const step = 360 / data.slots;
        const landingPositionOffset = Math.random() * 360;

        const wheelFinalRotation = (currentWheelRotation - (currentWheelRotation % 360)) 
            + (wheelSpins * 360) 
            - (winningIndex * step + step / 2) 
            + landingPositionOffset;
        
        const ballFinalRotation = (currentBallRotation - (currentBallRotation % 360)) 
            - (ballSpins * 360) 
            + landingPositionOffset;
        
        const startBallRotation = currentBallRotation;
        currentWheelRotation = wheelFinalRotation;
        currentBallRotation = ballFinalRotation;

        elements.wheel.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0, 0.1, 1)`;
        elements.wheel.style.transform = `rotate(${wheelFinalRotation}deg)`;

        animateBallSpiral(startBallRotation, ballFinalRotation, spinDuration);

        await new Promise(r => setTimeout(r, spinDuration));

        // Note: We do NOT stop music here anymore, it's background music
        processSpinResult(winningNumber);
    } catch (error) {
        console.error("Spin error:", error);
    } finally {
        isSpinning = false;
        updatePlacedBetsList();
    }
}

function animateBallSpiral(startRotation, finalRotation, duration) {
    const startTime = performance.now();
    const startRadius = -172;
    const endRadius = -145;
    
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    let lastTickRotation = startRotation;
    const tickSpacing = 360 / WHEEL_DATA[currentVariant].slots;

    function frame(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        
        const currentRadius = startRadius + (endRadius - startRadius) * Math.pow(t, 2);
        const currentRotation = startRotation + (finalRotation - startRotation) * easeOut(t);

        if (Math.abs(currentRotation - lastTickRotation) >= tickSpacing) {
            SoundEffects.playTick();
            lastTickRotation = currentRotation;
        }

        elements.ball.style.transform = `translate(-50%, -50%) rotate(${currentRotation}deg) translateY(${currentRadius}px)`;

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            SoundEffects.playBallDrop();
        }
    }

    requestAnimationFrame(frame);
}

function processSpinResult(winningNumber) {
    sessionStats.spins++;
    let spinWon = false;
    let totalWinnings = 0;
    let totalStaked = 0;

    placedBets.forEach(bet => {
        totalStaked += bet.amount;
        const won = checkWin(winningNumber, bet.type, bet.number);
        if (won) {
            spinWon = true;
            // Calculate total return (stake + profit)
            const payout = bet.amount * (bet.payout + 1);
            totalWinnings += payout;
        }
    });

    if (spinWon) {
        sessionStats.wins++;
        SoundEffects.playWin();
    } else {
        sessionStats.losses++;
        SoundEffects.playLose();
    }

    sessionStats.fullHistory.push(String(winningNumber));
    sessionStats.history.unshift({ num: winningNumber, won: spinWon });
    if (sessionStats.history.length > 20) sessionStats.history.pop();

    // Now apply financial result: Add any winnings (stakes already deducted)
    bankroll += totalWinnings;

    updateBankrollDisplay();
    updateStatsDisplay(winningNumber, spinWon);
    
    // Bets now persist on the table
    updatePlacedBetsList();
}

function checkWin(num, betType, betSelection) {
    // Normalize num to string
    num = String(num);
    
    switch(betType) {
        case 'straight':
            return num === String(betSelection);
        
        case 'split':
            const splitNums = betSelection.split('-').map(n => String(n.trim()));
            return splitNums.includes(num);
        
        case 'street':
            const streetNums = betSelection.split('-').map(n => String(n.trim()));
            return streetNums.includes(num);
        
        case 'corner':
            const cornerNums = betSelection.split('-').map(n => String(n.trim()));
            return cornerNums.includes(num);
        
        case 'sixline':
            const sixNums = betSelection.split('-').map(n => String(n.trim()));
            return sixNums.includes(num);
        
        case 'basket':
            return ['0', '1', '2', '3', '00'].includes(num);
        
        case 'dozen':
            const numVal = parseInt(num);
            if (betSelection.includes('First')) return numVal >= 1 && numVal <= 12;
            if (betSelection.includes('Second')) return numVal >= 13 && numVal <= 24;
            if (betSelection.includes('Third')) return numVal >= 25 && numVal <= 36;
            break;
        
        case 'column':
            const colNum = parseInt(num);
            if (betSelection.includes('Column 1')) return colNum % 3 === 1;
            if (betSelection.includes('Column 2')) return colNum % 3 === 2;
            if (betSelection.includes('Column 3')) return colNum % 3 === 0;
            break;
        
        case 'redblack':
            const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(parseInt(num));
            if (betSelection === 'Red') return isRed;
            if (betSelection === 'Black') return !isRed && num !== '0' && num !== '00';
            break;
        
        case 'evenodd':
            if (num === '0' || num === '00') return false;
            const numInt = parseInt(num);
            if (betSelection === 'Even') return numInt % 2 === 0;
            if (betSelection === 'Odd') return numInt % 2 === 1;
            break;
        
        case 'highlow':
            if (num === '0' || num === '00') return false;
            const n = parseInt(num);
            if (betSelection.includes('High')) return n >= 19 && n <= 36;
            if (betSelection.includes('Low')) return n >= 1 && n <= 18;
            break;
    }
    
    return false;
}

// --- UI UPDATE ---

function updateBankrollDisplay() {
    const earnings = bankroll - 1000;
    const earningsText = earnings >= 0 ? `+$${earnings}` : `-$${Math.abs(earnings)}`;
    const earningsColor = earnings >= 0 ? '#22c55e' : '#ef4444';
    
    elements.balance.textContent = `$${bankroll}`;
    elements.earnings.textContent = earningsText;
    elements.earnings.style.color = earningsColor;
    if (elements.totalWageredEl) {
        elements.totalWageredEl.textContent = `$${totalWagered}`;
    }
}

function updateStatsDisplay(lastNum, won) {
    elements.statSpins.textContent = sessionStats.spins;
    elements.statWinLoss.textContent = `${sessionStats.wins} / ${sessionStats.losses}`;
    
    elements.statLast.textContent = lastNum;
    elements.statLast.className = `number-badge large-badge ${getNumberColorName(lastNum)}${won ? ' win' : ''}`;

    const winRate = sessionStats.spins > 0 ? (sessionStats.wins / sessionStats.spins) * 100 : 0;
    elements.statWinRate.textContent = `${winRate.toFixed(1)}%`;

    const roi = totalWagered > 0 ? ((bankroll - 1000) / totalWagered) * 100 : 0;
    elements.statRoi.textContent = `${roi.toFixed(1)}%`;

    elements.statProgress.style.width = `${Math.min(winRate, 100)}%`;

    // History
    elements.historyLog.innerHTML = sessionStats.history.map(item => `
        <span class="number-badge ${getNumberColorName(item.num)}${item.won ? ' win' : ''}">
            ${item.num}
        </span>
    `).join('');
}

function updateMathTable() {
    const slots = WHEEL_DATA[currentVariant].slots;
    elements.betTable.innerHTML = '';

    BET_TYPES.forEach(bet => {
        if (bet.variant && bet.variant !== currentVariant) return;

        const prob = (bet.coverage / slots) * 100;
        const edge = (1 - (bet.coverage / slots) * (bet.payout + 1)) * 100;

        const row = `
            <tr>
                <td>${bet.name}</td>
                <td>${bet.coverage}</td>
                <td>${bet.payout}:1</td>
                <td>${prob.toFixed(2)}%</td>
                <td>${Math.abs(edge).toFixed(2)}%</td>
            </tr>
        `;
        elements.betTable.insertAdjacentHTML('beforeend', row);
    });
}

// --- EVENT LISTENERS ---

function attachEventListeners() {
    // Theme Switching
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            document.body.setAttribute('data-theme', e.target.value);
            if (window.SoundEffects) SoundEffects.playUI();
        });
    }

    // Variant switching
    elements.btnEuro.addEventListener('click', () => {
        currentVariant = 'european';
        elements.btnEuro.classList.add('active');
        elements.btnAmer.classList.remove('active');
        resetSession();
        renderWheel();
        updateMathTable();
        populateBetTypes();
        initProbabilityCalculator(); // Refresh calc options
    });

    elements.btnAmer.addEventListener('click', () => {
        currentVariant = 'american';
        elements.btnAmer.classList.add('active');
        elements.btnEuro.classList.remove('active');
        resetSession();
        renderWheel();
        updateMathTable();
        populateBetTypes();
        initProbabilityCalculator(); // Refresh calc options
    });

    // Fullscreen
    elements.btnFullscreen.addEventListener('click', toggleFullscreen);
    elements.btnExitFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenState);

    // Chip selection
    elements.chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle regular chip buttons
            if (btn.dataset.value) {
                SoundEffects.playUI();
                elements.chipBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                chipValue = parseInt(btn.dataset.value);
                updateBetPreview();
            }
        });
    });

    // All In button
    elements.allInBtn.addEventListener('click', () => {
        const available = bankroll;
        if (available > 0) {
            elements.chipBtns.forEach(b => b.classList.remove('active'));
            elements.allInBtn.classList.add('active');
            chipValue = available;
            updateBetPreview();
        }
    });

    // Bet type selection
    elements.betTypeSelect.addEventListener('change', () => {
        updateNumberSelector();
        clearBetTemp();
    });

    // Bet buttons
    elements.btnAddBet.addEventListener('click', addBet);
    elements.btnClearBet.addEventListener('click', clearBetTemp);
    elements.btnSpinWithBets.addEventListener('click', spin);

    // Reset buttons
    elements.resetBtn.addEventListener('click', resetSession);
    elements.resetBankroll.addEventListener('click', () => {
        bankroll = 1000;
        totalWagered = 0;
        sessionStats = { spins: 0, wins: 0, losses: 0, history: [], fullHistory: [] };
        placedBets = [];
        updateBankrollDisplay();
        updatePlacedBetsList();
        updateStatsDisplay('--', false);
        clearBetTemp();
    });
}

function resetSession() {
    sessionStats = { spins: 0, wins: 0, losses: 0, history: [], fullHistory: [] };
    placedBets = [];
    updatePlacedBetsList();
    updateStatsDisplay('--', false);
    clearBetTemp();
}

// --- FULLSCREEN LOGIC ---

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function updateFullscreenState() {
    if (document.fullscreenElement) {
        document.body.classList.add('is-fullscreen');
    } else {
        document.body.classList.remove('is-fullscreen');
    }
}

// --- UTILS ---

function getNumberColor(num) {
    if (num === 0 || num === '00') return '#15803d';
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return reds.includes(num) ? '#dc2626' : '#171717';
}

function getNumberColorName(num) {
    if (num === '--') return '';
    if (num === 0 || num === '00') return 'green';
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return reds.includes(num) ? 'red' : 'black';
}

// --- LESSON LOGIC ---
const lessonElements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabEvents: document.getElementById('tab-events'),
    tabSequence: document.getElementById('tab-sequence'),
    
    // Event Relations
    lessonSelector: document.getElementById('lesson-selector'),
    eventA: document.getElementById('lesson-event-a'),
    eventB: document.getElementById('lesson-event-b'),
    selectA: document.getElementById('lesson-selection-a'),
    selectB: document.getElementById('lesson-selection-b'),
    grid: document.getElementById('lesson-grid'),
    mathTitle: document.getElementById('math-formula-title'),
    mathFormula: document.getElementById('math-formula-display'),
    mathCalc: document.getElementById('math-calculation-display'),
    mathResult: document.getElementById('math-result-display'),
    
    // Sequence
    seqBetType: document.getElementById('seq-bet-type'),
    seqBetSelection: document.getElementById('seq-bet-selection'),
    seqCount: document.getElementById('seq-count'),
    btnRunSeq: document.getElementById('btn-run-seq'),
    seqTheory: document.getElementById('seq-theory-val'),
    seqSim: document.getElementById('seq-sim-val'),
    seqCalc: document.getElementById('seq-calc')
};

function initLessons() {
    if (!lessonElements.lessonSelector) return;

    // Tabs
    lessonElements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            lessonElements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'events') {
                lessonElements.tabEvents.style.display = 'block';
                lessonElements.tabSequence.style.display = 'none';
            } else {
                lessonElements.tabEvents.style.display = 'none';
                lessonElements.tabSequence.style.display = 'block';
                initSequenceTab();
            }
        });
    });

    // Populate Bet Types for Event A/B
    const betOptions = BET_TYPES
        .filter(bet => !bet.variant || bet.variant === currentVariant)
        .map(bet => `<option value="${bet.id}">${bet.name}</option>`)
        .join('');
    
    lessonElements.eventA.innerHTML = betOptions;
    lessonElements.eventB.innerHTML = betOptions;

    // Listeners
    lessonElements.lessonSelector.addEventListener('change', applyLessonPreset);
    lessonElements.eventA.addEventListener('change', () => { updateLessonSelections('A'); updateLessonMath(); });
    lessonElements.eventB.addEventListener('change', () => { updateLessonSelections('B'); updateLessonMath(); });

    // Initial Population
    updateLessonSelections('A');
    updateLessonSelections('B');
    updateLessonMath();
    
    // Render Full Grid
    renderLessonGrid();
}

function renderLessonGrid() {
    lessonElements.grid.innerHTML = '';
    const data = WHEEL_DATA[currentVariant];
    data.numbers.forEach(num => {
        const btn = document.createElement('div');
        btn.className = 'number-btn'; // Re-use styling
        btn.textContent = num;
        btn.dataset.num = num;
        
        // Add specific color class
        const color = getNumberColorName(num);
        if (color) btn.classList.add(color);
        
        lessonElements.grid.appendChild(btn);
    });
}

function updateLessonSelections(which) {
    const typeEl = which === 'A' ? lessonElements.eventA : lessonElements.eventB;
    const container = which === 'A' ? lessonElements.selectA : lessonElements.selectB;
    const betId = typeEl.value;
    
    container.innerHTML = '';
    
    // Reuse the populate logic but tailored for this container
    // We can't reuse populateCalcSelections directly because it targets specific IDs
    // So we replicate the logic briefly
    
    const bet = BET_TYPES.find(b => b.id === betId);
    if (!bet) return;
    
    let options = [];
    if (!bet.requiresNumber) {
         options.push(bet.name); // Just a dummy clickable
    } else {
        // Reuse the switch from populateCalcSelections logic...
        // For brevity in this append, I'll extract options generation or duplicate:
        switch(betId) {
            case 'straight': 
                options = WHEEL_DATA[currentVariant].numbers.map(String); 
                break;
            case 'split': 
                options = ['1-2','2-3','4-5','5-6','7-8','8-9','10-11','11-12','13-14','14-15','16-17','17-18']; 
                break;
            case 'street': 
                options = ['1-2-3','4-5-6','7-8-9','10-11-12','13-14-15','16-17-18','19-20-21','22-23-24','25-26-27','28-29-30','31-32-33','34-35-36']; 
                break;
            case 'corner': 
                options = ['1-2-4-5','2-3-5-6','4-5-7-8','5-6-8-9','7-8-10-11','8-9-11-12','10-11-13-14','11-12-14-15','13-14-16-17','14-15-17-18','16-17-19-20','17-18-20-21','19-20-22-23','20-21-23-24','22-23-25-26','23-24-26-27','25-26-28-29','26-27-29-30','28-29-31-32','29-30-32-33','31-32-34-35','32-33-35-36']; 
                break;
            case 'sixline': 
                options = ['1-2-3-4-5-6','4-5-6-7-8-9','7-8-9-10-11-12','10-11-12-13-14-15','13-14-15-16-17-18','16-17-18-19-20-21','19-20-21-22-23-24','22-23-24-25-26-27','25-26-27-28-29-30','28-29-30-31-32-33','31-32-33-34-35-36']; 
                break;
            case 'dozen': 
                options = ['1-12 (First Dozen)','13-24 (Second Dozen)','25-36 (Third Dozen)']; 
                break;
            case 'column': 
                options = ['Column 1 (1,4,7...34)','Column 2 (2,5,8...35)','Column 3 (3,6,9...36)']; 
                break;
            case 'redblack': 
                options = ['Red','Black']; 
                break;
            case 'evenodd': 
                options = ['Even','Odd']; 
                break;
            case 'highlow': 
                options = ['High (19-36)','Low (1-18)']; 
                break;
        }
    }

    options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.number-btn.selected').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            container.dataset.selection = opt;
            updateLessonMath();
        });
        container.appendChild(btn);
        
        if (idx === 0) {
            btn.classList.add('selected');
            container.dataset.selection = opt;
        }
    });
}

function applyLessonPreset() {
    const lesson = lessonElements.lessonSelector.value;
    if (!lesson) return;
    
    // Helper to set and update
    const setEvent = (which, type, selIndexOrText) => {
        const typeEl = which === 'A' ? lessonElements.eventA : lessonElements.eventB;
        typeEl.value = type;
        updateLessonSelections(which);
        
        const container = which === 'A' ? lessonElements.selectA : lessonElements.selectB;
        const btns = container.querySelectorAll('.number-btn');
        
        // Find button by text or index
        let targetBtn = null;
        if (typeof selIndexOrText === 'number') {
            targetBtn = btns[selIndexOrText];
        } else {
            targetBtn = Array.from(btns).find(b => b.textContent.includes(selIndexOrText));
        }
        
        if (targetBtn) {
            container.querySelectorAll('.selected').forEach(b => b.classList.remove('selected'));
            targetBtn.classList.add('selected');
            container.dataset.selection = targetBtn.textContent;
        }
    };

    if (lesson === 'mutually-exclusive') {
        // Red vs Black
        setEvent('A', 'redblack', 'Red');
        setEvent('B', 'redblack', 'Black');
    } else if (lesson === 'addition-rule') {
        // Red vs Even (Overlap)
        setEvent('A', 'redblack', 'Red');
        setEvent('B', 'evenodd', 'Even');
    } else if (lesson === 'dependence') {
        // Red -> Even
        setEvent('A', 'redblack', 'Red');
        setEvent('B', 'evenodd', 'Even');
    }
    
    updateLessonMath();
}

function updateLessonMath() {
    const lesson = lessonElements.lessonSelector.value || 'addition-rule'; // Default
    
    // Get Selections
    const typeA = lessonElements.eventA.value;
    const typeB = lessonElements.eventB.value;
    const selA = lessonElements.selectA.dataset.selection || lessonElements.selectA.textContent;
    const selB = lessonElements.selectB.dataset.selection || lessonElements.selectB.textContent;

    // Calculate Sets
    const numsA = numbersForBet(typeA, selA) || [];
    const numsB = numbersForBet(typeB, selB) || [];
    
    // Ensure we are working with string sets for robust comparison
    const setA = new Set(numsA.map(String));
    const setB = new Set(numsB.map(String));
    
    const slots = WHEEL_DATA[currentVariant].slots;
    
    // Update Grid Visuals
    const gridBtns = lessonElements.grid.querySelectorAll('.number-btn');
    gridBtns.forEach(btn => {
        const num = String(btn.dataset.num);
        btn.classList.remove('is-event-a', 'is-event-b', 'is-overlap');
        
        const inA = setA.has(num);
        const inB = setB.has(num);
        
        if (inA && inB) btn.classList.add('is-overlap');
        else if (inA) btn.classList.add('is-event-a');
        else if (inB) btn.classList.add('is-event-b');
    });

    // Math Logic
    const pA = numsA.length / slots;
    const pB = numsB.length / slots;
    const intersection = numsA.filter(n => setB.has(String(n)));
    const pIntersect = intersection.length / slots;
    
    const fmt = (v) => (v * 100).toFixed(1) + '%';
    
    if (lesson === 'mutually-exclusive' || lesson === 'addition-rule' || !lesson) {
        // Addition Rule Focus
        lessonElements.mathTitle.textContent = "Addition Rule: P(A or B) = P(A) + P(B) - P(A and B)";
        
        lessonElements.mathFormula.innerHTML = `
            P(A or B) = P(<span style="color:var(--accent-color)">A</span>) + 
            P(<span style="color:var(--success-color)">B</span>) - 
            P(Overlap)
        `;
        
        lessonElements.mathCalc.textContent = `${fmt(pA)} + ${fmt(pB)} - ${fmt(pIntersect)}`;
        
        const result = pA + pB - pIntersect;
        lessonElements.mathResult.textContent = `= ${fmt(result)}`;
        
        if (pIntersect === 0) {
             lessonElements.mathTitle.textContent += " (Mutually Exclusive)";
        }
    } 
    else if (lesson === 'dependence') {
        // Conditional Focus
        lessonElements.mathTitle.textContent = "Conditional Probability: P(B | A) = P(A and B) / P(A)";
        
        lessonElements.mathFormula.innerHTML = `
            P(B|A) = P(Overlap) ÷ P(<span style="color:var(--accent-color)">A</span>)
        `;
        
        lessonElements.mathCalc.textContent = `${fmt(pIntersect)} ÷ ${fmt(pA)}`;
        
        const cond = pA > 0 ? pIntersect / pA : 0;
        lessonElements.mathResult.textContent = `= ${fmt(cond)}`;
        
        // Compare with P(B)
        const diff = Math.abs(cond - pB);
        const isDep = diff > 0.001;
        lessonElements.mathResult.innerHTML += `
            <div style="font-size:0.8rem; font-weight:normal; margin-top:0.5rem;">
                Compare to P(B) = ${fmt(pB)}.<br>
                Events are <strong>${isDep ? 'DEPENDENT' : 'INDEPENDENT'}</strong>
            </div>
        `;
    }
}

// --- SEQUENCE TAB ---
function initSequenceTab() {
    if (lessonElements.seqBetType.options.length > 0) return; // already init
    
    // Populate Bet Types
     lessonElements.seqBetType.innerHTML = BET_TYPES
        .filter(bet => !bet.variant || bet.variant === currentVariant)
        .map(bet => `<option value="${bet.id}">${bet.name}</option>`)
        .join('');
        
    // Listeners
    lessonElements.seqBetType.addEventListener('change', updateSeqSelections);
    updateSeqSelections();
    
    lessonElements.btnRunSeq.addEventListener('click', runSequenceSimulation);
}

function updateSeqSelections() {
     const betId = lessonElements.seqBetType.value;
     const container = lessonElements.seqBetSelection;
     container.innerHTML = '';
     
     let options = [];
     const bet = BET_TYPES.find(b => b.id === betId);
     
     if (!bet || !bet.requiresNumber) {
         options.push(bet ? bet.name : 'Default');
     } else {
        switch(betId) {
            case 'straight': 
                options = WHEEL_DATA[currentVariant].numbers.map(String); 
                break;
            case 'split': 
                options = ['1-2','2-3','4-5','5-6','7-8','8-9','10-11','11-12','13-14','14-15','16-17','17-18']; 
                break;
            case 'street': 
                options = ['1-2-3','4-5-6','7-8-9','10-11-12','13-14-15','16-17-18','19-20-21','22-23-24','25-26-27','28-29-30','31-32-33','34-35-36']; 
                break;
            case 'corner': 
                options = ['1-2-4-5','2-3-5-6','4-5-7-8','5-6-8-9','7-8-10-11','8-9-11-12','10-11-13-14','11-12-14-15','13-14-16-17','14-15-17-18','16-17-19-20','17-18-20-21','19-20-22-23','20-21-23-24','22-23-25-26','23-24-26-27','25-26-28-29','26-27-29-30','28-29-31-32','29-30-32-33','31-32-34-35','32-33-35-36']; 
                break;
            case 'sixline': 
                options = ['1-2-3-4-5-6','4-5-6-7-8-9','7-8-9-10-11-12','10-11-12-13-14-15','13-14-15-16-17-18','16-17-18-19-20-21','19-20-21-22-23-24','22-23-24-25-26-27','25-26-27-28-29-30','28-29-30-31-32-33','31-32-33-34-35-36']; 
                break;
            case 'dozen': 
                options = ['1-12 (First Dozen)','13-24 (Second Dozen)','25-36 (Third Dozen)']; 
                break;
            case 'column': 
                options = ['Column 1 (1,4,7...34)','Column 2 (2,5,8...35)','Column 3 (3,6,9...36)']; 
                break;
            case 'redblack': 
                options = ['Red','Black']; 
                break;
            case 'evenodd': 
                options = ['Even','Odd']; 
                break;
            case 'highlow': 
                options = ['High (19-36)','Low (1-18)']; 
                break;
            default:
                options = ['Default'];
        }
     }
     
     options.forEach(opt => {
         const op = document.createElement('option');
         op.value = opt;
         op.textContent = opt;
         container.appendChild(op);
     });
}

function runSequenceSimulation() {
    const betType = lessonElements.seqBetType.value;
    const betSel = lessonElements.seqBetSelection.value;
    const count = parseInt(lessonElements.seqCount.value);
    
    // 1. Calculate Theoretical
    const nums = numbersForBet(betType, betSel);
    const slots = WHEEL_DATA[currentVariant].slots;
    const pSingle = nums.length / slots;
    
    const pTheory = Math.pow(pSingle, count);
    
    lessonElements.seqTheory.textContent = `${(pTheory * 100).toFixed(4)}%`;
    lessonElements.seqCalc.textContent = `${(pSingle*100).toFixed(1)}% ^ ${count}`;
    
    // 2. Run Simulation
    let successCount = 0;
    const SIMS = 1000;
    const data = WHEEL_DATA[currentVariant];
    
    lessonElements.btnRunSeq.textContent = "Running...";
    lessonElements.btnRunSeq.disabled = true;
    
    // Async to let UI render
    setTimeout(() => {
        for(let i=0; i<SIMS; i++) {
            let allWon = true;
            for(let s=0; s<count; s++) {
                const randIdx = Math.floor(Math.random() * slots);
                const randNum = data.numbers[randIdx];
                if (!checkWin(randNum, betType, betSel)) {
                    allWon = false;
                    break;
                }
            }
            if (allWon) successCount++;
        }
        
        const pSim = successCount / SIMS;
        lessonElements.seqSim.textContent = `${(pSim * 100).toFixed(4)}% (${successCount}/${SIMS})`;
        
        lessonElements.btnRunSeq.textContent = "Run 1000 Simulations";
        lessonElements.btnRunSeq.disabled = false;
    }, 50);
}
init();
