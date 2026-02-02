# Connect Four — Complete Rules Specification (Developer-Ready)

This document outlines **all rules and conditions** for a standard **Connect Four** game, written as a clear, implementation-ready specification suitable for building an online Connect Four website or application.

---

## 1. Game Overview
- **Players:** 2
- **Objective:**  
  Be the **first player to connect four of your own discs** in a row:
  - Horizontally
  - Vertically
  - Diagonally (both directions)
- **Game Type:** Turn-based, deterministic, perfect information

---

## 2. Board Specifications
- **Grid Size:**  
  - 7 columns × 6 rows
- **Orientation:**  
  - Columns are vertical
  - Row 1 is the **bottom row**
- **Playable Cells:**  
  - All grid cells are playable
- **Gravity Rule:**  
  - Discs fall to the **lowest available cell** in a column

---

## 3. Game Pieces
- Each player has **21 identical discs**
- Players are assigned:
  - Player 1 → Color A (commonly Red)
  - Player 2 → Color B (commonly Yellow)
- Discs are **not unique** and have **no states or promotions**

---

## 4. Initial Setup
- The board starts **empty**
- No discs are placed before the game begins
- Player 1 always goes first (standard rule)

---

## 5. Turn Order
- Players alternate turns
- One disc is placed per turn
- A turn consists of:
  1. Selecting a column
  2. Dropping a disc into that column
  3. Disc settles at the lowest available row
  4. Board is checked for a win or draw

---

## 6. Legal Moves
A move is legal if:
- The selected column exists (1–7)
- The selected column is **not full**

### Illegal Moves
- Selecting a full column
- Selecting a non-existent column
- Placing a disc in mid-air (gravity violation)
- Placing more than one disc in a single turn

---

## 7. Disc Placement Rules
- Discs **must fall vertically**
- Discs occupy the **lowest unoccupied cell** in the chosen column
- Once placed, discs **cannot be moved or removed**

---

## 8. Win Conditions
A player wins immediately when **four of their discs** form a continuous line in any of the following ways:

### 8.1 Horizontal
- Four adjacent discs in the same row

### 8.2 Vertical
- Four stacked discs in the same column

### 8.3 Diagonal (Bottom-Left to Top-Right)
- Four discs ascending diagonally

### 8.4 Diagonal (Top-Left to Bottom-Right)
- Four discs descending diagonally

> Win detection should occur **after every move**.

---

## 9. Draw Conditions
The game ends in a draw if:
- All **42 board cells are filled**
- No player has achieved a connect-four

---

## 10. Game End Rules
- Once a win or draw is detected:
  - No further moves are allowed
  - The game state is locked
- Optional features:
  - Rematch
  - Restart
  - Return to lobby

---

## 11. Edge Cases & Clarifications
- A win **cannot** occur simultaneously for both players
- The winning move always belongs to the player who just placed a disc
- Gravity applies instantly and deterministically
- No captures, removals, or special disc abilities exist

---

## 12. Online / Digital Implementation Considerations (Optional)
These are not core rules but commonly included:

- Turn timer / move countdown
- Forfeit on timeout
- Player disconnect handling
- Spectator mode
- Move history / replay
- Highlighting winning four discs

---

## 13. Validation Checklist (Developer Sanity Check)

Ensure your implementation supports:
- ✅ 7×6 grid enforcement
- ✅ Gravity-based disc placement
- ✅ One disc per turn
- ✅ Full-column rejection
- ✅ Horizontal, vertical, and diagonal win detection
- ✅ Immediate game termination on win
- ✅ Proper draw detection

---

## 14. Variant Disclaimer
This ruleset is for **standard Connect Four**.

Variants such as:
- Larger boards
- More than two players
- “Pop Out” Connect Four
- Connect Five / custom win lengths

require **different logic and constraints**.

---

## 15. Summary
Connect Four is a **simple but strict** rule-based game:
- No randomness
- No piece movement after placement
- No ambiguity in legal moves
- Win conditions are deterministic and local to the last move

This makes it ideal for:
- Online multiplayer
- AI opponents
- Real-time validation
- Educational and competitive play