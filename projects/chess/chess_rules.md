# Chess — Complete Rules & Mechanics Specification (Developer-Ready)

This document defines **all official rules, mechanics, constraints, and edge cases** for a **standard game of Chess**, written as a full implementation-ready specification for building an online chess website or application.

This follows **FIDE-standard chess rules** unless otherwise stated.

---

## 1. Game Overview
- **Players:** 2
- **Objective:**  
  Deliver **checkmate** to the opponent’s king.
- **Game Type:**  
  Turn-based, deterministic, perfect information
- **Colors:**  
  - White
  - Black

---

## 2. Board Specifications
- **Board Size:** 8 × 8 grid (64 squares)
- **Square Colors:** Alternating light and dark
- **Orientation:**  
  - Each player has a **light-colored square on their bottom-right**
- **Coordinates (Optional for UI):**
  - Files: a–h (columns)
  - Ranks: 1–8 (rows)

---

## 3. Pieces
Each player starts with **16 pieces**:

| Piece   | Quantity |
|--------|----------|
| King   | 1 |
| Queen  | 1 |
| Rook   | 2 |
| Bishop | 2 |
| Knight | 2 |
| Pawn   | 8 |

---

## 4. Initial Setup
- Pieces are placed symmetrically
- White occupies ranks 1–2
- Black occupies ranks 7–8

### Back Rank Order (Left to Right):
Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook

- Queen always starts on her **own color**
- Pawns fill the rank in front of the back rank

---

## 5. Turn Order
- **White always moves first**
- Players alternate turns
- Exactly **one move per turn**, except castling (which is still one move)

---

## 6. Piece Movement Rules

### 6.1 Pawn
- Moves **forward one square**
- On first move only:
  - May move **two squares forward**
- Captures **one square diagonally forward**
- Cannot move backward

#### Special Pawn Rules:
- **En Passant**
- **Promotion**

---

### 6.2 Rook
- Moves any number of squares:
  - Horizontally
  - Vertically
- Cannot jump over pieces

---

### 6.3 Bishop
- Moves any number of squares:
  - Diagonally
- Cannot jump over pieces
- Always remains on the same color square

---

### 6.4 Knight
- Moves in an **L-shape**:
  - Two squares in one direction + one perpendicular
- Knights **can jump over pieces**
- Captures on destination square

---

### 6.5 Queen
- Combines rook and bishop movement:
  - Horizontal
  - Vertical
  - Diagonal
- Cannot jump over pieces

---

### 6.6 King
- Moves **one square** in any direction
- May not move into **check**
- Has a special move: **Castling**

---

## 7. Capturing Rules
- A piece captures by moving to a square occupied by an opponent piece
- The captured piece is removed from the board
- Captures are optional (except for forced mate scenarios)

---

## 8. Check, Checkmate, and Illegal Positions

### 8.1 Check
- A king is in **check** if it is under immediate threat of capture
- A player **must respond to check** on their turn

---

### 8.2 Legal Responses to Check
- Move the king
- Capture the attacking piece
- Block the attack (if applicable)

---

### 8.3 Checkmate
- A king is in check **and**
- No legal move exists to escape check

Result:
- The attacking player **wins immediately**

---

## 9. Castling

### 9.1 Conditions
Castling is legal if:
- King has **not moved**
- The chosen rook has **not moved**
- No pieces between king and rook
- King is **not currently in check**
- King does **not pass through check**
- King does **not end in check**

---

### 9.2 Execution
- King moves two squares toward the rook
- Rook moves to the square immediately next to the king on the opposite side

Types:
- King-side castling
- Queen-side castling

---

## 10. En Passant

### 10.1 Conditions
- Opponent moves a pawn two squares forward
- Pawn lands adjacent to your pawn
- Your pawn may capture it **as if it moved one square**

---

### 10.2 Timing Rule
- En passant capture must occur **immediately on the next move**
- Otherwise, the right is lost

---

## 11. Pawn Promotion
- A pawn that reaches the **final rank** must be promoted
- Promotion options:
  - Queen
  - Rook
  - Bishop
  - Knight
- Promotion is **mandatory**
- Pawn is removed and replaced immediately
- Multiple queens are allowed

---

## 12. Illegal Moves
A move is illegal if it:
- Leaves your king in check
- Moves a piece in a way not allowed
- Jumps over pieces (except knight)
- Captures your own piece
- Violates castling or en passant rules

Illegal moves must be:
- Prevented by the system
- Or reverted if detected

---

## 13. Draw Conditions

### 13.1 Stalemate
- Player has no legal moves
- King is **not in check**

Result:
- Draw

---

### 13.2 Threefold Repetition
- Same board position occurs **three times**
- Same player to move
- Same legal moves available

---

### 13.3 Fifty-Move Rule
- 50 consecutive moves without:
  - A pawn move
  - A capture

---

### 13.4 Insufficient Material
Examples:
- King vs King
- King + Bishop vs King
- King + Knight vs King

---

### 13.5 Mutual Agreement
- Both players agree to a draw

---

## 14. Resignation
- A player may resign at any time
- Opponent wins immediately

---

## 15. Game End Rules
Game ends immediately upon:
- Checkmate
- Draw condition
- Resignation
- Timeout (if using clocks)

---

## 16. Chess Clocks (Optional Online Rule)
- Each player has a timer
- Clock runs during own turn
- Timeout results in:
  - Loss, unless opponent has insufficient material

---

## 17. Validation Checklist (Developer Sanity Check)

Ensure your implementation supports:
- ✅ Legal move generation
- ✅ King safety enforcement
- ✅ Castling validation
- ✅ En passant timing
- ✅ Pawn promotion UI
- ✅ Check and checkmate detection
- ✅ Stalemate detection
- ✅ Draw rule enforcement
- ✅ Move history tracking

---

## 18. Variant Disclaimer
This specification is for **standard classical chess**.

Variants such as:
- Chess960
- Blitz / Bullet
- Atomic Chess
- Crazyhouse
- Bughouse

require additional or modified rules.

---

## 19. Summary
Chess is a **strict, rule-dense strategy game** defined by:
- Absolute king safety
- Deterministic movement rules
- Complex edge cases
- Precise state validation

Correct handling of:
- Checks
- Castling
- En passant
- Draw conditions

is essential for a faithful and competitive implementation.