/**
 * ConnectFourGame Class
 * Encapsulates the state and logic for the Connect Four game.
 */
class ConnectFourGame {
    constructor() {
        // Game Constants
        this.ROWS = 6;
        this.COLUMNS = 7;
        this.PLAYER_RED = "R";
        this.PLAYER_YELLOW = "Y";

        // Game State
        this.state = {
            currPlayer: this.PLAYER_RED,
            gameOver: false,
            board: [],
            currColumns: [] // Tracks the next available row index for each column
        };

        this.init();
    }

    /**
     * Initializes the game.
     */
    init() {
        this.setupBoard();
        this.setupEventListeners();
        this.updateStatus();
    }

    /**
     * Creates the board structure and initializes state.
     */
    setupBoard() {
        const boardElement = document.getElementById("board");
        if (!boardElement) return;

        boardElement.innerHTML = "";
        this.state.board = [];
        this.state.currColumns = Array(this.COLUMNS).fill(this.ROWS - 1);
        this.state.gameOver = false;
        this.state.currPlayer = this.PLAYER_RED;

        for (let r = 0; r < this.ROWS; r++) {
            const row = [];
            for (let c = 0; c < this.COLUMNS; c++) {
                // Initialize logical board
                row.push(' ');

                // Create DOM element for the tile
                const tile = document.createElement("div");
                tile.id = `${r}-${c}`;
                tile.classList.add("tile");
                tile.addEventListener("click", (e) => this.handleTileClick(e));
                boardElement.append(tile);
            }
            this.state.board.push(row);
        }
    }

    /**
     * Sets up global event listeners.
     */
    setupEventListeners() {
        const resetBtn = document.getElementById("reset-btn");
        if (resetBtn) {
            resetBtn.addEventListener("click", () => this.resetGame());
        }
    }

    /**
     * Updates the status message displayed to the user.
     */
    updateStatus() {
        if (this.state.gameOver) return;

        const winnerDisplay = document.getElementById("winner");
        if (winnerDisplay) {
            winnerDisplay.innerText = this.state.currPlayer === this.PLAYER_RED ? "Red's Turn" : "Yellow's Turn";
        }
    }

    /**
     * Handles clicking on a board tile.
     * @param {Event} e - The click event.
     */
    handleTileClick(e) {
        if (this.state.gameOver) return;

        // Get coordinates from the tile's ID
        const coords = e.target.id.split("-");
        const c = parseInt(coords[1]);
        const r = this.state.currColumns[c];

        // If column is full, do nothing
        if (r < 0) return;

        // Place piece in logic board
        this.state.board[r][c] = this.state.currPlayer;

        // Update DOM tile with the correct color
        const tile = document.getElementById(`${r}-${c}`);
        if (this.state.currPlayer === this.PLAYER_RED) {
            tile.classList.add("red-piece");
        } else {
            tile.classList.add("yellow-piece");
        }

        // Update the available row for this column
        this.state.currColumns[c] = r - 1;

        // Check if this move ended the game
        this.checkWinner();

        // If game continues, switch players
        if (!this.state.gameOver) {
            this.state.currPlayer = (this.state.currPlayer === this.PLAYER_RED) ? this.PLAYER_YELLOW : this.PLAYER_RED;
            this.updateStatus();
        }
    }

    /**
     * Checks if there's a winner or if the game is a draw.
     */
    checkWinner() {
        /**
         * Helper function to check 4 consecutive pieces starting from (r, c) 
         * in direction (dr, dc).
         */
        const checkLine = (r, c, dr, dc) => {
            const first = this.state.board[r][c];
            if (first === ' ') return false;

            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i;
                const nc = c + dc * i;
                if (nr < 0 || nr >= this.ROWS || nc < 0 || nc >= this.COLUMNS || this.state.board[nr][nc] !== first) {
                    return false;
                }
            }
            return true;
        };

        // Horizontal check
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLUMNS - 3; c++) {
                if (checkLine(r, c, 0, 1)) {
                    this.setWinner(r, c);
                    return;
                }
            }
        }

        // Vertical check
        for (let c = 0; c < this.COLUMNS; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                if (checkLine(r, c, 1, 0)) {
                    this.setWinner(r, c);
                    return;
                }
            }
        }

        // Anti-diagonal check (top-left to bottom-right)
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLUMNS - 3; c++) {
                if (checkLine(r, c, 1, 1)) {
                    this.setWinner(r, c);
                    return;
                }
            }
        }

        // Diagonal check (bottom-left to top-right)
        for (let r = 3; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLUMNS - 3; c++) {
                if (checkLine(r, c, -1, 1)) {
                    this.setWinner(r, c);
                    return;
                }
            }
        }

        // Check for draw
        if (this.state.currColumns.every(val => val < 0)) {
            this.setDraw();
        }
    }

    /**
     * Declares the winner and ends the game.
     */
    setWinner(r, c) {
        this.state.gameOver = true;
        const winnerDisplay = document.getElementById("winner");
        if (winnerDisplay) {
            const winner = this.state.board[r][c];
            winnerDisplay.innerText = winner === this.PLAYER_RED ? "Red Wins!" : "Yellow Wins!";
        }
    }

    /**
     * Declares a draw and ends the game.
     */
    setDraw() {
        this.state.gameOver = true;
        const winnerDisplay = document.getElementById("winner");
        if (winnerDisplay) {
            winnerDisplay.innerText = "Draw!";
        }
    }

    /**
     * Resets the game to its initial state.
     */
    resetGame() {
        // Reset state variables
        this.state.gameOver = false;
        this.state.currPlayer = this.PLAYER_RED;
        this.state.currColumns = Array(this.COLUMNS).fill(this.ROWS - 1);

        // Reset logical board
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLUMNS; c++) {
                this.state.board[r][c] = ' ';
            }
        }

        // Clear piece classes from DOM tiles
        const tiles = document.getElementsByClassName("tile");
        Array.from(tiles).forEach(tile => {
            tile.classList.remove("red-piece", "yellow-piece");
        });

        this.updateStatus();
    }
}

// Initialize the game when the window has finished loading
window.onload = () => {
    new ConnectFourGame();
};
