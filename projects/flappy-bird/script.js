// Base speeds (calibrated for 60fps baseline)
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // ~16.67ms per frame at 60fps

// Speed multiplier (1 = normal, 0.5 = slow, 2 = fast)
let gameSpeed = parseFloat(localStorage.getItem('flappyGameSpeed')) || 1;
const SPEED_MIN = 0.5;
const SPEED_MAX = 2.0;
const SPEED_STEP = 0.25;

// Base physics values (at normal speed)
const BASE_MOVE_SPEED = 3;
const BASE_GRAVITY = 0.5;
const BASE_FLAP_STRENGTH = -7.6;

// Current physics (adjusted by speed multiplier)
let move_speed = BASE_MOVE_SPEED * gameSpeed;
let gravity = BASE_GRAVITY * gameSpeed;
let flap_strength = BASE_FLAP_STRENGTH * gameSpeed;

const MAX_FALL_SPEED = 10 * gameSpeed;
const MAX_RISE_SPEED = -10 * gameSpeed;

// Delta time tracking
let lastTime = 0;

let bird = document.querySelector('.birb');
let img = document.getElementById('birb-1');

let bird_props = bird.getBoundingClientRect();
let background = document.querySelector('.background').getBoundingClientRect();

let score_val = document.querySelector('.score_val');
let message = document.querySelector('.message');
let score_title = document.querySelector('.score_title');

let game_state = 'Start';
let bird_dy = 0; // Module-scoped for restart reset
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let isNewHighScore = false; // Track if current run beat high score

img.style.display = 'none';
message.classList.add('messageStyle');

// Display high score on start screen if exists
if (highScore > 0) {
    const existingBest = document.createElement('div');
    existingBest.className = 'best-score-display';
    existingBest.innerHTML = '🏆 Best: ' + highScore;
    message.appendChild(existingBest);
}

// Flap handlers at module scope for reuse by keyboard and touch
function handleFlap(e) {
    if (game_state != 'Play') return;
    if (e.key == 'ArrowUp' || e.key == ' ') {
        img.src = 'images/birbfly.png';
        bird_dy = flap_strength;
    }
}
function handleFlapEnd(e) {
    if (game_state != 'Play') return;
    if (e.key == 'ArrowUp' || e.key == ' ') {
        img.src = 'images/birb.png';
    }
}

// Update speed settings
function updateSpeed(newSpeed) {
    gameSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, newSpeed));
    localStorage.setItem('flappyGameSpeed', gameSpeed);
    move_speed = BASE_MOVE_SPEED * gameSpeed;
    gravity = BASE_GRAVITY * gameSpeed;
    flap_strength = BASE_FLAP_STRENGTH * gameSpeed;
    updateSpeedDisplay();
}

// Speed display element
let speedDisplay = null;
function updateSpeedDisplay() {
    if (!speedDisplay) {
        speedDisplay = document.createElement('div');
        speedDisplay.className = 'speed-display';
        document.body.appendChild(speedDisplay);
    }
    speedDisplay.innerHTML = '⚡ ' + gameSpeed.toFixed(2) + 'x';
    speedDisplay.style.opacity = '1';
    // Fade out after 2 seconds
    setTimeout(() => {
        if (game_state == 'Play') speedDisplay.style.opacity = '0.3';
    }, 2000);
}

// Reusable start game function
function startGame() {
    document.querySelectorAll('.pipe_sprite').forEach((e) => {
        e.remove();
    });
    img.style.display = 'block';
    bird.style.top = '40vh';
    bird_dy = 0; // Reset velocity on restart
    bird_props = bird.getBoundingClientRect(); // Reset bird props
    isNewHighScore = false; // Reset high score flag
    lastTime = 0; // Reset delta time tracking
    game_state = 'Play';
    message.innerHTML = '';
    score_title.innerHTML = 'Score : ';
    score_val.innerHTML = '0';
    message.classList.remove('messageStyle');
    updateSpeedDisplay();
    play();
}

// Pause functionality
function togglePause() {
    if (game_state == 'Play') {
        game_state = 'Paused';
        message.innerHTML = '⏸️ <strong>PAUSED</strong><br><br><span style="font-size: 0.8em;">Press P to Resume<br>[ / ] to adjust speed: ' + gameSpeed.toFixed(2) + 'x</span>';
        message.classList.add('messageStyle');
    } else if (game_state == 'Paused') {
        game_state = 'Play';
        message.innerHTML = '';
        message.classList.remove('messageStyle');
        lastTime = 0; // Reset delta time after pause
        // Resume all game loops
        play();
    }
}

// Keyboard controls - handle both start/restart and flapping
document.addEventListener('keydown', (e) => {
    // Speed controls (work during pause or before game starts)
    if (e.key == '[' || e.key == '{') {
        updateSpeed(gameSpeed - SPEED_STEP);
        if (game_state == 'Paused') {
            message.innerHTML = '⏸️ <strong>PAUSED</strong><br><br><span style="font-size: 0.8em;">Press P to Resume<br>[ / ] to adjust speed: ' + gameSpeed.toFixed(2) + 'x</span>';
        }
        return;
    }
    if (e.key == ']' || e.key == '}') {
        updateSpeed(gameSpeed + SPEED_STEP);
        if (game_state == 'Paused') {
            message.innerHTML = '⏸️ <strong>PAUSED</strong><br><br><span style="font-size: 0.8em;">Press P to Resume<br>[ / ] to adjust speed: ' + gameSpeed.toFixed(2) + 'x</span>';
        }
        return;
    }
    // Pause toggle
    if (e.key == 'p' || e.key == 'P') {
        if (game_state == 'Play' || game_state == 'Paused') {
            togglePause();
            return;
        }
    }
    // Start or restart game
    if ((e.key == 'Enter' || e.key == ' ') && game_state != 'Play' && game_state != 'Paused') {
        e.preventDefault();
        startGame();
        return;
    }
    // Flapping during play
    if (game_state == 'Play') {
        handleFlap(e);
    }
});

document.addEventListener('keyup', (e) => {
    if (game_state == 'Play') {
        handleFlapEnd(e);
    }
});

// Touch support for mobile
document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game_state != 'Play') {
        // Start/restart game
        startGame();
    } else {
        // Flap
        handleFlap({ key: 'ArrowUp' });
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (game_state == 'Play') {
        handleFlapEnd({ key: 'ArrowUp' });
    }
});

// Click support for restart (desktop users clicking the message)
document.addEventListener('click', (e) => {
    if (game_state == 'End' || game_state == 'Start') {
        startGame();
    }
});

function play() {
    function move(currentTime) {
        if (game_state != 'Play') return;
        
        // Calculate delta time for consistent speed across devices
        if (lastTime === 0) lastTime = currentTime;
        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        const timeScale = deltaTime / FRAME_TIME; // 1.0 at 60fps, 0.5 at 120fps, etc.
        
        let pipe_sprite = document.querySelectorAll('.pipe_sprite');
        pipe_sprite.forEach((element) => {
            let pipe_sprite_props = element.getBoundingClientRect();
            bird_props = bird.getBoundingClientRect();

            if (pipe_sprite_props.right <= 0) {
                element.remove();
            } else {
                if (
                    bird_props.left < pipe_sprite_props.left + pipe_sprite_props.width &&
                    bird_props.left + bird_props.width > pipe_sprite_props.left &&
                    bird_props.top < pipe_sprite_props.top + pipe_sprite_props.height &&
                    bird_props.top + bird_props.height > pipe_sprite_props.top
                ) {
                    game_state = 'End';
                    const currentScore = parseInt(score_val.innerHTML);
                    if (currentScore > highScore) {
                        highScore = currentScore;
                        localStorage.setItem('flappyHighScore', highScore);
                    }
                    const newRecordText = isNewHighScore ? '<br><span style="color: gold;">🎉 NEW RECORD! 🎉</span>' : '';
                    message.innerHTML = '<span style="color: red;">Game Over</span><br>Score: ' + currentScore + '<br>Best: ' + highScore + newRecordText + '<br><span style="font-size: 0.6em;">Click, Tap, or Press Enter to Restart</span>';
                    message.classList.add('messageStyle');
                    img.style.display = 'none';
                    return;
                } else {
                    // Time-scaled movement
                    const scaledMoveSpeed = move_speed * timeScale;
                    if (
                        pipe_sprite_props.right < bird_props.left &&
                        pipe_sprite_props.right + scaledMoveSpeed >= bird_props.left &&
                        element.increase_score == '1'
                    ) {
                        const newScore = parseInt(score_val.innerHTML) + 1;
                        score_val.innerHTML = newScore;
                        element.increase_score = '0'; // Prevent double-scoring
                        // Score pulse animation
                        score_val.style.transform = 'scale(1.3)';
                        setTimeout(() => { score_val.style.transform = 'scale(1)'; }, 100);
                        // Check for new high score during play
                        if (newScore > highScore && !isNewHighScore) {
                            isNewHighScore = true;
                            // Brief flash to indicate new high score
                            document.body.style.boxShadow = 'inset 0 0 100px gold';
                            setTimeout(() => { document.body.style.boxShadow = 'none'; }, 300);
                        }
                    }
                    element.style.left = pipe_sprite_props.left - scaledMoveSpeed + 'px';
                }
            }
        });
        requestAnimationFrame(move);
    }
    requestAnimationFrame(move);

    // Separate tracking for gravity loop
    let gravityLastTime = 0;
    
    function apply_gravity(currentTime) {
        if (game_state != 'Play') return;
        
        // Calculate delta time
        if (gravityLastTime === 0) gravityLastTime = currentTime;
        const deltaTime = currentTime - gravityLastTime;
        gravityLastTime = currentTime;
        const timeScale = deltaTime / FRAME_TIME;
        
        // Time-scaled gravity
        bird_dy += gravity * timeScale;
        const maxFall = 10 * gameSpeed;
        const maxRise = -10 * gameSpeed;
        bird_dy = Math.max(maxRise, Math.min(maxFall, bird_dy));

        bird.style.top = bird_props.top + (bird_dy * timeScale) + 'px';
        bird_props = bird.getBoundingClientRect();

        // Ground and ceiling collision check
        if (bird_props.top <= 0 || bird_props.bottom >= background.bottom) {
            game_state = 'End';
            const currentScore = parseInt(score_val.innerHTML);
            if (currentScore > highScore) {
                highScore = currentScore;
                localStorage.setItem('flappyHighScore', highScore);
            }
            const newRecordText = isNewHighScore ? '<br><span style="color: gold;">🎉 NEW RECORD! 🎉</span>' : '';
            message.innerHTML = '<span style="color: red;">Game Over</span><br>Score: ' + currentScore + '<br>Best: ' + highScore + newRecordText + '<br><span style="font-size: 0.6em;">Click, Tap, or Press Enter to Restart</span>';
            message.classList.add('messageStyle');
            img.style.display = 'none';
            return;
        }

        requestAnimationFrame(apply_gravity);
    }
    requestAnimationFrame(apply_gravity);

    let pipe_seperation = 0;
    let pipe_gap = 35;
    let pipeLastTime = 0;

    function create_pipe(currentTime) {
        if (game_state != 'Play') return;

        // Calculate delta time for pipe spawning
        if (pipeLastTime === 0) pipeLastTime = currentTime;
        const deltaTime = currentTime - pipeLastTime;
        pipeLastTime = currentTime;
        const timeScale = deltaTime / FRAME_TIME;

        // Time-scaled pipe separation counter
        pipe_seperation += timeScale * gameSpeed;
        
        if (pipe_seperation > 115) {
            pipe_seperation = 0;
            let pipe_posi = Math.floor(Math.random() * 43) + 8;

            let pipe_sprite_inv = document.createElement('div');
            pipe_sprite_inv.className = 'pipe_sprite';
            pipe_sprite_inv.style.top = pipe_posi - 70 + 'vh';
            pipe_sprite_inv.style.left = '100vw';
            document.body.appendChild(pipe_sprite_inv);

            let pipe_sprite = document.createElement('div');
            pipe_sprite.className = 'pipe_sprite';
            pipe_sprite.style.top = pipe_posi + pipe_gap + 'vh';
            pipe_sprite.style.left = '100vw';
            pipe_sprite.increase_score = '1';
            document.body.appendChild(pipe_sprite);
        }
        requestAnimationFrame(create_pipe);
    }
    requestAnimationFrame(create_pipe);
}
