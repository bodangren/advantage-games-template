# Game Blueprint

Replace this starter blueprint before implementation.

## Learning Goal

- Input mode: vocabulary
- Learning action: choose the matching translation
- Required language behavior: show every term and translation without truncation

## Mechanic

- Player verb: select one of two answers
- Repeated action: read, choose, receive feedback, continue
- Correct consequence: advance and add score
- Incorrect consequence: advance without score
- Win condition: answer every supplied item
- Lose condition: none in the starter

## Controls

- Pointer or touch: select an answer
- Keyboard: use `1` or `2`

## Responsive Plan

- Compact `390x844`: stack the prompt, actor, and answers vertically.
- Wide `1440x900`: place answers side by side.
- Preserve the current question and score during recomposition.

## Asset Requirements

Declare semantic keys in `manifest.ts`. Do not add physical paths or remote URLs.

## Results

Call the supplied completion boundary once with `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`.
