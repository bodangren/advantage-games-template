# Gem Miner Word Spell — Blueprint

- Player verb: dig a top-down grid floor to reveal glowing letter tiles, collecting letters to spell vocabulary words while dodging sweeping lasers.
- Learning mode: vocabulary (spelling practice; words come from `context.input`, merged with a built-in mining-themed fallback deck of 20 words: 10 four-letter easy + 10 five-letter hard).
- Easy-word letters (4 letters) render small and lime green; hard-word letters (5 letters) render larger and neon yellow.
- Core loop: move (WASD/arrows or drag) → dig a cell (SPACE or tap/click) → collect a letter → pick one of the 10 active goal words (tap card or keys 1-0) → when all of that goal's letters are collected it completes → 10-second aura of invulnerability.
- Goal words are hidden during play: each card shows only the Thai meaning and blank slots (`_ _ _ _`) for the word length, so the player spells from memory. The English word appears only after it is completed.
- Every run deals a fresh random set of 10 words (5 easy + 5 hard) sampled from the full pool, so winning or losing never replays the same set.
- Goal rotation: letters from all 20 deck words are scattered from the start, but only 10 words are active goals at a time. There is no time limit; goals rotate when the mine floor runs out of letters. Words still being spelled always return in the next round until fully spelled. Collected letters persist in the bag across rounds, so progress never resets.
- Met = fully spelled: a word is only counted as cleared/encountered when its complete letter set has been collected. Partially spelled words stay uncleared and are re-offered as goals in later rounds.
- Correct consequence: word completes, score increases (100 easy / 200 hard), aura activates for 10 s.
- Incorrect consequence: none per letter; progress is by accumulation. Only lasers hurt.
- Obstacles: lasers fire continuously (never stopping) every 2/3/4 seconds (random interval) until the game ends, always preceded by a guide line that reveals its direction (vertical, horizontal, diagonal-left, diagonal-right) and then sweeps across the board.
- Damage: a laser hit costs 1 HP (of 15 max) plus a short invulnerable blink (~1 s); completing a word grants 10 s of aura so lasers pass through harmlessly.
- Win condition: spell 10 words (any easy/hard mix). On win, word cards pop up with a star button to save each word for later review on the Starred Words screen.
- Controls: keyboard WASD/arrows + SPACE + number keys 1-0 to pick goals; touch/pointer drag to steer + tap to dig + tap a goal card to select it.
- Both compact 390x844 and wide 1440x900 layouts are composed intentionally from the same source.
