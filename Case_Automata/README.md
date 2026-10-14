# CASE: AUTOMATA

A small cozy pixel-art mystery game for learning the connection between Regular Expression patterns and Deterministic Finite Automata (DFA).

## Run

Open `index.html` in a modern browser.

No backend, database, build step, or package installation is required.

## Gameplay

1. Read the case clue.
2. Select all passwords that match the pattern.
3. The DFA appears with visible q-states.
4. Read the highlighted input symbol.
5. Choose the q-state the machine should move to.
6. Complete all five locks and open the archive.

## Tech

- HTML
- CSS
- Vanilla JavaScript
- Inline SVG for the DFA state diagrams
- CSS pixel-art scene elements

## Project scope

The game uses five predefined patterns and five small DFA machines. It intentionally avoids a general-purpose regular-expression parser or automatic DFA generator so the project remains a manageable micro-project while still demonstrating state transitions clearly.
