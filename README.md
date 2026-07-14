# Baccarat Counting Tool

A React, TypeScript, Vite, and Tailwind CSS web app for baccarat card tracking and statistics assistance.

## Features

- Card input buttons: A, 2, 3, 4, 5, 6, 7, 8, 9, 10
- The 10 button represents 10 / J / Q / K
- UNDO, COUNT RESET, and CONFIG controls
- Deck count options: 1 / 2 / 4 / 6 / 8
- Remaining card counts and ratios
- EOR-style Player / Banker / Tie running counts
- Player TC, Banker TC, Tie TC, and Target Score
- Legacy Bet-RC, Bet-TC, and Effective TC detail display
- TargetOrder, BetOrder, Tie Alert, and Best Bet
- Player, Banker, and Tie probabilities
- Player, Banker, and Tie EV display
- Win counts from 10,000 Monte Carlo trials
- Best Bet selects the highest positive EV; otherwise it displays No Bet
- Configurable Player / Banker / Tie card weights, Target Score threshold, and Tie Alert threshold
- localStorage persistence
- No external network calls from the app

## Counting Model

The main decision engine uses separate EOR-style weights for Player, Banker, and Tie. Each entered card updates `playerRC`, `bankerRC`, and `tieRC`; each RC is converted to TC using the cut-card adjusted effective deck count. `Target Score = Player TC - Banker TC`.

The included EOR values are temporary starting parameters for the first implementation and can be adjusted in CONFIG after practical testing and verification.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage

## Local Development

```bash
pnpm install
pnpm run dev
```

## Build

```bash
pnpm run build
```

## Preview

```bash
pnpm run preview
```

## Vercel Deploy

The Vercel configuration is included in `vercel.json`.

- Framework Preset: `Vite`
- Build Command: `pnpm run build`
- Output Directory: `dist`

## Disclaimer

This app does not guarantee gambling wins or profit. It is intended only as a card tracking and statistics assistance tool.
