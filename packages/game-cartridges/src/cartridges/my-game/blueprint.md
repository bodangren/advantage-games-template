# SpellLab Potion Master — Blueprint

## Game Concept
An alchemy-themed vocabulary puzzle game where players drag enchanted potion bottles into a mystical cauldron to spell English words.

## Player Verb
Drag bottles to the cauldron (or tap) to pour letters in the correct spelling order.

## Learning Mode
Vocabulary — English words with Thai translations, organized by phonics patterns.

## Input Mode
Vocabulary — array of `{ term, translation }` records.

## Core Loop
1. Target word is displayed at the top with Thai translation
2. Potion bottles appear at the bottom with shuffled letters
3. Player drags/taps bottles to pour letters into the cauldron
4. Correct letter → bottle pours, letter appears in cauldron
5. Wrong letter → cauldron shakes, word restarts
6. Word complete → sparkle effect, move to next word
7. Every 5 words → full-screen review card
8. After 10 words → star rating + final review

## Phonics System
- **Batch 1 (Medium):** Consonant blends + digraphs (ghost, dream, queen, beach, bridge)
- **Batch 2 (Hard):** Silent letters + complex patterns (knight, phone, watch, mouse, cheese)
- Letters are grouped into bottles based on phonics (onset/rime)

## Controls
- **Touch/Pointer:** Drag bottles to cauldron, or tap to pour
- **Keyboard:** Press 1-5 to select bottle, Enter to pour

## Correct Consequence
- Letter appears in cauldron with sparkle effect
- Score increases by 100 × word length

## Incorrect Consequence
- Cauldron shake animation
- Word restarts with re-shuffled bottles

## Win Condition
Spell all 10 words correctly.

## Star Rating
- 3 stars = 90%+ accuracy
- 2 stars = 70%+ accuracy
- 1 star = below 70%

## Features
- Starred Words system (localStorage persistence)
- How to Play on first play + help button in corner
- Review cards after every 5 words
- Cult of the Lamb inspired procedural art style

## Viewport Support
- Compact portrait: 390×844
- Wide landscape: 1440×900

## Art Style
- Dark mystical background with subtle geometric patterns
- Ornate cauldron with bubbling liquid and rune decorations
- Colorful potion bottles with carved letters
- Glow effects, sparkles, and particle animations
- Cult of the Lamb inspired aesthetic (gothic, moody, whimsical)
