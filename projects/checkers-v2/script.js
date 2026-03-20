/**
 * Checkers Game - American Checkers (English Draughts)
 * Full implementation with mandatory captures, multi-jump, and king promotion
 */

// ==================== Game State ====================
const gameState = {
    board: [],
    currentPlayer: 'black',
    selectedPiece: null,
    gameOver: false,
    isMultiJumping: false
};

// ==================== DOM References ====================
const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turnIndicator');
const resetBtn = document.getElementById('resetBtn');
const blackCountElement = document.getElementById('blackCount');
const redCountElement = document.getElementById('redCount');

// ==================== Board Initialization ====================

/**
 * Initialize the 8x8 board with alternating dark/light squares
 */
function initializeBoard() {
    boardElement.innerHTML = '';
    gameState.board = [];

    for (let row = 0; row < 8; row++) {
        gameState.board[row] = [];
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            const isDarkSquare = (row + col) % 2 === 1;
            cell.classList.add(isDarkSquare ? 'black' : 'white');

            cell.dataset.row = row;
            cell.dataset.col = col;

            gameState.board[row][col] = null;
            boardElement.appendChild(cell);
        }
    }
}

// ==================== Piece Placement ====================

/**
 * Place initial pieces on the board
 * Black pieces: rows 0-2, Red pieces: rows 5-7 (dark squares only)
 */
function placePieces() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isDarkSquare = (row + col) % 2 === 1;
            if (isDarkSquare) {
                if (row <= 2) {
                    gameState.board[row][col] = { player: 'black', isKing: false };
                } else if (row >= 5) {
                    gameState.board[row][col] = { player: 'red', isKing: false };
                }
            }
        }
    }
}

// ==================== Piece Rendering ====================

/**
 * Render all pieces on the board from game state
 */
function renderPieces() {
    const existingPieces = document.querySelectorAll('.piece');
    existingPieces.forEach(piece => piece.remove());

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece) {
                const cellIndex = row * 8 + col;
                const cell = boardElement.children[cellIndex];

                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                pieceElement.classList.add(piece.player === 'red' ? 'red' : 'black-piece');

                if (piece.isKing) {
                    pieceElement.classList.add('king');
                }

                if (piece.player === gameState.currentPlayer && !gameState.gameOver) {
                    pieceElement.classList.add('current-turn');
                }

                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;

                cell.appendChild(pieceElement);
            }
        }
    }

    addPieceClickHandlers();
}

// ==================== Turn Indicator ====================

/**
 * Update the turn indicator text
 */
function updateTurnIndicator() {
    const playerName = gameState.currentPlayer.charAt(0).toUpperCase() +
                       gameState.currentPlayer.slice(1);
    turnIndicator.textContent = `Turn: ${playerName}`;
}

/**
 * Update the piece count display for both players
 */
function updatePieceCounts() {
    const blackPieces = countPieces('black');
    const redPieces = countPieces('red');

    if (blackCountElement) {
        blackCountElement.textContent = `Black: ${blackPieces}`;
    }
    if (redCountElement) {
        redCountElement.textContent = `Red: ${redPieces}`;
    }
}

// ==================== Movement System ====================

/**
 * Get regular (non-capture) moves for a piece
 * @param {number} row - Row position
 * @param {number} col - Column position
 * @returns {Array} Array of {row, col} positions
 */
function getRegularMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    const validMoves = [];
    let directions;

    if (piece.isKing) {
        directions = [-1, 1];
    } else {
        directions = [piece.player === 'black' ? 1 : -1];
    }

    for (const direction of directions) {
        const newRow = row + direction;
        for (const newCol of [col - 1, col + 1]) {
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                if (gameState.board[newRow][newCol] === null) {
                    validMoves.push({ row: newRow, col: newCol });
                }
            }
        }
    }

    return validMoves;
}

/**
 * Get capture moves for a piece
 * @param {number} row - Row position
 * @param {number} col - Column position
 * @returns {Array} Array of {row, col, capturedRow, capturedCol}
 */
function getCaptureMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    const captureMoves = [];
    let directions;

    if (piece.isKing) {
        directions = [-1, 1];
    } else {
        directions = [piece.player === 'black' ? 1 : -1];
    }

    for (const direction of directions) {
        const adjacentRow = row + direction;
        const landingRow = row + (direction * 2);

        for (const adjacentCol of [col - 1, col + 1]) {
            const landingCol = adjacentCol + (adjacentCol - col);

            if (adjacentRow >= 0 && adjacentRow <= 7 &&
                adjacentCol >= 0 && adjacentCol <= 7 &&
                landingRow >= 0 && landingRow <= 7 &&
                landingCol >= 0 && landingCol <= 7) {

                const adjacentPiece = gameState.board[adjacentRow][adjacentCol];
                const landingSquare = gameState.board[landingRow][landingCol];

                if (adjacentPiece &&
                    adjacentPiece.player !== piece.player &&
                    landingSquare === null) {
                    captureMoves.push({
                        row: landingRow,
                        col: landingCol,
                        capturedRow: adjacentRow,
                        capturedCol: adjacentCol
                    });
                }
            }
        }
    }

    return captureMoves;
}

/**
 * Check if a player has any capture moves available
 * @param {string} player - 'black' or 'red'
 * @returns {boolean}
 */
function playerHasCaptures(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) {
                if (getCaptureMoves(row, col).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Check if a specific piece can capture
 * @param {number} row - Row position
 * @param {number} col - Column position
 * @returns {boolean}
 */
function pieceCanCapture(row, col) {
    return getCaptureMoves(row, col).length > 0;
}

/**
 * Get valid moves enforcing mandatory capture rule
 * @param {number} row - Row position
 * @param {number} col - Column position
 * @returns {Array}
 */
function getValidMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    if (gameState.isMultiJumping) {
        if (gameState.selectedPiece &&
            (row !== gameState.selectedPiece.row || col !== gameState.selectedPiece.col)) {
            return [];
        }
        return getCaptureMoves(row, col);
    }

    if (playerHasCaptures(gameState.currentPlayer)) {
        return getCaptureMoves(row, col);
    }

    return getRegularMoves(row, col);
}

// ==================== Highlighting ====================

/**
 * Clear all highlights from the board
 */
function clearHighlights() {
    document.querySelectorAll('.cell.highlight, .cell.capture-highlight').forEach(cell => {
        cell.classList.remove('highlight', 'capture-highlight');
    });
    document.querySelectorAll('.piece.must-capture').forEach(piece => {
        piece.classList.remove('must-capture');
    });
}

/**
 * Clear piece selection
 */
function clearSelection() {
    const selectedPiece = document.querySelector('.piece.selected');
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
    }
    clearHighlights();
    gameState.selectedPiece = null;
}

/**
 * Highlight valid moves for the selected piece
 * @param {Array} validMoves - Array of valid move positions
 */
function highlightValidMoves(validMoves) {
    for (const move of validMoves) {
        const cellIndex = move.row * 8 + move.col;
        const cell = boardElement.children[cellIndex];
        if (move.capturedRow !== undefined) {
            cell.classList.add('capture-highlight');
        } else {
            cell.classList.add('highlight');
        }
    }
}

/**
 * Highlight pieces that must capture (mandatory capture visual feedback)
 */
function highlightMustCapturePieces() {
    if (!playerHasCaptures(gameState.currentPlayer)) return;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === gameState.currentPlayer && pieceCanCapture(row, col)) {
                const cellIndex = row * 8 + col;
                const cell = boardElement.children[cellIndex];
                const pieceElement = cell.querySelector('.piece');
                if (pieceElement) {
                    pieceElement.classList.add('must-capture');
                }
            }
        }
    }
}

// ==================== Selection ====================

/**
 * Select a piece and show its valid moves
 * @param {number} row - Row position
 * @param {number} col - Column position
 */
function selectPiece(row, col) {
    clearSelection();

    const piece = gameState.board[row][col];
    if (!piece || piece.player !== gameState.currentPlayer) return;

    if (gameState.isMultiJumping) {
        if (gameState.selectedPiece &&
            (row !== gameState.selectedPiece.row || col !== gameState.selectedPiece.col)) {
            row = gameState.selectedPiece.row;
            col = gameState.selectedPiece.col;
        }
    } else {
        if (playerHasCaptures(gameState.currentPlayer) && !pieceCanCapture(row, col)) {
            highlightMustCapturePieces();
            return;
        }
    }

    gameState.selectedPiece = { row, col };

    const cellIndex = row * 8 + col;
    const cell = boardElement.children[cellIndex];
    const pieceElement = cell.querySelector('.piece');
    if (pieceElement) {
        pieceElement.classList.add('selected');
    }

    const validMoves = getValidMoves(row, col);
    highlightValidMoves(validMoves);
}

// ==================== Move Execution ====================

/**
 * Check if a piece should be promoted to king
 * @param {number} row - Row position
 * @param {number} col - Column position
 * @returns {boolean} True if promoted
 */
function checkPromotion(row, col) {
    const piece = gameState.board[row][col];
    if (!piece || piece.isKing) return false;

    if (piece.player === 'black' && row === 7) {
        piece.isKing = true;
        return true;
    }
    if (piece.player === 'red' && row === 0) {
        piece.isKing = true;
        return true;
    }

    return false;
}

/**
 * Execute a move from one position to another
 * Handles regular moves, captures, multi-jump, and promotion
 * @param {number} fromRow - Starting row
 * @param {number} fromCol - Starting column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {number|null} capturedRow - Row of captured piece
 * @param {number|null} capturedCol - Column of captured piece
 */
function executeMove(fromRow, fromCol, toRow, toCol, capturedRow = null, capturedCol = null) {
    const piece = gameState.board[fromRow][fromCol];
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;

    if (capturedRow !== null && capturedCol !== null) {
        gameState.board[capturedRow][capturedCol] = null;
    }

    // Promotion ends turn immediately — no further captures as new king
    const wasPromoted = checkPromotion(toRow, toCol);

    if (!wasPromoted && capturedRow !== null && capturedCol !== null) {
        const furtherCaptures = getCaptureMoves(toRow, toCol);

        if (furtherCaptures.length > 0) {
            gameState.isMultiJumping = true;
            gameState.selectedPiece = { row: toRow, col: toCol };

            renderPieces();
            updatePieceCounts();

            const cellIndex = toRow * 8 + toCol;
            const cell = boardElement.children[cellIndex];
            const pieceElement = cell.querySelector('.piece');
            if (pieceElement) {
                pieceElement.classList.add('selected');
            }

            highlightValidMoves(furtherCaptures);
            return;
        }
    }

    gameState.isMultiJumping = false;
    clearSelection();

    gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'red' : 'black';

    renderPieces();
    updateTurnIndicator();
    updatePieceCounts();
    checkWinCondition();

    if (!gameState.gameOver && playerHasCaptures(gameState.currentPlayer)) {
        highlightMustCapturePieces();
    }
}

// ==================== Click Handlers ====================

/**
 * Handle click on a piece
 * @param {Event} event - Click event
 */
function handlePieceClick(event) {
    event.stopPropagation();
    if (gameState.gameOver) return;

    const pieceElement = event.target;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = gameState.board[row][col];

    if (gameState.isMultiJumping) {
        if (gameState.selectedPiece &&
            row === gameState.selectedPiece.row &&
            col === gameState.selectedPiece.col) {
            selectPiece(row, col);
        }
        return;
    }

    if (piece && piece.player === gameState.currentPlayer) {
        selectPiece(row, col);
    }
}

/**
 * Handle click on a cell (for executing moves or deselecting)
 * @param {Event} event - Click event
 */
function handleCellClick(event) {
    if (gameState.gameOver) return;

    const cell = event.target.closest('.cell');
    if (!cell) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const isHighlighted = cell.classList.contains('highlight');
    const isCaptureHighlighted = cell.classList.contains('capture-highlight');

    if (gameState.selectedPiece && (isHighlighted || isCaptureHighlighted)) {
        let capturedRow = null;
        let capturedCol = null;

        if (isCaptureHighlighted) {
            capturedRow = (gameState.selectedPiece.row + row) / 2;
            capturedCol = (gameState.selectedPiece.col + col) / 2;
        }

        executeMove(
            gameState.selectedPiece.row,
            gameState.selectedPiece.col,
            row, col,
            capturedRow, capturedCol
        );
    } else if (!gameState.isMultiJumping) {
        clearSelection();
        if (playerHasCaptures(gameState.currentPlayer)) {
            highlightMustCapturePieces();
        }
    }
}

/**
 * Add click handlers to all pieces
 */
function addPieceClickHandlers() {
    document.querySelectorAll('.piece').forEach(piece => {
        piece.addEventListener('click', handlePieceClick);
    });
}

// ==================== Win Condition System ====================

/**
 * Check if a player has any legal moves
 * @param {string} player - 'black' or 'red'
 * @returns {boolean}
 */
function playerHasLegalMoves(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) {
                if (getCaptureMoves(row, col).length > 0) return true;
                if (getRegularMoves(row, col).length > 0) return true;
            }
        }
    }
    return false;
}

/**
 * Count pieces for a player
 * @param {string} player - 'black' or 'red'
 * @returns {number}
 */
function countPieces(player) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) count++;
        }
    }
    return count;
}

/**
 * Check if the game has been won
 */
function checkWinCondition() {
    const blackPieces = countPieces('black');
    const redPieces = countPieces('red');

    if (blackPieces === 0) {
        displayWinner('red');
        return;
    }
    if (redPieces === 0) {
        displayWinner('black');
        return;
    }

    if (!playerHasLegalMoves(gameState.currentPlayer)) {
        const winner = gameState.currentPlayer === 'black' ? 'red' : 'black';
        displayWinner(winner);
    }
}

/**
 * Display the winner and end the game
 * @param {string} player - 'black' or 'red'
 */
function displayWinner(player) {
    gameState.gameOver = true;

    const winMessage = document.createElement('div');
    winMessage.classList.add('win-message');
    winMessage.id = 'winMessage';

    const playerName = player.charAt(0).toUpperCase() + player.slice(1);
    winMessage.textContent = `${playerName} Wins!`;

    boardElement.appendChild(winMessage);
    turnIndicator.textContent = `Winner: ${playerName}`;

    renderPieces();
}

/**
 * Clear the win message
 */
function clearWinMessage() {
    const winMessage = document.getElementById('winMessage');
    if (winMessage) winMessage.remove();
}

// ==================== Reset ====================

/**
 * Reset the game to initial state
 */
function resetGame() {
    clearSelection();
    clearWinMessage();

    gameState.board = [];
    gameState.currentPlayer = 'black';
    gameState.selectedPiece = null;
    gameState.gameOver = false;
    gameState.isMultiJumping = false;

    initializeBoard();
    placePieces();
    renderPieces();
    updateTurnIndicator();
    updatePieceCounts();
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', function() {
    initializeBoard();
    placePieces();
    renderPieces();
    updateTurnIndicator();
    updatePieceCounts();
    boardElement.addEventListener('click', handleCellClick);
    resetBtn.addEventListener('click', resetGame);
});