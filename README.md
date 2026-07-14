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
- Count Target, Count Signal, Tie Alert, Best EV Bet, Best EV, and EV Strength
- Player, Banker, and Tie probabilities
- Real payout-based Player, Banker, and Tie EV display
- Win counts from configurable Monte Carlo trials
- Best EV Bet uses the highest EV only when it reaches the configured minimum EV
- Configurable Player / Banker / Tie card weights, Target Score threshold, and Tie Alert threshold
- Configurable Banker commission, Tie profit payout, minimum bet EV, and simulation trials
- localStorage persistence
- No external network calls from the app

## Counting Model

The main decision engine uses separate EOR-style weights for Player, Banker, and Tie. Each entered card updates `playerRC`, `bankerRC`, and `tieRC`; each RC is converted to TC using the cut-card adjusted effective deck count. `Target Score = Player TC - Banker TC`.

The included EOR values are temporary starting parameters for the first implementation and can be adjusted in CONFIG after practical testing and verification.

## EV Model

EV is calculated only from the current Player / Banker / Tie probabilities and configured payout rules. EOR counts, RC, TC, and Target Score are signal displays only and do not adjust EV.

- Player EV: `pPlayer - pBanker`
- Banker EV: `pBanker * (1 - bankerCommissionRate) - pPlayer`
- Tie EV: `pTie * tieProfitPayout - (1 - pTie)`
- Default Banker commission: `0.05`
- Default Tie profit payout: `9`
- Default minimum bet EV: `0.01`
- Default simulation trials: `100,000`

Tie profit payout is pure profit. A 9x Tie payout means 9x profit and 10x total return including the stake.

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

## Tests

```bash
pnpm run test:ev
pnpm run verify:initial
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
