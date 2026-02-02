# Flappy Bird — Complete Rules & Mechanics Specification (Developer-Ready)

This document defines **all rules, mechanics, constraints, and edge cases** for a **Flappy Bird–style game**, written as a clear, implementation-ready specification suitable for building a web or mobile game.

This focuses on **core gameplay behavior**, not art or engine-specific details.

---

## 1. Game Overview
- **Players:** 1
- **Objective:**  
  Navigate the bird through gaps between pipes for as long as possible without crashing.
- **Game Type:**  
  Single-player, real-time, endless runner
- **Scoring Model:**  
  Survival-based, incremental score

---

## 2. Game World Specifications
- **Orientation:**  
  - Horizontal scrolling from **right → left**
- **Camera Behavior:**  
  - Fixed camera
  - World scrolls continuously
- **Game Loop:**  
  - Runs continuously until a fail condition is met

---

## 3. Player Character (Bird)

### 3.1 Bird Properties
- Fixed horizontal position (X-axis)
- Variable vertical position (Y-axis)
- Has:
  - Vertical velocity
  - Gravity applied continuously
  - Jump (flap) impulse

---

## 4. Physics Rules

### 4.1 Gravity
- Gravity applies **every frame**
- Gravity continuously increases **downward velocity**
- Gravity remains constant throughout gameplay

### 4.2 Flap / Jump Action
- Triggered by:
  - Screen tap
  - Mouse click
  - Key press
- Effect:
  - Instantly applies an **upward vertical impulse**
  - Resets or reduces downward velocity
- No horizontal movement from player input

### 4.3 Velocity Constraints (Optional but Common)
- Maximum downward fall speed
- Maximum upward velocity to prevent excessive lift

---

## 5. Obstacles (Pipes)

### 5.1 Pipe Structure
- Pipes appear in **pairs**:
  - One top pipe
  - One bottom pipe
- A **vertical gap** exists between the pipes
- The gap size is constant (or slightly randomized within bounds)

---

### 5.2 Pipe Movement
- Pipes:
  - Spawn off-screen on the right
  - Move left at a constant speed
- Pipe speed:
  - Constant during a run
  - May optionally increase with score/difficulty

---

### 5.3 Pipe Spawning Rules
- Pipes spawn at regular horizontal intervals
- Vertical position of the gap is randomized within safe limits
- Pipes are removed once fully off-screen to the left

---

## 6. Collision Rules

### 6.1 Pipe Collision
A collision occurs if:
- Bird intersects:
  - Top pipe
  - Bottom pipe
- Collision detection is typically:
  - Axis-aligned bounding box (AABB)
  - Or circle/rectangle approximation

---

### 6.2 Ground Collision
- The ground is a solid boundary
- Collision with the ground results in **immediate game over**

---

### 6.3 Ceiling Collision
- Touching the top of the screen:
  - Either results in game over
  - Or clamps vertical position (implementation choice)
- Original behavior allows ceiling collision to end the game

---

## 7. Scoring Rules
- Score increases by **1 point** when:
  - The bird successfully passes **through a pipe gap**
- Each pipe pair can only score **once**
- Score increments **only after clearing the pipes**
- No score from time survived alone

---

## 8. Game States

### 8.1 Ready State
- Game is idle
- Bird may float or stay stationary
- First input starts the game

---

### 8.2 Playing State
- Gravity is active
- Pipes spawn and move
- Score updates
- Input causes flaps

---

### 8.3 Game Over State
Triggered when:
- Bird collides with any pipe
- Bird hits the ground
- Bird exits vertical bounds (if enforced)

Effects:
- Movement stops
- Input disabled (except restart)
- Final score displayed

---

## 9. Restart Rules
- Restart resets:
  - Bird position
  - Velocity
  - Score
  - Pipes
- Restart requires:
  - User input (tap / click / key)
- No carryover state between runs

---

## 10. Difficulty Rules (Optional but Common)
Difficulty may scale by:
- Increasing pipe movement speed
- Decreasing gap size (within limits)
- Increasing spawn frequency

Difficulty changes:
- Must be gradual
- Must never create impossible gaps

---

## 11. Randomization Constraints
- Pipe gap vertical position must:
  - Stay fully within screen bounds
  - Always allow a possible path
- Randomization must be deterministic per spawn
- No mid-gap movement after spawn

---

## 12. Illegal / Invalid States
The game must prevent:
- Pipes spawning without a gap
- Multiple scores from the same pipe
- Bird moving horizontally due to input
- Score increment after game over
- Flapping after death

---

## 13. Audio / Feedback Rules (Optional)
Common but non-essential:
- Flap sound on input
- Score sound when passing pipes
- Collision sound on failure

---

## 14. Validation Checklist (Developer Sanity Check)

Ensure your implementation supports:
- ✅ Continuous gravity
- ✅ Instant upward flap impulse
- ✅ Fixed horizontal bird position
- ✅ Constant-speed scrolling pipes
- ✅ Accurate collision detection
- ✅ One score per pipe pair
- ✅ Immediate game over on collision
- ✅ Full reset on restart

---

## 15. Variant Disclaimer
This specification models **classic Flappy Bird behavior**.

Variants may include:
- Different gravity values
- Moving gaps
- Power-ups
- Multiple birds
- Vertical scrolling

These require additional rules and logic.

---

## 16. Summary
Flappy Bird is a **precision-based real-time game** defined by:
- Simple controls
- Strict physics
- Deterministic scoring
- Zero forgiveness on collision

Its simplicity makes correctness in:
- Physics timing
- Collision detection
- State transitions

absolutely critical for a faithful implementation.