# Vocabulary Runner Blueprint

Vocabulary Runner is a 2.5D forward-facing magical vocabulary game where a witch runs down a corridor and chooses doors with correct translations.

## Game Design

- **Perspective:** 2.5D forward-facing runner (Subway Surfers style) with vanishing point at 25% screen height
- **Character:** A witch viewed from behind, running forward down a magical corridor
- **Mechanic:** Three doors appear ahead with English words; player steers witch left/right to choose the correct door matching a Thai prompt
- **Controls:** Arrow keys (Left/Right) or A/D keys to switch lanes; touch/click on doors directly

## 2.5D Perspective System

### Vanishing Point
- Located at center-X, 25% screen height
- All corridor walls, floor lines, and lane positions converge to this point
- Creates illusion of forward movement down a 3D hallway

### Corridor Rendering
- **Walls:** Trapezoid shapes on left/right edges converging to vanishing point
- **Floor Grid:** Horizontal lines with perspective spacing (closer together near VP)
- **Floor Animation:** Lines scroll downward simulating forward movement
- **VP Glow:** Subtle purple/gold glow at vanishing point

### Lane Positions
- **Bottom of screen:** Full lane spread (20%, 50%, 80% of width)
- **Door height (38%):** Converged positions toward vanishing point
- **Witch height (68%):** Partial convergence
- Perspective scaling applied to all game objects

## Learning Loop

- **Player verb:** Choose the correct door with the English translation of a Thai word
- **Learning mode:** vocabulary
- **Correct consequence:** Witch passes through door, crystal celebration, score increases by 100
- **Incorrect consequence:** Sentinel appears, lose one life, screen shake and red flash
- **Win condition:** Survive for 2 minutes or complete all vocabulary items
- **Lose condition:** Lives reach 0 or timer reaches 0

## Game Mechanics

### Lives System
- Player starts with 3 lives
- Wrong answer subtracts 1 life
- Game ends when lives reach 0

### Timer System
- Game session lasts exactly 2 minutes (120 seconds)
- Countdown timer displayed in top-right corner
- Timer flashes red when ≤10 seconds remaining
- Game ends when timer reaches 0

### Scoring
- Correct answer: +100 points
- Final accuracy: correctAnswers / totalAttempts
- XP calculated: floor(correctAnswers × accuracy)

## Visual Design

### Theme
- Fancy magical theme with purple/gold UI
- Ornate door borders with glowing effects
- Dark corridor with purple/gold accents
- Forward-facing 2.5D perspective

### Layout
- **Portrait (390×844):** Compact corridor, smaller doors/witch
- **Landscape (1440×900):** Wide corridor, larger doors/witch
- Responsive positioning recalculates vanishing point on resize

### Visual Effects
- Parallax cloud background (scrolls slowly)
- Floor grid lines scrolling downward (forward movement)
- Crystal sparkle animation on correct answer
- Screen shake and red flash on incorrect answer
- Sentinel sprite appears briefly on wrong answer
- Tween animations for witch lane-switching
- Witch shadow ellipse below character

## Asset Usage

| Asset | Usage |
|---|---|
| `runner.idle` | Witch standing animation |
| `runner.walk` | Witch running animation |
| `enemy.sentinel` | Wrong answer feedback sprite |
| `enemy.scout` | Optional obstacle variety |
| `environment.clouds` | Far background parallax layer |
| `environment.terrain` | Floor reference (grid drawn with graphics) |
| `bonus.crystal-blue` | Life indicator, correct answer reward |
| `bonus.crystal-green` | Streak bonus indicator |
| `bonus.crystal-yellow` | High score indicator |
| `bonus.coin` | Score multiplier |
| `feedback.hit` | Wrong answer visual effect |
| `audio.feedback-hit` | Wrong answer sound cue |

## Controls

- **Left Arrow / A:** Move witch to left lane
- **Right Arrow / D:** Move witch to right lane
- **Touch/Click:** Tap directly on a door to select it

## Technical Implementation

### State Management
- `GameState` interface with lives, timer, score, current lane
- Deterministic state updates via pure functions
- Separate game logic from rendering

### Perspective System
- Vanishing point calculated on create and resize
- Lane positions interpolated based on Y depth
- Convergence factor: `(objectY - vpY) / (height - vpY)`
- Door scale: 0.5-0.6 based on perspective depth

### Responsive Layout
- Compact (portrait) and wide (landscape) support
- Vanishing point recalculated on resize
- Dynamic scaling of witch, doors, and corridor

### Lifecycle
- Proper cleanup of listeners, timers, and animations
- Uses `context.assets.resolve()` for all palette assets
- Emits `GameResults` exactly once via `context.complete()`

## Palette Compliance

- All assets resolved through `context.assets.resolve(role)`
- No hard-coded URLs, paths, or filenames
- Required credit: **Pixel art assets by ElvGames**
- Uses only frozen Crystal Courier palette roles
