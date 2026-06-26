# Baccarat Counting Tool

A React, TypeScript, Vite, and Tailwind CSS web app for baccarat card tracking and statistics assistance.

## Features

- Card input buttons: A, 2, 3, 4, 5, 6, 7, 8, 9, 10
- The 10 button represents 10 / J / Q / K
- UNDO, COUNT RESET, and CONFIG controls
- Deck count options: 1 / 2 / 4 / 6 / 8
- Remaining card counts and ratios
- Bet-RC, Bet-TC, and Effective TC
- TargetOrder, BetOrder, and Best Side Bet
- Player, Banker, Tie, Player Pair, and Banker Pair probabilities
- Tie and Pair EV display
- localStorage persistence
- No external network calls from the app

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
