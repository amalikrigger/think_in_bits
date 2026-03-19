(function() {
'use strict';

// --- Constants ---
const ROWS = 9;
const COLUMNS = 9;
const MATCH_SCORE = 30;
const GAME_TICK = 350;
const MAX_MOVES = 30;
const TARGET_SCORE = 3000;

const candies = ["Blue", "Orange", "Green", "Yellow", "Red", "Purple"];

const CANDY_SHAPES = {
    "Blue": "●",
    "Orange": "◆",
    "Green": "▲",
    "Yellow": "★",
    "Red": "♥",
    "Purple": "■"
};

// --- State ---
let board = [];       // board[r][c] = DOM <img> element
let candyData = [];   // candyData[r][c] = { color: string|null, special: "none"|"striped-h"|"striped-v"|"wrapped"|"bomb" }
let score = 0;
let currTile = null;
let otherTile = null;
let gameState = "idle";   // "idle" | "processing"
let cascadeLevel = 0;
let lastSwap = null;       // { r1, c1, r2, c2 } of last player swap
let pendingClearTiles = [];
let movesLeft = MAX_MOVES;
let selectedTile = null;

// =========================================================================
// DATA MODEL HELPERS
// =========================================================================

function getCandyAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return null;
    return candyData[r][c];
}

function setCandyAt(r, c, color, special) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return;
    candyData[r][c].color = color;
    candyData[r][c].special = special || "none";
    updateTileImage(r, c);
}

function updateTileImage(r, c) {
    let data = candyData[r][c];
    let tile = board[r][c];
    let altText = "";
    if (!data.color) {
        tile.src = "./images/blank.png";
        altText = "";
    } else {
        switch (data.special) {
            case "striped-h":
                tile.src = "./images/" + data.color + "-Striped-Horizontal.png";
                altText = data.color + " striped horizontal candy";
                break;
            case "striped-v":
                tile.src = "./images/" + data.color + "-Striped-Vertical.png";
                altText = data.color + " striped vertical candy";
                break;
            case "wrapped":
                tile.src = "./images/" + data.color + "-Wrapped.png";
                altText = data.color + " wrapped candy";
                break;
            case "bomb":
                tile.src = "./images/Choco.png";
                altText = "Color bomb candy";
                break;
            default:
                tile.src = "./images/" + data.color + ".png";
                altText = data.color + " candy";
                break;
        }
    }
    tile.alt = altText;
    tile.setAttribute("aria-label", altText);
    let shapeSpan = tile.nextElementSibling;
    if (shapeSpan && shapeSpan.classList.contains("candy-shape")) {
        shapeSpan.textContent = (data.color && CANDY_SHAPES[data.color]) ? CANDY_SHAPES[data.color] : "";
    }
}

function colorAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return null;
    return candyData[r][c].color;
}

function specialAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLUMNS) return "none";
    return candyData[r][c].special;
}

function randomCandy() {
    return candies[Math.floor(Math.random() * candies.length)];
}

function parseTileId(tile) {
    let parts = tile.id.split("-");
    return { r: parseInt(parts[0]), c: parseInt(parts[1]) };
}

// Quick data-only swap (no image update) — used for move validation checks
function swapDataOnly(r1, c1, r2, c2) {
    let tc = candyData[r1][c1].color;
    let ts = candyData[r1][c1].special;
    candyData[r1][c1].color = candyData[r2][c2].color;
    candyData[r1][c1].special = candyData[r2][c2].special;
    candyData[r2][c2].color = tc;
    candyData[r2][c2].special = ts;
}

// Full swap including image updates
function swapCandyData(r1, c1, r2, c2) {
    swapDataOnly(r1, c1, r2, c2);
    updateTileImage(r1, c1);
    updateTileImage(r2, c2);
}

// =========================================================================
// ANIMATION HELPERS
// =========================================================================

function markForCrush(r, c) {
    if (candyData[r][c].color === null && candyData[r][c].special === "none") return;
    candyData[r][c].color = null;
    candyData[r][c].special = "none";
    board[r][c].classList.add('crushing');
    pendingClearTiles.push({ r: r, c: c });
}

function applyVisualClear() {
    for (let i = 0; i < pendingClearTiles.length; i++) {
        let pos = pendingClearTiles[i];
        board[pos.r][pos.c].classList.remove('crushing');
        updateTileImage(pos.r, pos.c);
    }
    pendingClearTiles = [];
}

function addDroppingClass(tiles) {
    for (let i = 0; i < tiles.length; i++) {
        board[tiles[i].r][tiles[i].c].classList.add('dropping');
    }
}

function removeDroppingClass() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            board[r][c].classList.remove('dropping');
        }
    }
}

function showScorePopup(r, c, points) {
    let popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+' + points;
    let tile = board[r][c];
    let rect = tile.getBoundingClientRect();
    let boardRect = document.getElementById('board').getBoundingClientRect();
    popup.style.left = (rect.left - boardRect.left + rect.width / 2) + 'px';
    popup.style.top = (rect.top - boardRect.top) + 'px';
    document.getElementById('board').appendChild(popup);
    setTimeout(function() { popup.remove(); }, 600);
}

function showMatchScorePopups(matches) {
    let points = MATCH_SCORE * (cascadeLevel + 1);
    for (let i = 0; i < matches.length; i++) {
        let tiles = matches[i].tiles;
        let mid = Math.floor(tiles.length / 2);
        showScorePopup(tiles[mid].r, tiles[mid].c, points);
    }
}

// =========================================================================
// BOARD SETUP
// =========================================================================

function wouldMatch(r, c, candy) {
    if (c >= 2 && colorAt(r, c - 1) === candy && colorAt(r, c - 2) === candy) return true;
    if (r >= 2 && colorAt(r - 1, c) === candy && colorAt(r - 2, c) === candy) return true;
    return false;
}

function startGame() {
    let boardEl = document.getElementById("board");
    for (let r = 0; r < ROWS; r++) {
        let row = [];
        let dataRow = [];
        candyData.push(dataRow);
        for (let c = 0; c < COLUMNS; c++) {
            let cell = document.createElement("div");
            cell.className = "candy-cell";
            cell.setAttribute("role", "gridcell");

            let tile = document.createElement("img");
            tile.id = r.toString() + "-" + c.toString();
            dataRow.push({ color: null, special: "none" });

            let candy = randomCandy();
            dataRow[c].color = candy;
            while (wouldMatch(r, c, candy)) {
                candy = randomCandy();
                dataRow[c].color = candy;
            }
            tile.src = "./images/" + candy + ".png";
            tile.alt = candy + " candy";
            tile.setAttribute("aria-label", candy + " candy");
            tile.setAttribute("tabindex", "0");

            tile.addEventListener("dragstart", dragStart);
            tile.addEventListener("dragover", dragOver);
            tile.addEventListener("dragenter", dragEnter);
            tile.addEventListener("dragleave", dragLeave);
            tile.addEventListener("drop", dragDrop);
            tile.addEventListener("dragend", dragEnd);

            tile.addEventListener("touchstart", touchStart, { passive: false });
            tile.addEventListener("touchend", touchEnd, { passive: false });
            tile.addEventListener("touchmove", touchMove, { passive: false });

            tile.addEventListener("keydown", handleKeyboard);

            let shape = document.createElement("span");
            shape.className = "candy-shape";
            shape.setAttribute("aria-hidden", "true");
            shape.textContent = CANDY_SHAPES[candy] || "";

            cell.appendChild(tile);
            cell.appendChild(shape);
            boardEl.appendChild(cell);
            row.push(tile);
        }
        board.push(row);
    }
}

// =========================================================================
// DRAG & DROP
// =========================================================================

function dragStart() {
    if (gameState !== "idle") return;
    currTile = this;
    this.classList.add('dragging');
}

function dragOver(e) { e.preventDefault(); }
function dragEnter(e) { e.preventDefault(); this.classList.add('drag-over'); }
function dragLeave() { this.classList.remove('drag-over'); }

function dragDrop() {
    if (gameState !== "idle") return;
    this.classList.remove('drag-over');
    otherTile = this;
}

function dragEnd() {
    if (currTile) currTile.classList.remove('dragging');
    if (gameState !== "idle") { currTile = null; otherTile = null; return; }
    if (!currTile || !otherTile) { currTile = null; otherTile = null; return; }

    let pos1 = parseTileId(currTile);
    let pos2 = parseTileId(otherTile);
    let r = pos1.r, c = pos1.c, r2 = pos2.r, c2 = pos2.c;

    // Can't swap blanks
    if (!colorAt(r, c) || !colorAt(r2, c2)) { currTile = null; otherTile = null; return; }

    let isAdjacent = (Math.abs(r - r2) + Math.abs(c - c2)) === 1;
    if (!isAdjacent) { currTile = null; otherTile = null; return; }

    let s1 = specialAt(r, c);
    let s2 = specialAt(r2, c2);

    // --- Special + Special or Color Bomb swaps ---
    if (s1 === "bomb" || s2 === "bomb" || (s1 !== "none" && s2 !== "none")) {
        handleSpecialSwap(r, c, r2, c2);
        currTile = null;
        otherTile = null;
        return;
    }

    // --- Normal swap ---
    swapCandyData(r, c, r2, c2);

    let matches = findAllMatches();
    if (matches.length === 0) {
        // No match — swap back
        swapCandyData(r, c, r2, c2);
    } else {
        movesLeft--;
        document.getElementById('moves').innerText = movesLeft;
        cascadeLevel = 0;
        gameState = "processing";
        lastSwap = { r1: r, c1: c, r2: r2, c2: c2 };
        processCascade();
    }

    currTile = null;
    otherTile = null;
    deselectTile();
}

// =========================================================================
// TOUCH SUPPORT
// =========================================================================

let touchStartTile = null;
let touchStartX = 0;
let touchStartY = 0;

function touchStart(e) {
    if (gameState !== "idle") return;
    e.preventDefault();
    touchStartTile = this;
    let touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function touchMove(e) {
    if (touchStartTile) {
        e.preventDefault();
    }
}

function touchEnd(e) {
    if (gameState !== "idle" || !touchStartTile) return;
    e.preventDefault();

    let touch = e.changedTouches[0];
    let deltaX = touch.clientX - touchStartX;
    let deltaY = touch.clientY - touchStartY;

    let minSwipe = 20;
    if (Math.abs(deltaX) < minSwipe && Math.abs(deltaY) < minSwipe) {
        touchStartTile = null;
        return;
    }

    let pos = parseTileId(touchStartTile);
    let targetR = pos.r;
    let targetC = pos.c;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        targetC += deltaX > 0 ? 1 : -1;
    } else {
        targetR += deltaY > 0 ? 1 : -1;
    }

    if (targetR < 0 || targetR >= ROWS || targetC < 0 || targetC >= COLUMNS) {
        touchStartTile = null;
        return;
    }

    // Reuse the swap logic from dragEnd
    currTile = touchStartTile;
    otherTile = board[targetR][targetC];
    dragEnd();

    touchStartTile = null;
}

// =========================================================================
// KEYBOARD NAVIGATION
// =========================================================================

function handleKeyboard(e) {
    if (gameState !== "idle") return;

    let pos = parseTileId(this);
    let r = pos.r, c = pos.c;

    switch (e.key) {
        case "ArrowUp":
            e.preventDefault();
            if (r > 0) board[r - 1][c].focus();
            break;
        case "ArrowDown":
            e.preventDefault();
            if (r < ROWS - 1) board[r + 1][c].focus();
            break;
        case "ArrowLeft":
            e.preventDefault();
            if (c > 0) board[r][c - 1].focus();
            break;
        case "ArrowRight":
            e.preventDefault();
            if (c < COLUMNS - 1) board[r][c + 1].focus();
            break;
        case "Enter":
        case " ":
            e.preventDefault();
            handleTileSelect(r, c);
            break;
        case "Escape":
            e.preventDefault();
            deselectTile();
            break;
    }
}

function handleTileSelect(r, c) {
    if (!selectedTile) {
        selectedTile = { r: r, c: c };
        board[r][c].classList.add("selected");
    } else if (selectedTile.r === r && selectedTile.c === c) {
        deselectTile();
    } else {
        let isAdj = (Math.abs(selectedTile.r - r) + Math.abs(selectedTile.c - c)) === 1;
        if (isAdj) {
            currTile = board[selectedTile.r][selectedTile.c];
            otherTile = board[r][c];
            board[selectedTile.r][selectedTile.c].classList.remove("selected");
            selectedTile = null;
            dragEnd();
        } else {
            board[selectedTile.r][selectedTile.c].classList.remove("selected");
            selectedTile = { r: r, c: c };
            board[r][c].classList.add("selected");
        }
    }
}

function deselectTile() {
    if (selectedTile) {
        board[selectedTile.r][selectedTile.c].classList.remove("selected");
        selectedTile = null;
    }
}

// =========================================================================
// SPECIAL SWAP HANDLING  (two specials or color bomb)
// =========================================================================

function handleSpecialSwap(r1, c1, r2, c2) {
    let s1 = specialAt(r1, c1);
    let s2 = specialAt(r2, c2);
    let color1 = colorAt(r1, c1);
    let color2 = colorAt(r2, c2);

    movesLeft--;
    document.getElementById('moves').innerText = movesLeft;
    cascadeLevel = 0;
    gameState = "processing";
    lastSwap = null;

    let toClear = new Set();

    // --- Bomb + Bomb → clear entire board ---
    if (s1 === "bomb" && s2 === "bomb") {
        for (let r = 0; r < ROWS; r++)
            for (let ci = 0; ci < COLUMNS; ci++)
                if (colorAt(r, ci)) toClear.add(r + "," + ci);
        applyClearSet(toClear);
        return;
    }

    // --- Bomb + something ---
    if (s1 === "bomb" || s2 === "bomb") {
        let bombR = s1 === "bomb" ? r1 : r2;
        let bombC = s1 === "bomb" ? c1 : c2;
        let otherR = s1 === "bomb" ? r2 : r1;
        let otherC = s1 === "bomb" ? c2 : c1;
        let otherS = s1 === "bomb" ? s2 : s1;
        let targetColor = colorAt(otherR, otherC);

        // Remove bomb
        markForCrush(bombR, bombC);

        if (otherS === "none") {
            // Bomb + regular color → clear all of that color
            markForCrush(otherR, otherC);
            clearAllOfColor(targetColor);
            schedulePostClear();
            return;
        }

        if (otherS === "striped-h" || otherS === "striped-v") {
            // Bomb + striped → turn all of that color into that striped type, then activate all
            markForCrush(otherR, otherC);
            let toActivate = [];
            for (let ri = 0; ri < ROWS; ri++)
                for (let ci2 = 0; ci2 < COLUMNS; ci2++)
                    if (colorAt(ri, ci2) === targetColor) {
                        candyData[ri][ci2].special = otherS;
                        updateTileImage(ri, ci2);
                        toActivate.push({ r: ri, c: ci2 });
                    }
            for (let k = 0; k < toActivate.length; k++)
                activateSpecialInto(toActivate[k].r, toActivate[k].c, toClear);
            applyClearSet(toClear);
            return;
        }

        if (otherS === "wrapped") {
            // Bomb + wrapped → turn all of that color into wrapped, then activate all
            markForCrush(otherR, otherC);
            let toAct = [];
            for (let ri2 = 0; ri2 < ROWS; ri2++)
                for (let ci3 = 0; ci3 < COLUMNS; ci3++)
                    if (colorAt(ri2, ci3) === targetColor) {
                        candyData[ri2][ci3].special = "wrapped";
                        updateTileImage(ri2, ci3);
                        toAct.push({ r: ri2, c: ci3 });
                    }
            for (let k2 = 0; k2 < toAct.length; k2++)
                activateSpecialInto(toAct[k2].r, toAct[k2].c, toClear);
            applyClearSet(toClear);
            return;
        }
        return;
    }

    // --- Two non-bomb specials swapped ---
    let isStriped1 = (s1 === "striped-h" || s1 === "striped-v");
    let isStriped2 = (s2 === "striped-h" || s2 === "striped-v");

    // Striped + Striped → clear row AND column at swap pos
    if (isStriped1 && isStriped2) {
        markForCrush(r1, c1);
        markForCrush(r2, c2);
        addRow(r1, toClear); addColumn(c1, toClear);
        addRow(r2, toClear); addColumn(c2, toClear);
        applyClearSet(toClear);
        return;
    }

    // Wrapped + Wrapped → 5×5 area centred on swap
    if (s1 === "wrapped" && s2 === "wrapped") {
        markForCrush(r1, c1);
        markForCrush(r2, c2);
        addArea(r2, c2, 2, toClear);
        applyClearSet(toClear);
        return;
    }

    // Striped + Wrapped → 3 rows + 3 columns cross
    if ((isStriped1 && s2 === "wrapped") || (s1 === "wrapped" && isStriped2)) {
        markForCrush(r1, c1);
        markForCrush(r2, c2);
        let cR = r2, cC = c2;
        for (let d = -1; d <= 1; d++) { addRow(cR + d, toClear); addColumn(cC + d, toClear); }
        applyClearSet(toClear);
        return;
    }
}

// =========================================================================
// CLEAR HELPERS
// =========================================================================

function addRow(r, set) {
    if (r < 0 || r >= ROWS) return;
    for (let c = 0; c < COLUMNS; c++) if (colorAt(r, c)) set.add(r + "," + c);
}

function addColumn(c, set) {
    if (c < 0 || c >= COLUMNS) return;
    for (let r = 0; r < ROWS; r++) if (colorAt(r, c)) set.add(r + "," + c);
}

function addArea(cR, cC, radius, set) {
    for (let r = cR - radius; r <= cR + radius; r++)
        for (let c = cC - radius; c <= cC + radius; c++)
            if (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && colorAt(r, c))
                set.add(r + "," + c);
}

function clearAllOfColor(targetColor) {
    let n = 0;
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLUMNS; c++)
            if (colorAt(r, c) === targetColor) { markForCrush(r, c); n++; }
    score += Math.floor(n / 3) * MATCH_SCORE * (cascadeLevel + 1);
}

// Add a special candy's cells to toClear (for chain activations of specials hit by a bomb combo)
function activateSpecialInto(r, c, toClear) {
    let s = specialAt(r, c);
    if (s === "striped-h") { toClear.add(r + "," + c); addRow(r, toClear); }
    else if (s === "striped-v") { toClear.add(r + "," + c); addColumn(c, toClear); }
    else if (s === "wrapped") { toClear.add(r + "," + c); addArea(r, c, 1, toClear); }
    else { toClear.add(r + "," + c); }
}

/**
 * Clear all cells in a Set("r,c") with chain-reaction support.
 * Any special candy in the set triggers its effect; those effects can chain further.
 */
function applyClearSet(toClear) {
    // Iterative chain — keep going until no new cells are added
    let visited = new Set();
    let queue = [];
    toClear.forEach(function(key) { queue.push(key); });

    while (queue.length > 0) {
        let key = queue.shift();
        if (visited.has(key)) continue;
        visited.add(key);

        let parts = key.split(",");
        let r = parseInt(parts[0]);
        let c = parseInt(parts[1]);
        if (!colorAt(r, c)) continue;

        let s = specialAt(r, c);
        // Collect new cells from special activation BEFORE clearing this cell
        let extra = new Set();
        if (s === "striped-h") addRow(r, extra);
        else if (s === "striped-v") addColumn(c, extra);
        else if (s === "wrapped") addArea(r, c, 1, extra);

        // Clear this cell
        markForCrush(r, c);

        // Enqueue any new cells from chain
        extra.forEach(function(ek) { if (!visited.has(ek)) queue.push(ek); });
    }

    let count = visited.size;
    score += Math.floor(count / 3) * MATCH_SCORE * (cascadeLevel + 1);
    document.getElementById("score").innerText = score;
    schedulePostClear();
}

function schedulePostClear() {
    setTimeout(function() {
        applyVisualClear();
        let movedTiles = slideCandy();
        addDroppingClass(movedTiles);
        let newTiles = generateCandy();
        addDroppingClass(newTiles);
        cascadeLevel++;
        setTimeout(function() {
            removeDroppingClass();
            processCascade();
        }, GAME_TICK);
    }, 300);
}

// =========================================================================
// MATCH DETECTION
// =========================================================================

function findAllMatches() {
    let horizontalRuns = [];
    let verticalRuns = [];

    // Horizontal runs of 3+
    for (let r = 0; r < ROWS; r++) {
        let c = 0;
        while (c < COLUMNS) {
            let color = colorAt(r, c);
            if (!color) { c++; continue; }
            let end = c + 1;
            while (end < COLUMNS && colorAt(r, end) === color) end++;
            if (end - c >= 3) {
                let tiles = [];
                for (let cc = c; cc < end; cc++) tiles.push({ r: r, c: cc });
                horizontalRuns.push({ tiles: tiles, color: color, direction: "horizontal" });
            }
            c = end;
        }
    }

    // Vertical runs of 3+
    for (let c2 = 0; c2 < COLUMNS; c2++) {
        let r2 = 0;
        while (r2 < ROWS) {
            let color2 = colorAt(r2, c2);
            if (!color2) { r2++; continue; }
            let end2 = r2 + 1;
            while (end2 < ROWS && colorAt(end2, c2) === color2) end2++;
            if (end2 - r2 >= 3) {
                let tiles2 = [];
                for (let rr = r2; rr < end2; rr++) tiles2.push({ r: rr, c: c2 });
                verticalRuns.push({ tiles: tiles2, color: color2, direction: "vertical" });
            }
            r2 = end2;
        }
    }

    return groupRuns(horizontalRuns, verticalRuns);
}

/**
 * Group overlapping same-colour runs (L/T detection) using union-find.
 * Returns array of match objects sorted by priority.
 */
function groupRuns(hRuns, vRuns) {
    let allRuns = hRuns.concat(vRuns);
    if (allRuns.length === 0) return [];

    // Map each cell to the run indices that cover it
    let cellToRuns = {};
    for (let i = 0; i < allRuns.length; i++) {
        let run = allRuns[i];
        for (let j = 0; j < run.tiles.length; j++) {
            let key = run.tiles[j].r + "," + run.tiles[j].c;
            if (!cellToRuns[key]) cellToRuns[key] = [];
            cellToRuns[key].push(i);
        }
    }

    // Union-find
    let parent = [];
    for (let p = 0; p < allRuns.length; p++) parent.push(p);
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) { parent[find(a)] = find(b); }

    for (let ck in cellToRuns) {
        let ids = cellToRuns[ck];
        for (let q = 1; q < ids.length; q++) {
            if (allRuns[ids[0]].color === allRuns[ids[q]].color) union(ids[0], ids[q]);
        }
    }

    // Collect groups
    let groups = {};
    for (let g = 0; g < allRuns.length; g++) {
        let root = find(g);
        if (!groups[root]) groups[root] = [];
        groups[root].push(g);
    }

    let matches = [];
    for (let root2 in groups) {
        let indices = groups[root2];
        let tileSet = {};
        let hasH = false, hasV = false, maxLen = 0;
        let mColor = allRuns[indices[0]].color;

        for (let m = 0; m < indices.length; m++) {
            let mRun = allRuns[indices[m]];
            if (mRun.direction === "horizontal") hasH = true;
            if (mRun.direction === "vertical") hasV = true;
            if (mRun.tiles.length > maxLen) maxLen = mRun.tiles.length;
            for (let n = 0; n < mRun.tiles.length; n++) {
                let tk = mRun.tiles[n].r + "," + mRun.tiles[n].c;
                tileSet[tk] = mRun.tiles[n];
            }
        }

        let tArr = [];
        for (let tk2 in tileSet) tArr.push(tileSet[tk2]);

        let type, direction;
        if (maxLen >= 5) {
            type = "five";
            direction = hasH ? "horizontal" : "vertical";
        } else if (hasH && hasV) {
            type = "LT";
            direction = null;
        } else if (maxLen >= 4) {
            type = "four";
            direction = hasH ? "horizontal" : "vertical";
        } else {
            type = "three";
            direction = hasH ? "horizontal" : "vertical";
        }

        matches.push({ tiles: tArr, type: type, direction: direction, color: mColor });
    }

    // Sort by priority: five > LT > four > three
    let prio = { "five": 0, "LT": 1, "four": 2, "three": 3 };
    matches.sort(function(a, b) { return prio[a.type] - prio[b.type]; });
    return matches;
}

// =========================================================================
// MATCH PROCESSING & SPECIAL CREATION
// =========================================================================

function processMatches(matches) {
    if (matches.length === 0) return 0;

    // 1. Collect ALL tiles to clear
    let allClear = {};  // "r,c" → true
    for (let i = 0; i < matches.length; i++)
        for (let j = 0; j < matches[i].tiles.length; j++) {
            let t = matches[i].tiles[j];
            allClear[t.r + "," + t.c] = true;
        }

    // 2. Determine specials to create (higher-priority matches processed first)
    let specialsToPlace = []; // { r, c, color, special }
    let claimedCells = {};    // cells reserved for a new special

    for (let mi = 0; mi < matches.length; mi++) {
        let sp = getSpecialForMatch(matches[mi]);
        if (sp && !claimedCells[sp.r + "," + sp.c]) {
            specialsToPlace.push(sp);
            claimedCells[sp.r + "," + sp.c] = true;
        }
    }

    // 3. Collect existing specials that will be destroyed (for chain activation)
    let specialQueue = [];
    for (let ck in allClear) {
        if (claimedCells[ck]) continue; // will be replaced, not destroyed
        let pts = ck.split(",");
        let sr = parseInt(pts[0]), sc = parseInt(pts[1]);
        let ss = specialAt(sr, sc);
        if (ss !== "none") specialQueue.push({ r: sr, c: sc, special: ss });
    }

    // 4. Clear tiles (except where we'll place a special)
    let clearCount = 0;
    for (let ck2 in allClear) {
        if (claimedCells[ck2]) continue;
        let pts2 = ck2.split(",");
        let cr = parseInt(pts2[0]), cc = parseInt(pts2[1]);
        if (colorAt(cr, cc)) { markForCrush(cr, cc); clearCount++; }
    }

    // 5. Place new specials
    for (let si = 0; si < specialsToPlace.length; si++) {
        let spl = specialsToPlace[si];
        setCandyAt(spl.r, spl.c, spl.color, spl.special);
        clearCount++; // the original candy at this spot counts as cleared
    }

    // 6. Score
    score += Math.floor(clearCount / 3) * MATCH_SCORE * (cascadeLevel + 1);

    // 7. Chain-activate destroyed specials
    let chainClear = new Set();
    for (let qi = 0; qi < specialQueue.length; qi++) {
        let sq = specialQueue[qi];
        if (sq.special === "striped-h") addRow(sq.r, chainClear);
        else if (sq.special === "striped-v") addColumn(sq.c, chainClear);
        else if (sq.special === "wrapped") addArea(sq.r, sq.c, 1, chainClear);
    }

    if (chainClear.size > 0) {
        // Iteratively resolve chain reactions
        let visited = new Set();
        let cq = [];
        chainClear.forEach(function(k) { cq.push(k); });

        while (cq.length > 0) {
            let ck3 = cq.shift();
            if (visited.has(ck3)) continue;
            visited.add(ck3);
            let p3 = ck3.split(",");
            let cr3 = parseInt(p3[0]), cc3 = parseInt(p3[1]);
            if (!colorAt(cr3, cc3)) continue;

            let cs = specialAt(cr3, cc3);
            let extra = new Set();
            if (cs === "striped-h") addRow(cr3, extra);
            else if (cs === "striped-v") addColumn(cc3, extra);
            else if (cs === "wrapped") addArea(cr3, cc3, 1, extra);

            markForCrush(cr3, cc3);
            clearCount++;

            extra.forEach(function(ek) { if (!visited.has(ek)) cq.push(ek); });
        }

        score += Math.floor(visited.size / 3) * MATCH_SCORE * (cascadeLevel + 1);
    }

    return clearCount;
}

function getSpecialForMatch(match) {
    let swapR = -1, swapC = -1;
    if (lastSwap) {
        for (let i = 0; i < match.tiles.length; i++) {
            let t = match.tiles[i];
            if (t.r === lastSwap.r1 && t.c === lastSwap.c1) { swapR = t.r; swapC = t.c; break; }
            if (t.r === lastSwap.r2 && t.c === lastSwap.c2) { swapR = t.r; swapC = t.c; break; }
        }
    }

    if (match.type === "five") {
        let pos5 = pickSpecialPos(match, swapR, swapC);
        return { r: pos5.r, c: pos5.c, color: match.color, special: "bomb" };
    }
    if (match.type === "LT") {
        let posLT = findIntersection(match);
        return { r: posLT.r, c: posLT.c, color: match.color, special: "wrapped" };
    }
    if (match.type === "four") {
        let pos4 = pickSpecialPos(match, swapR, swapC);
        let stripedType = match.direction === "horizontal" ? "striped-v" : "striped-h";
        return { r: pos4.r, c: pos4.c, color: match.color, special: stripedType };
    }
    return null; // three-match — no special
}

function pickSpecialPos(match, swapR, swapC) {
    if (swapR >= 0) {
        for (let i = 0; i < match.tiles.length; i++) {
            if (match.tiles[i].r === swapR && match.tiles[i].c === swapC) return { r: swapR, c: swapC };
        }
    }
    let sorted = match.tiles.slice().sort(function(a, b) { return a.r === b.r ? a.c - b.c : a.r - b.r; });
    return sorted[Math.floor(sorted.length / 2)];
}

function findIntersection(match) {
    let rowCounts = {}, colCounts = {};
    for (let i = 0; i < match.tiles.length; i++) {
        let t = match.tiles[i];
        rowCounts[t.r] = (rowCounts[t.r] || 0) + 1;
        colCounts[t.c] = (colCounts[t.c] || 0) + 1;
    }
    for (let j = 0; j < match.tiles.length; j++) {
        let t2 = match.tiles[j];
        if ((rowCounts[t2.r] || 0) >= 3 && (colCounts[t2.c] || 0) >= 3) return { r: t2.r, c: t2.c };
    }
    for (let k = 0; k < match.tiles.length; k++) {
        let t3 = match.tiles[k];
        if ((rowCounts[t3.r] || 0) >= 2 && (colCounts[t3.c] || 0) >= 2) return { r: t3.r, c: t3.c };
    }
    return pickSpecialPos(match, -1, -1);
}

// =========================================================================
// CASCADE PROCESSING (state machine)
// =========================================================================

function processCascade() {
    let matches = findAllMatches();
    if (matches.length === 0) {
        lastSwap = null;
        checkNoValidMoves();
        document.getElementById("score").innerText = score;
        if (movesLeft <= 0) {
            showGameOver();
            return;
        }
        deselectTile();
        gameState = "idle";
        return;
    }

    processMatches(matches);
    document.getElementById("score").innerText = score;
    showMatchScorePopups(matches);

    setTimeout(function() {
        applyVisualClear();
        let movedTiles = slideCandy();
        addDroppingClass(movedTiles);
        let newTiles = generateCandy();
        addDroppingClass(newTiles);
        cascadeLevel++;
        setTimeout(function() {
            removeDroppingClass();
            processCascade();
        }, GAME_TICK);
    }, 300);
}

// =========================================================================
// GRAVITY
// =========================================================================

function slideCandy() {
    let movedTiles = [];
    for (let c = 0; c < COLUMNS; c++) {
        let ind = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (colorAt(r, c) !== null) {
                if (ind !== r) {
                    candyData[ind][c].color = candyData[r][c].color;
                    candyData[ind][c].special = candyData[r][c].special;
                    candyData[r][c].color = null;
                    candyData[r][c].special = "none";
                    updateTileImage(ind, c);
                    updateTileImage(r, c);
                    movedTiles.push({ r: ind, c: c });
                }
                ind--;
            }
        }
        for (let r2 = ind; r2 >= 0; r2--) {
            candyData[r2][c].color = null;
            candyData[r2][c].special = "none";
            updateTileImage(r2, c);
        }
    }
    return movedTiles;
}

// =========================================================================
// GENERATE NEW CANDIES
// =========================================================================

function generateCandy() {
    let newTiles = [];
    for (let c = 0; c < COLUMNS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (colorAt(r, c) === null) {
                setCandyAt(r, c, randomCandy(), "none");
                newTiles.push({ r: r, c: c });
            }
        }
    }
    return newTiles;
}

// =========================================================================
// NO VALID MOVES DETECTION & SHUFFLE
// =========================================================================

function checkNoValidMoves() {
    if (hasValidMoves()) return;

    let positions = [];
    let colors = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (colorAt(r, c) && specialAt(r, c) === "none") {
                positions.push({ r: r, c: c });
                colors.push(colorAt(r, c));
            }
        }
    }

    let attempts = 0;
    do {
        // Fisher-Yates shuffle
        for (let i = colors.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp = colors[i]; colors[i] = colors[j]; colors[j] = tmp;
        }
        for (let k = 0; k < positions.length; k++) {
            setCandyAt(positions[k].r, positions[k].c, colors[k], "none");
        }
        attempts++;
    } while (!hasValidMoves() && attempts < 100);
}

function hasValidMoves() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS; c++) {
            if (!colorAt(r, c)) continue;

            // A color bomb next to any candy is always valid
            if (specialAt(r, c) === "bomb") {
                if ((c + 1 < COLUMNS && colorAt(r, c + 1)) ||
                    (c - 1 >= 0 && colorAt(r, c - 1)) ||
                    (r + 1 < ROWS && colorAt(r + 1, c)) ||
                    (r - 1 >= 0 && colorAt(r - 1, c))) return true;
            }

            // Try swap right
            if (c + 1 < COLUMNS && colorAt(r, c + 1)) {
                swapDataOnly(r, c, r, c + 1);
                if (quickMatchCheck()) { swapDataOnly(r, c, r, c + 1); return true; }
                swapDataOnly(r, c, r, c + 1);
            }
            // Try swap down
            if (r + 1 < ROWS && colorAt(r + 1, c)) {
                swapDataOnly(r, c, r + 1, c);
                if (quickMatchCheck()) { swapDataOnly(r, c, r + 1, c); return true; }
                swapDataOnly(r, c, r + 1, c);
            }
        }
    }
    return false;
}

function quickMatchCheck() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLUMNS - 2; c++) {
            let cl = colorAt(r, c);
            if (cl && colorAt(r, c + 1) === cl && colorAt(r, c + 2) === cl) return true;
        }
    }
    for (let c2 = 0; c2 < COLUMNS; c2++) {
        for (let r2 = 0; r2 < ROWS - 2; r2++) {
            let cl2 = colorAt(r2, c2);
            if (cl2 && colorAt(r2 + 1, c2) === cl2 && colorAt(r2 + 2, c2) === cl2) return true;
        }
    }
    return false;
}

// =========================================================================
// INIT
// =========================================================================

function showGameOver() {
    gameState = "gameover";
    document.getElementById('final-score').innerText = score;
    let title = score >= TARGET_SCORE ? 'Sweet Victory! 🎉' : 'Game Over 😢';
    document.getElementById('game-over-title').innerText = title;
    document.getElementById('game-over').classList.remove('hidden');
}

function resetGame() {
    document.getElementById('game-over').classList.add('hidden');
    score = 0;
    movesLeft = MAX_MOVES;
    cascadeLevel = 0;
    lastSwap = null;
    selectedTile = null;
    board = [];
    candyData = [];
    document.getElementById('score').innerText = '0';
    document.getElementById('moves').innerText = MAX_MOVES;
    document.getElementById('board').innerHTML = '';
    startGame();
    gameState = "processing";
    setTimeout(function() { processCascade(); }, GAME_TICK);
}

window.onload = function() {
    document.getElementById('target').innerText = TARGET_SCORE;
    document.getElementById('moves').innerText = MAX_MOVES;
    startGame();
    document.getElementById('play-again').addEventListener('click', resetGame);
    gameState = "processing";
    cascadeLevel = 0;
    lastSwap = null;
    setTimeout(function() { processCascade(); }, GAME_TICK);
};

})();