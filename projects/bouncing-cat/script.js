/**
 * Bouncing Cat - Ultimate Edition
 * Physics-based bouncing with trails, multiple cats, corner celebrations, and more!
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const container = document.getElementById('container');
    const cornerHit = document.getElementById('cornerHit');
    const speedUpBtn = document.getElementById('speedUp');
    const slowDownBtn = document.getElementById('slowDown');
    const changeColorBtn = document.getElementById('changeColor');
    const togglePauseBtn = document.getElementById('togglePause');
    const addCatBtn = document.getElementById('addCat');
    const toggleTrailBtn = document.getElementById('toggleTrail');
    const toggleDarkBtn = document.getElementById('toggleDark');
    const helpBtn = document.getElementById('helpBtn');
    const helpContent = document.getElementById('helpContent');
    const speedValue = document.getElementById('speedValue');
    const bounceCountEl = document.getElementById('bounceCount');
    const cornerCountEl = document.getElementById('cornerCount');

    // Global state
    let speed = 1;
    let isPaused = false;
    let colorIndex = 0;
    let trailEnabled = false;
    let bounceCount = 0;
    let cornerCount = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    let cats = [];
    let animationId = null;

    // Configuration
    const BASE_SPEED = 5;
    const CORNER_THRESHOLD = 50; // How close to corner counts as a "corner hit"
    const MOUSE_REPEL_DISTANCE = 150;
    const MOUSE_REPEL_FORCE = 0.5;

    // Fun background colors
    const colors = [
        '#dda0dd', '#87ceeb', '#98fb98', '#ffd700', '#ff6b6b',
        '#a29bfe', '#fd79a8', '#00b894', '#fdcb6e', '#74b9ff',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];

    // Confetti colors
    const confettiColors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#277da1'];

    /**
     * Cat class - handles individual cat physics
     */
    class Cat {
        constructor(element, wrapper) {
            this.element = element;
            this.wrapper = wrapper;
            this.width = 150;
            this.height = 150;
            this.hue = Math.random() * 360;
            
            // Random starting position
            this.x = Math.random() * (window.innerWidth - this.width - 100) + 50;
            this.y = Math.random() * (window.innerHeight - this.height - 100) + 50;
            
            // Random velocity
            const angle = Math.random() * 2 * Math.PI;
            this.vx = Math.cos(angle) * BASE_SPEED;
            this.vy = Math.sin(angle) * BASE_SPEED;
            
            // Ensure minimum velocity
            if (Math.abs(this.vx) < 2) this.vx = this.vx < 0 ? -2 : 2;
            if (Math.abs(this.vy) < 2) this.vy = this.vy < 0 ? -2 : 2;
            
            // Trail state
            this.lastTrailTime = 0;
            this.trailInterval = 50; // ms between trail ghosts
        }

        update() {
            if (isPaused) return;

            // Mouse repulsion
            const dx = this.x + this.width / 2 - mouseX;
            const dy = this.y + this.height / 2 - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < MOUSE_REPEL_DISTANCE && dist > 0) {
                const force = (MOUSE_REPEL_DISTANCE - dist) / MOUSE_REPEL_DISTANCE * MOUSE_REPEL_FORCE;
                this.vx += (dx / dist) * force;
                this.vy += (dy / dist) * force;
            }

            // Update position
            this.x += this.vx * speed;
            this.y += this.vy * speed;

            // Get bounds
            const maxX = window.innerWidth - this.width;
            const maxY = window.innerHeight - this.height;

            // Track if we hit a wall
            let hitX = false;
            let hitY = false;

            // Bounce off walls
            if (this.x <= 0) {
                this.x = 0;
                this.vx = Math.abs(this.vx) + this.bounceVariation();
                hitX = true;
            } else if (this.x >= maxX) {
                this.x = maxX;
                this.vx = -Math.abs(this.vx) + this.bounceVariation();
                hitX = true;
            }

            if (this.y <= 0) {
                this.y = 0;
                this.vy = Math.abs(this.vy) + this.bounceVariation();
                hitY = true;
            } else if (this.y >= maxY) {
                this.y = maxY;
                this.vy = -Math.abs(this.vy) + this.bounceVariation();
                hitY = true;
            }

            // Handle bounces
            if (hitX || hitY) {
                this.triggerBounce();
                bounceCount++;
                updateStats();

                // Check for corner hit!
                if (this.isInCorner()) {
                    this.celebrateCorner();
                }
            }

            // Normalize velocity
            this.normalizeVelocity();

            // Create trail
            if (trailEnabled) {
                this.createTrail();
            }

            // Apply position
            this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`;
        }

        bounceVariation() {
            return (Math.random() - 0.5) * 1;
        }

        normalizeVelocity() {
            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (currentSpeed > 0) {
                this.vx = (this.vx / currentSpeed) * BASE_SPEED;
                this.vy = (this.vy / currentSpeed) * BASE_SPEED;
            }
        }

        triggerBounce() {
            this.element.classList.remove('bounce');
            void this.element.offsetWidth;
            this.element.classList.add('bounce');
        }

        isInCorner() {
            const maxX = window.innerWidth - this.width;
            const maxY = window.innerHeight - this.height;
            
            const inLeftEdge = this.x <= CORNER_THRESHOLD;
            const inRightEdge = this.x >= maxX - CORNER_THRESHOLD;
            const inTopEdge = this.y <= CORNER_THRESHOLD;
            const inBottomEdge = this.y >= maxY - CORNER_THRESHOLD;

            return (inLeftEdge || inRightEdge) && (inTopEdge || inBottomEdge);
        }

        celebrateCorner() {
            cornerCount++;
            updateStats();
            
            // Show celebration text
            cornerHit.classList.remove('active');
            void cornerHit.offsetWidth;
            cornerHit.classList.add('active');
            
            // Spawn confetti
            spawnConfetti(this.x + this.width / 2, this.y + this.height / 2);
            
            // Change background color
            colorIndex = (colorIndex + 1) % colors.length;
            document.documentElement.style.setProperty('--bg-color', colors[colorIndex]);
        }

        createTrail() {
            const now = Date.now();
            if (now - this.lastTrailTime < this.trailInterval) return;
            this.lastTrailTime = now;

            const ghost = document.createElement('div');
            ghost.className = 'ghost';
            ghost.style.setProperty('--hue', `${this.hue}deg`);
            ghost.innerHTML = `<img src="cat.gif" alt="">`;
            ghost.style.transform = `translate(${this.x}px, ${this.y}px)`;
            container.appendChild(ghost);

            // Rotate hue for rainbow effect
            this.hue = (this.hue + 15) % 360;

            // Fade out and remove
            requestAnimationFrame(() => {
                ghost.classList.add('fade-out');
            });
            
            setTimeout(() => {
                ghost.remove();
            }, 500);
        }

        randomizeDirection() {
            const angle = Math.random() * 2 * Math.PI;
            this.vx = Math.cos(angle) * BASE_SPEED;
            this.vy = Math.sin(angle) * BASE_SPEED;
            this.triggerBounce();
        }
    }

    /**
     * Spawn confetti particles
     */
    function spawnConfetti(x, y) {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti';
        confettiContainer.style.left = x + 'px';
        confettiContainer.style.top = y + 'px';
        container.appendChild(confettiContainer);

        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.background = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            piece.style.left = (Math.random() - 0.5) * 200 + 'px';
            piece.style.animationDelay = Math.random() * 0.3 + 's';
            piece.style.animationDuration = (1 + Math.random()) + 's';
            
            // Random shapes
            if (Math.random() > 0.5) {
                piece.style.borderRadius = '50%';
            }
            
            confettiContainer.appendChild(piece);
        }

        setTimeout(() => confettiContainer.remove(), 2000);
    }

    /**
     * Add a new cat to the screen
     */
    function addNewCat() {
        const wrapper = document.createElement('div');
        wrapper.className = 'cat-wrapper';
        
        const img = document.createElement('img');
        img.src = 'cat.gif';
        img.alt = 'Bouncing cat';
        img.className = 'cat';
        
        wrapper.appendChild(img);
        container.appendChild(wrapper);
        
        const cat = new Cat(img, wrapper);
        cats.push(cat);
        
        // Click handler
        img.addEventListener('click', () => cat.randomizeDirection());
        
        return cat;
    }

    /**
     * Initialize the first cat
     */
    function init() {
        const firstWrapper = document.getElementById('catWrapper');
        const firstCat = document.getElementById('cat');
        
        // Get dimensions once loaded
        if (firstCat.complete) {
            const cat = new Cat(firstCat, firstWrapper);
            cats.push(cat);
            firstCat.addEventListener('click', () => cat.randomizeDirection());
        } else {
            firstCat.addEventListener('load', () => {
                const cat = new Cat(firstCat, firstWrapper);
                cats.push(cat);
                firstCat.addEventListener('click', () => cat.randomizeDirection());
            });
        }
    }

    /**
     * Main animation loop
     */
    function animate() {
        cats.forEach(cat => cat.update());
        animationId = requestAnimationFrame(animate);
    }

    /**
     * Update stats display
     */
    function updateStats() {
        bounceCountEl.textContent = bounceCount;
        cornerCountEl.textContent = cornerCount;
    }

    /**
     * Update speed display
     */
    function updateSpeedDisplay() {
        speedValue.textContent = `${speed.toFixed(1)}x`;
    }

    // Event Listeners
    speedUpBtn.addEventListener('click', () => {
        if (speed < 5) {
            speed += 0.5;
            updateSpeedDisplay();
        }
    });

    slowDownBtn.addEventListener('click', () => {
        if (speed > 0.5) {
            speed -= 0.5;
            updateSpeedDisplay();
        }
    });

    changeColorBtn.addEventListener('click', () => {
        colorIndex = (colorIndex + 1) % colors.length;
        document.documentElement.style.setProperty('--bg-color', colors[colorIndex]);
    });

    togglePauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        togglePauseBtn.textContent = isPaused ? '▶️ Play' : '⏸️ Pause';
    });

    addCatBtn.addEventListener('click', () => {
        if (cats.length < 20) { // Limit to prevent performance issues
            addNewCat();
        }
    });

    toggleTrailBtn.addEventListener('click', () => {
        trailEnabled = !trailEnabled;
        toggleTrailBtn.classList.toggle('active', trailEnabled);
    });

    toggleDarkBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        toggleDarkBtn.classList.toggle('active', document.body.classList.contains('dark-mode'));
    });

    helpBtn.addEventListener('click', () => {
        helpContent.classList.toggle('visible');
    });

    // Mouse tracking for repulsion
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    // Window resize handler
    window.addEventListener('resize', () => {
        cats.forEach(cat => {
            const maxX = window.innerWidth - cat.width;
            const maxY = window.innerHeight - cat.height;
            cat.x = Math.max(0, Math.min(cat.x, maxX));
            cat.y = Math.max(0, Math.min(cat.y, maxY));
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
            case ' ':
            case 'p':
                e.preventDefault();
                togglePauseBtn.click();
                break;
            case 'arrowup':
            case '+':
            case '=':
                speedUpBtn.click();
                break;
            case 'arrowdown':
            case '-':
                slowDownBtn.click();
                break;
            case 'c':
                changeColorBtn.click();
                break;
            case 'a':
                addCatBtn.click();
                break;
            case 't':
                toggleTrailBtn.click();
                break;
            case 'd':
                toggleDarkBtn.click();
                break;
            case 'r':
                // Reset - give all cats new directions
                cats.forEach(cat => cat.randomizeDirection());
                break;
        }
    });

    // Start
    init();
    
    // Small delay to ensure image is loaded
    setTimeout(() => {
        if (cats.length === 0) {
            init();
        }
        animate();
    }, 100);

    console.log('🐱 Bouncing Cat Ultimate Edition loaded!');
    console.log('   Try hitting a corner for a surprise!');
});
