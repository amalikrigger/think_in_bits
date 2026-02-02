/**
 * Checkers Game - Board Setup & Piece Placement
 * Task 1.1: Initial board generation and piece positioning
 */

// ==================== Game State ====================
const gameState = {
    board: [],           // 8x8 2D array
    currentPlayer: 'black', // black moves first per American rules
    selectedPiece: null,
    gameOver: false,
    isMultiJumping: false  // True when a piece must continue capturing
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
 * Dark squares occur where (row + col) % 2 === 1
 */
function initializeBoard() {
    // Clear the board element
    boardElement.innerHTML = '';
    
    // Initialize the board array
    gameState.board = [];
    
    // Create 8x8 grid
    for (let row = 0; row < 8; row++) {
        gameState.board[row] = [];
        
        for (let col = 0; col < 8; col++) {
            // Create cell element
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            // Determine if dark or light square
            // Dark squares: (row + col) % 2 === 1
            const isDarkSquare = (row + col) % 2 === 1;
            cell.classList.add(isDarkSquare ? 'black' : 'white');
            
            // Store position data on the cell
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Initialize board array cell as null (empty)
            gameState.board[row][col] = null;
            
            // Append to board
            boardElement.appendChild(cell);
        }
    }
}

// ==================== Piece Placement ====================
/**
 * Place initial pieces on the board
 * Black pieces: rows 0-2 (top, dark squares only)
 * Red pieces: rows 5-7 (bottom, dark squares only)
 */
function placePieces() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const isDarkSquare = (row + col) % 2 === 1;
            
            // Only place pieces on dark squares
            if (isDarkSquare) {
                // Black pieces on rows 0-2 (top)
                if (row >= 0 && row <= 2) {
                    gameState.board[row][col] = {
                        player: 'black',
                        isKing: false
                    };
                }
                // Red pieces on rows 5-7 (bottom)
                else if (row >= 5 && row <= 7) {
                    gameState.board[row][col] = {
                        player: 'red',
                        isKing: false
                    };
                }
            }
        }
    }
}

// ==================== Piece Rendering ====================
/**
 * Render all pieces on the board based on the board array
 * Clears existing pieces and creates new DOM elements
 */
function renderPieces() {
    // Remove all existing pieces from DOM
    const existingPieces = document.querySelectorAll('.piece');
    existingPieces.forEach(piece => piece.remove());
    
    // Iterate through board array and create piece elements
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            
            if (piece) {
                // Find the cell at this position
                const cellIndex = row * 8 + col;
                const cell = boardElement.children[cellIndex];
                
                // Create piece element
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                
                // Add player-specific class
                if (piece.player === 'red') {
                    pieceElement.classList.add('red');
                } else {
                    pieceElement.classList.add('black-piece');
                }
                
                // Add king class if applicable
                if (piece.isKing) {
                    pieceElement.classList.add('king');
                }
                
                // Add current-turn glow to current player's pieces
                if (piece.player === gameState.currentPlayer && !gameState.gameOver) {
                    pieceElement.classList.add('current-turn');
                }
                
                // Store position data on the piece
                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;
                
                // Append piece to cell
                cell.appendChild(pieceElement);
            }
        }
    }
    
    // Add click handlers to all pieces
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
 * Counts pieces from the board array and updates the DOM
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
 * Get regular (non-capture) moves for a piece at the given position
 * Kings can move in all 4 diagonal directions, regular pieces move forward only
 * @param {number} row - Row position of the piece
 * @param {number} col - Column position of the piece
 * @returns {Array} Array of valid move positions [{row, col}, ...]
 */
function getRegularMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];
    
    const validMoves = [];
    
    // Determine move directions based on piece type
    // Kings can move in all 4 diagonal directions
    // Regular pieces: Black moves DOWN (row + 1), Red moves UP (row - 1)
    let directions;
    if (piece.isKing) {
        directions = [-1, 1]; // Both forward and backward
    } else {
        directions = [piece.player === 'black' ? 1 : -1]; // Forward only
    }
    
    // Check diagonal directions
    for (const direction of directions) {
        const newRow = row + direction;
        const possibleCols = [col - 1, col + 1];
        
        for (const newCol of possibleCols) {
            // Check bounds (0-7 for both row and col)
            if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
                // Check if destination is empty
                if (gameState.board[newRow][newCol] === null) {
                    validMoves.push({ row: newRow, col: newCol });
                }
            }
        }
    }
    
    return validMoves;
}

/**
 * Get capture moves for a piece at the given position
 * Kings can capture in all 4 diagonal directions, regular pieces capture forward only
 * @param {number} row - Row position of the piece
 * @param {number} col - Column position of the piece
 * @returns {Array} Array of capture moves [{row, col, capturedRow, capturedCol}, ...]
 */
function getCaptureMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];
    
    const captureMoves = [];
    
    // Determine move directions based on piece type
    // Kings can capture in all 4 diagonal directions
    // Regular pieces: Black captures DOWN (row + 1), Red captures UP (row - 1)
    let directions;
    if (piece.isKing) {
        directions = [-1, 1]; // Both forward and backward
    } else {
        directions = [piece.player === 'black' ? 1 : -1]; // Forward only
    }
    
    // Check diagonal directions for captures
    for (const direction of directions) {
        const adjacentRow = row + direction;
        const landingRow = row + (direction * 2);
        const possibleCols = [col - 1, col + 1];
        
        for (const adjacentCol of possibleCols) {
            const landingCol = adjacentCol + (adjacentCol - col); // Continue same diagonal
            
            // Check bounds for both adjacent and landing squares
            if (adjacentRow >= 0 && adjacentRow <= 7 && 
                adjacentCol >= 0 && adjacentCol <= 7 &&
                landingRow >= 0 && landingRow <= 7 && 
                landingCol >= 0 && landingCol <= 7) {
                
                const adjacentPiece = gameState.board[adjacentRow][adjacentCol];
                const landingSquare = gameState.board[landingRow][landingCol];
                
                // Check: opponent piece at adjacent AND empty at landing
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
 * Check if a player has any capture moves available globally
 * @param {string} player - 'black' or 'red'
 * @returns {boolean} True if any piece can capture
 */
function playerHasCaptures(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) {
                const captures = getCaptureMoves(row, col);
                if (captures.length > 0) {
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
 * @returns {boolean} True if this piece has captures available
 */
function pieceCanCapture(row, col) {
    return getCaptureMoves(row, col).length > 0;
}

/**
 * Get valid moves for a piece at the given position
 * Enforces mandatory capture rule: if captures are available, only return captures
 * @param {number} row - Row position of the piece
 * @param {number} col - Column position of the piece
 * @returns {Array} Array of valid move positions [{row, col}, ...] or captures [{row, col, capturedRow, capturedCol}, ...]
 */
function getValidMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];
    
    // During multi-jump, only the jumping piece can move and only captures allowed
    if (gameState.isMultiJumping) {
        // Only the selected piece can continue
        if (gameState.selectedPiece && 
            (row !== gameState.selectedPiece.row || col !== gameState.selectedPiece.col)) {
            return [];
        }
        return getCaptureMoves(row, col);
    }
    
    // Check if current player has any captures available (mandatory capture rule)
    if (playerHasCaptures(gameState.currentPlayer)) {
        // Return only capture moves for this piece
        return getCaptureMoves(row, col);
    }
    
    // No captures available, return regular moves
    return getRegularMoves(row, col);
}

/**
 * Clear all highlights from the board
 */
function clearHighlights() {
    const highlightedCells = document.querySelectorAll('.cell.highlight, .cell.capture-highlight');
    highlightedCells.forEach(cell => {
        cell.classList.remove('highlight');
        cell.classList.remove('capture-highlight');
    });
    
    // Also clear must-capture indicators from pieces
    const mustCapturePieces = document.querySelectorAll('.piece.must-capture');
    mustCapturePieces.forEach(piece => piece.classList.remove('must-capture'));
}

/**
 * Clear piece selection
 */
function clearSelection() {
    // Remove selected class from any selected piece
    const selectedPiece = document.querySelector('.piece.selected');
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
    }
    
    // Clear highlights
    clearHighlights();
    
    // Reset selected piece in game state
    gameState.selectedPiece = null;
}

/**
 * Highlight valid moves for the selected piece
 * Uses different styling for capture moves vs regular moves
 * @param {Array} validMoves - Array of valid move positions
 */
function highlightValidMoves(validMoves) {
    for (const move of validMoves) {
        const cellIndex = move.row * 8 + move.col;
        const cell = boardElement.children[cellIndex];
        
        // Check if this is a capture move (has capturedRow property)
        if (move.capturedRow !== undefined) {
            cell.classList.add('capture-highlight');
        } else {
            cell.classList.add('highlight');
        }
    }
}

/**
 * Highlight pieces that must capture (visual feedback for mandatory capture)
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

/**
 * Select a piece and show its valid moves
 * Enforces selection restrictions for mandatory captures and multi-jumps
 * @param {number} row - Row position of the piece
 * @param {number} col - Column position of the piece
 */
function selectPiece(row, col) {
    // Clear any previous selection (but preserve must-capture indicators during multi-jump)
    clearSelection();
    
    const piece = gameState.board[row][col];
    if (!piece || piece.player !== gameState.currentPlayer) return;
    
    // During multi-jump, only the jumping piece can be selected
    if (gameState.isMultiJumping) {
        if (gameState.selectedPiece && 
            (row !== gameState.selectedPiece.row || col !== gameState.selectedPiece.col)) {
            // Re-select the multi-jumping piece instead
            row = gameState.selectedPiece.row;
            col = gameState.selectedPiece.col;
        }
    } else {
        // If captures are available globally, only allow selecting pieces that can capture
        if (playerHasCaptures(gameState.currentPlayer) && !pieceCanCapture(row, col)) {
            // Show visual feedback - highlight pieces that can capture
            highlightMustCapturePieces();
            return; // Don't select this piece
        }
    }
    
    // Set selected piece in game state
    gameState.selectedPiece = { row, col };
    
    // Add visual indicator to the piece element
    const cellIndex = row * 8 + col;
    const cell = boardElement.children[cellIndex];
    const pieceElement = cell.querySelector('.piece');
    if (pieceElement) {
        pieceElement.classList.add('selected');
    }
    
    // Get and highlight valid moves
    const validMoves = getValidMoves(row, col);
    highlightValidMoves(validMoves);
}

/**
 * Check if a piece should be promoted to king
 * Black pieces promote on row 7, red pieces promote on row 0
 * @param {number} row - Row position of the piece
 * @param {number} col - Column position of the piece
 * @returns {boolean} True if the piece was promoted
 */
function checkPromotion(row, col) {
    const piece = gameState.board[row][col];
    if (!piece || piece.isKing) return false;
    
    // Black pieces promote on row 7 (bottom)
    if (piece.player === 'black' && row === 7) {
        piece.isKing = true;
        return true;
    }
    
    // Red pieces promote on row 0 (top)
    if (piece.player === 'red' && row === 0) {
        piece.isKing = true;
        return true;
    }
    
    return false;
}

/**
 * Execute a move from one position to another
 * Handles both regular moves and captures with multi-jump detection
 * CRITICAL: Checks promotion BEFORE multi-jump - promotion ends turn immediately
 * @param {number} fromRow - Starting row
 * @param {number} fromCol - Starting column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {number|null} capturedRow - Row of captured piece (null for regular move)
 * @param {number|null} capturedCol - Column of captured piece (null for regular move)
 */
function executeMove(fromRow, fromCol, toRow, toCol, capturedRow = null, capturedCol = null) {
    // Move piece in board array
    const piece = gameState.board[fromRow][fromCol];
    gameState.board[toRow][toCol] = piece;
    gameState.board[fromRow][fromCol] = null;
    
    // Handle capture if this is a jump move
    if (capturedRow !== null && capturedCol !== null) {
        // Remove captured piece from board array
        gameState.board[capturedRow][capturedCol] = null;
    }
    
    // CRITICAL: Check promotion BEFORE multi-jump
    // If piece is promoted, turn ends immediately (no further captures as king)
    const wasPromoted = checkPromotion(toRow, toCol);
    
    // Check for multi-jump only if NOT promoted and this was a capture
    if (!wasPromoted && capturedRow !== null && capturedCol !== null) {
        // Check for multi-jump: can the same piece capture again?
        const furtherCaptures = getCaptureMoves(toRow, toCol);
        
        if (furtherCaptures.length > 0) {
            // Multi-jump in progress - keep the same piece selected
            gameState.isMultiJumping = true;
            gameState.selectedPiece = { row: toRow, col: toCol };
            
            // Re-render pieces
            renderPieces();
            
            // Re-select the piece and show only capture moves
            const cellIndex = toRow * 8 + toCol;
            const cell = boardElement.children[cellIndex];
            const pieceElement = cell.querySelector('.piece');
            if (pieceElement) {
                pieceElement.classList.add('selected');
            }
            
            // Highlight the available captures
            highlightValidMoves(furtherCaptures);
            
            return; // Don't switch turns yet
        }
    }
    
    // Clear multi-jump state
    gameState.isMultiJumping = false;
    
    // Clear selection and highlights
    clearSelection();
    
    // Switch turns
    gameState.currentPlayer = gameState.currentPlayer === 'black' ? 'red' : 'black';
    
    // Re-render pieces (updates DOM and current-turn glow)
    renderPieces();
    
    // Update turn indicator
    updateTurnIndicator();
    
    // Update piece counts display
    updatePieceCounts();
    
    // Check for win condition after turn switch
    checkWinCondition();
    
    // Show must-capture indicators if the new current player has mandatory captures
    if (!gameState.gameOver && playerHasCaptures(gameState.currentPlayer)) {
        highlightMustCapturePieces();
    }
}

/**
 * Handle click on a piece
 * @param {Event} event - Click event
 */
function handlePieceClick(event) {
    event.stopPropagation(); // Prevent board click from firing
    
    // Ignore clicks when game is over
    if (gameState.gameOver) return;
    
    const pieceElement = event.target;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    
    const piece = gameState.board[row][col];
    
    // During multi-jump, only allow interacting with the jumping piece
    if (gameState.isMultiJumping) {
        if (gameState.selectedPiece && 
            row === gameState.selectedPiece.row && 
            col === gameState.selectedPiece.col) {
            // Clicking on the jumping piece - show its capture moves again
            selectPiece(row, col);
        }
        // Ignore clicks on other pieces during multi-jump
        return;
    }
    
    // Only allow selecting current player's pieces
    if (piece && piece.player === gameState.currentPlayer) {
        selectPiece(row, col);
    }
}

/**
 * Handle click on a cell (for executing moves or deselecting)
 * @param {Event} event - Click event
 */
function handleCellClick(event) {
    // Ignore clicks when game is over
    if (gameState.gameOver) return;
    
    const cell = event.target.closest('.cell');
    if (!cell) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    // Check if this cell is a valid move destination
    const isHighlighted = cell.classList.contains('highlight');
    const isCaptureHighlighted = cell.classList.contains('capture-highlight');
    
    // If a piece is selected and this cell is highlighted (valid move)
    if (gameState.selectedPiece && (isHighlighted || isCaptureHighlighted)) {
        
        // Determine if this is a capture move by finding the captured piece position
        let capturedRow = null;
        let capturedCol = null;
        
        if (isCaptureHighlighted) {
            // This is a capture move - calculate the captured piece position
            // The captured piece is exactly between the start and end positions
            capturedRow = (gameState.selectedPiece.row + row) / 2;
            capturedCol = (gameState.selectedPiece.col + col) / 2;
        }
        
        executeMove(
            gameState.selectedPiece.row,
            gameState.selectedPiece.col,
            row,
            col,
            capturedRow,
            capturedCol
        );
    } else if (!gameState.isMultiJumping) {
        // Clicked on non-highlighted cell - deselect (only if not in multi-jump)
        clearSelection();
        
        // Re-show must-capture indicators if applicable
        if (playerHasCaptures(gameState.currentPlayer)) {
            highlightMustCapturePieces();
        }
    }
    // If in multi-jump, don't allow deselecting - the jumping piece must continue
}

/**
 * Add click handlers to all pieces
 */
function addPieceClickHandlers() {
    const pieces = document.querySelectorAll('.piece');
    pieces.forEach(piece => {
        piece.addEventListener('click', handlePieceClick);
    });
}

/**
 * Add click handler to the board for cell clicks
 */
function addBoardClickHandler() {
    boardElement.addEventListener('click', handleCellClick);
}

// ==================== Win Condition System ====================

/**
 * Check if a player has any legal moves (regular or capture)
 * @param {string} player - 'black' or 'red'
 * @returns {boolean} True if player has at least one legal move
 */
function playerHasLegalMoves(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) {
                // Check for any captures
                if (getCaptureMoves(row, col).length > 0) {
                    return true;
                }
                // Check for any regular moves
                if (getRegularMoves(row, col).length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Count pieces for a player
 * @param {string} player - 'black' or 'red'
 * @returns {number} Number of pieces the player has
 */
function countPieces(player) {
    let count = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.player === player) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Check if the game has been won
 * Called after every turn switch
 */
function checkWinCondition() {
    const blackPieces = countPieces('black');
    const redPieces = countPieces('red');
    
    // Win by capture: opponent has 0 pieces
    if (blackPieces === 0) {
        displayWinner('red');
        return;
    }
    if (redPieces === 0) {
        displayWinner('black');
        return;
    }
    
    // Win by immobilization: current player has pieces but no legal moves
    if (!playerHasLegalMoves(gameState.currentPlayer)) {
        // Current player has no moves, other player wins
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
    
    // Create win message element
    const winMessage = document.createElement('div');
    winMessage.classList.add('win-message');
    winMessage.id = 'winMessage';
    
    const playerName = player.charAt(0).toUpperCase() + player.slice(1);
    winMessage.textContent = `${playerName} Wins! 🎉`;
    
    // Add to board (board has position: relative, message uses position: absolute)
    boardElement.appendChild(winMessage);
    
    // Update turn indicator to show winner
    turnIndicator.textContent = `Winner: ${playerName}`;
    
    // Re-render to remove current-turn glow from pieces
    renderPieces();
}

/**
 * Clear the win message from the board
 */
function clearWinMessage() {
    const winMessage = document.getElementById('winMessage');
    if (winMessage) {
        winMessage.remove();
    }
}

// ==================== Reset Function ====================
/**
 * Reset the game to initial state
 */
function resetGame() {
    // Clear any selection and highlights
    clearSelection();
    
    // Clear win message if present
    clearWinMessage();
    
    // Reset game state
    gameState.board = [];
    gameState.currentPlayer = 'black';
    gameState.selectedPiece = null;
    gameState.gameOver = false;
    gameState.isMultiJumping = false;
    
    // Re-initialize board and pieces
    initializeBoard();
    placePieces();
    renderPieces();
    
    // Update turn indicator
    updateTurnIndicator();
    
    // Update piece counts display
    updatePieceCounts();
}

// ==================== Initialization ====================
/**
 * Initialize the game when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize board
    initializeBoard();
    
    // Place initial pieces
    placePieces();
    
    // Render pieces
    renderPieces();
    
    // Update turn indicator to show Black starts
    updateTurnIndicator();
    
    // Initialize piece counts display
    updatePieceCounts();
    
    // Add board click handler for cell clicks (move execution & deselection)
    addBoardClickHandler();
    
    // Wire reset button
    resetBtn.addEventListener('click', resetGame);
});
