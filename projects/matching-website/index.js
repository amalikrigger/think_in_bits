let gridContainer;
let scoreDisplay;
let movesDisplay;
let timerDisplay;
let bestMovesDisplay;
let winMessage;

let cardsData = [
    { "image": "assets/chili.png", "name": "chili" },
    { "image": "assets/grapes.png", "name": "grapes" },
    { "image": "assets/lemon.png", "name": "lemon" },
    { "image": "assets/orange.png", "name": "orange" },
    { "image": "assets/pineapple.png", "name": "pineapple" },
    { "image": "assets/strawberry.png", "name": "strawberry" },
    { "image": "assets/tomato.png", "name": "tomato" },
    { "image": "assets/watermelon.png", "name": "watermelon" },
    { "image": "assets/cherries.png", "name": "cherries" }
];

let cards = [];
let firstCard, secondCard;
let lockBoard = false;
let score = 0;
let moves = 0;
let time = 0;
let timerStarted = false;
let timerInterval;
const BEST_MOVES_KEY = 'matching_game_best_moves';

// Initialize game on content load
document.addEventListener('DOMContentLoaded', () => {
    gridContainer = document.querySelector('.grid-container');
    scoreDisplay = document.querySelector(".score");
    movesDisplay = document.querySelector(".moves");
    timerDisplay = document.querySelector(".timer");
    bestMovesDisplay = document.querySelector(".best-moves");
    winMessage = document.getElementById('win-message');

    initGame();
    document.getElementById('restart-btn').addEventListener('click', restart);
});

/**
 * Loads card data and starts the game
 */
function initGame() {
    try {
        // Create pairs by duplicating the data
        cards = [...cardsData, ...cardsData];
        updateStats();
        shuffleCards();
        generateCards();
    } catch (err) {
        console.error("Error starting game:", err);
        if (gridContainer) {
            gridContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Something went wrong while starting the game.</p>`;
        }
    }
}

/**
 * Shuffles the cards array using Fisher-Yates algorithm
 */
function shuffleCards() {
    let currentIndex = cards.length,
        randomIndex,
        temporaryValue;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        temporaryValue = cards[currentIndex];
        cards[currentIndex] = cards[randomIndex];
        cards[randomIndex] = temporaryValue;
    }
}

/**
 * Creates card elements and adds them to the grid
 */
function generateCards() {
    gridContainer.innerHTML = ''; // Clear grid
    for (let card of cards) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.setAttribute('data-name', card.name);
        cardElement.setAttribute('aria-label', `Memory card: ${card.name}`);
        cardElement.innerHTML = `
            <div class="card-front">
               <img class="front-image" src="${card.image}" alt="${card.name}" />
            </div>
            <div class="back"></div>
        `;
        gridContainer.appendChild(cardElement);
        cardElement.addEventListener('click', flipCard);
    }
}

/**
 * Handles card flip logic
 */
function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;

    // Start timer on first card flip
    startTimer();

    this.classList.add('flipped');

    if (!firstCard) {
        firstCard = this;
        return;
    }

    secondCard = this;
    lockBoard = true;
    
    // Increment moves when the second card is flipped
    moves++;
    updateStats();

    checkForMatch();
}

/**
 * Checks if the two flipped cards match
 */
function checkForMatch() {
    let isMatch = firstCard.dataset.name === secondCard.dataset.name;

    isMatch ? disableCards() : unflipCards();
}

/**
 * Handles matching cards: disables clicks and updates score
 */
function disableCards() {
    const card1 = firstCard;
    const card2 = secondCard;
    
    card1.removeEventListener('click', flipCard);
    card2.removeEventListener('click', flipCard);

    card1.classList.add('matched');
    card2.classList.add('matched');

    setTimeout(() => {
        card1.classList.remove('matched');
        card2.classList.remove('matched');
    }, 500);

    score++;
    updateStats();
    checkWin();

    resetBoard();
}

/**
 * Handles non-matching cards: unflips them after a delay
 */
function unflipCards() {
    const card1 = firstCard;
    const card2 = secondCard;

    card1.classList.add('mismatch');
    card2.classList.add('mismatch');

    setTimeout(() => {
        card1.classList.remove('flipped', 'mismatch');
        card2.classList.remove('flipped', 'mismatch');
        resetBoard();
    }, 1000);
}

/**
 * Resets the board state for the next turn
 */
function resetBoard() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}

/**
 * Updates the score and moves in the DOM
 */
function updateStats() {
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (movesDisplay) movesDisplay.textContent = moves;

    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const bestMoves = localStorage.getItem(BEST_MOVES_KEY);
    if (bestMovesDisplay) {
        bestMovesDisplay.textContent = bestMoves ? bestMoves : "-";
    }
}

/**
 * Checks if the user has matched all cards
 */
function checkWin() {
    if (cards.length > 0 && score === cards.length / 2) {
        clearInterval(timerInterval);
        if (winMessage) {
            winMessage.innerHTML = `
                <h2>Winner!</h2>
                <p>You completed the game in <strong>${moves}</strong> moves and <strong>${timerDisplay.textContent}</strong>!</p>
                <button id="play-again-btn">Play Again</button>
            `;
            winMessage.style.display = 'flex';
            document.getElementById('play-again-btn').addEventListener('click', restart);
        }

        const bestMoves = localStorage.getItem(BEST_MOVES_KEY);
        if (!bestMoves || moves < parseInt(bestMoves)) {
            localStorage.setItem(BEST_MOVES_KEY, moves);
            updateStats();
        }
    }
}

/**
 * Resets the game to its initial state
 */
function restart() {
    resetBoard();
    shuffleCards();
    score = 0;
    moves = 0;
    time = 0;
    timerStarted = false;
    clearInterval(timerInterval);
    updateStats();
    if (winMessage) winMessage.style.display = 'none';
    generateCards();
}

/**
 * Starts the game timer
 */
function startTimer() {
    if (timerStarted) return;
    timerStarted = true;
    timerInterval = setInterval(() => {
        time++;
        updateStats();
    }, 1000);
}