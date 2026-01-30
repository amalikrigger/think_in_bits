const board = document.getElementById('board');
const turnIndicator = document.getElementById('turnIndicator');
const resetBtn = document.getElementById('resetBtn');

let selectedPiece = null;
let turn = 'red';
let mustContinueJump = false;

// Sounds
const moveSound = new Audio('move.mp3');
const jumpSound = new Audio('jump.mp3');
const kingSound = new Audio('king.mp3');
const winSound = new Audio('win.mp3');

// Create board and pieces
function createBoard() {
    board.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', (row + col) % 2 === 0 ? 'white' : 'black');
            cell.dataset.row = row;
            cell.dataset.col = col;

            if ((row + col) % 2 !== 0) {
                if (row < 3) addPiece(cell, 'black');
                if (row > 4) addPiece(cell, 'red');
            }

            cell.addEventListener('click', () => handleCellClick(cell));
            board.appendChild(cell);
        }
    }
    updateTurnIndicator();
    updatePieceGlow();
}

function addPiece(cell, color) {
    const piece = document.createElement('div');
    piece.classList.add('piece', color === 'red' ? 'red' : 'black-piece');
    piece.dataset.color = color;

    piece.addEventListener('mouseenter', () => {
        piece.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        piece.style.transform = 'scale(1.2)'; // slightly smaller scale
        piece.style.zIndex = 1000;
        piece.style.boxShadow = '0 0 12px rgba(0,0,0,0.5)'; // subtle shadow only
    });
    piece.addEventListener('mouseleave', () => {
        piece.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        piece.style.transform = 'scale(1)';
        piece.style.zIndex = '';
        piece.style.boxShadow = '';
    });

    cell.appendChild(piece);
}

function handleCellClick(cell) {
    if (cell.firstChild && cell.firstChild.dataset.color === turn) {
        if (hasValidMoves(cell.firstChild)) {
            selectedPiece = cell.firstChild;
            highlightValidMoves(selectedPiece);
        }
        return;
    }
    if (!selectedPiece) return;

    const piece = selectedPiece;
    const fromRow = parseInt(piece.parentElement.dataset.row);
    const fromCol = parseInt(piece.parentElement.dataset.col);
    const toRow = parseInt(cell.dataset.row);
    const toCol = parseInt(cell.dataset.col);

    const moveInfo = getMoveInfo(piece, fromRow, fromCol, toRow, toCol);
    if (!moveInfo) return;

    movePiece(piece, cell, moveInfo);
}

function movePiece(piece, targetCell, moveInfo) {
    const boardRect = board.getBoundingClientRect();
    const pieceRect = piece.getBoundingClientRect();
    const cellRect = targetCell.getBoundingClientRect();
    const dx = cellRect.left - pieceRect.left;
    const dy = cellRect.top - pieceRect.top;

    // temporarily make piece absolute so slide doesn't cut
    const clone = piece.cloneNode(true);
    piece.style.visibility = 'hidden';
    clone.style.position = 'absolute';
    clone.style.left = `${pieceRect.left - boardRect.left}px`;
    clone.style.top = `${pieceRect.top - boardRect.top}px`;
    clone.style.transform = `translate(0,0)`;
    clone.style.transition = 'transform 0.3s ease';
    clone.style.zIndex = 2000;
    board.appendChild(clone);

    requestAnimationFrame(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    clone.addEventListener('transitionend', () => {
        clone.remove();
        piece.style.visibility = '';
        targetCell.appendChild(piece);

        if (moveInfo.captured) moveInfo.captured.parentElement.removeChild(moveInfo.captured);
        if (!moveInfo.captured) moveSound.play();
        else jumpSound.play();

        checkKing(piece, parseInt(targetCell.dataset.row));

        if (moveInfo.mustContinueJump) {
            mustContinueJump = true;
            selectedPiece = piece;
            removeHighlight();
            highlightValidMoves(piece);
        } else {
            mustContinueJump = false;
            selectedPiece = null;
            turn = turn === 'red' ? 'black' : 'red';
            updateTurnIndicator();
            removeHighlight();
            updatePieceGlow();
        }

        checkWin();
    });
}

function hasValidMoves(piece) {
    const fromRow = parseInt(piece.parentElement.dataset.row);
    const fromCol = parseInt(piece.parentElement.dataset.col);
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (getMoveInfo(piece, fromRow, fromCol, r, c)) return true;
    return false;
}

function getMoveInfo(piece, fromRow, fromCol, toRow, toCol) {
    const dx = toCol - fromCol;
    const dy = toRow - fromRow;
    const targetCell = board.querySelector(`.cell[data-row='${toRow}'][data-col='${toCol}']`);
    if (!targetCell || targetCell.firstChild) return null;

    const isKing = piece.classList.contains('king');
    const dir = piece.dataset.color === 'red' ? -1 : 1;

    if (Math.abs(dx) === 1 && (dy === dir || (isKing && Math.abs(dy) === 1)) && !mustContinueJump) {
        return { captured: null, mustContinueJump: false };
    }

    if (Math.abs(dx) === 2 && (dy === 2 * dir || (isKing && Math.abs(dy) === 2))) {
        const midRow = fromRow + dy / 2;
        const midCol = fromCol + dx / 2;
        const midCell = board.querySelector(`.cell[data-row='${midRow}'][data-col='${midCol}']`);
        if (midCell && midCell.firstChild && midCell.firstChild.dataset.color !== turn) {
            const tempPiece = document.createElement('div');
            tempPiece.className = piece.className;
            tempPiece.dataset.color = piece.dataset.color;
            const targetTemp = board.querySelector(`.cell[data-row='${toRow}'][data-col='${toCol}']`);
            targetTemp.appendChild(tempPiece);
            const moreJumps = canJump(tempPiece, toRow, toCol);
            targetTemp.removeChild(tempPiece);
            return { captured: midCell.firstChild, mustContinueJump: moreJumps };
        }
    }

    return null;
}

function canJump(piece, row, col) {
    const isKing = piece.classList.contains('king');
    const directions = [[-2,-2],[-2,2],[2,-2],[2,2]];
    const dir = piece.dataset.color === 'red' ? -1 : 1;
    for (const [dy, dx] of directions) {
        if (!isKing && dy !== 2*dir) continue;
        const toRow = row + dy;
        const toCol = col + dx;
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) continue;
        const targetCell = board.querySelector(`.cell[data-row='${toRow}'][data-col='${toCol}']`);
        const midCell = board.querySelector(`.cell[data-row='${row + dy/2}'][data-col='${col + dx/2}']`);
        if (targetCell && !targetCell.firstChild && midCell && midCell.firstChild && midCell.firstChild.dataset.color !== turn) return true;
    }
    return false;
}

function checkKing(piece, row) {
    if (piece.dataset.color === 'red' && row === 0) piece.classList.add('king');
    if (piece.dataset.color === 'black' && row === 7) piece.classList.add('king');
    if (piece.classList.contains('king') && !piece.kingPlayed) {
        kingSound.play();
        piece.kingPlayed = true;
    }
}

function highlightValidMoves(piece) {
    removeHighlight();
    const fromRow = parseInt(piece.parentElement.dataset.row);
    const fromCol = parseInt(piece.parentElement.dataset.col);
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (getMoveInfo(piece, fromRow, fromCol, r, c)) {
                const cell = board.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                cell.classList.add('highlight');
            }
}

function removeHighlight() {
    document.querySelectorAll('.highlight').forEach(c => c.classList.remove('highlight'));
}

function updateTurnIndicator() {
    turnIndicator.textContent = `Turn: ${turn === 'red' ? 'Red' : 'Black'}`;
    turnIndicator.style.color = turn;
}

function updatePieceGlow() {
    document.querySelectorAll('.piece').forEach(p => p.classList.remove('current-turn'));
    document.querySelectorAll(`.piece[data-color='${turn}']`).forEach(p => p.classList.add('current-turn'));
}

function checkWin() {
    const redPieces = document.querySelectorAll('.piece[data-color="red"]').length;
    const blackPieces = document.querySelectorAll('.piece[data-color="black"]').length;
    if (redPieces === 0) announceWin('Black');
    if (blackPieces === 0) announceWin('Red');
}

function announceWin(winner) {
    const msg = document.createElement('div');
    msg.classList.add('win-message');
    msg.textContent = `${winner} Wins! 🎉`;
    board.appendChild(msg);
    winSound.play();
}

resetBtn.addEventListener('click', () => {
    selectedPiece = null;
    mustContinueJump = false;
    turn = 'red';
    createBoard();
});

createBoard();

