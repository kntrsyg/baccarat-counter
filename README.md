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
- STATISTICAL FORECAST with confidence score, conservative EV, reasons, and warnings
- Web Worker Monte Carlo execution with stale-result protection
- Configurable Player / Banker / Tie card weights, Target Score threshold, and Tie Alert threshold
- Configurable Banker commission, Tie profit payout, minimum bet EV, and simulation trials
- Configurable Forecast ON/OFF, minimum forecast EV, confidence thresholds, conservative EV requirement, minimum trials, and reason display
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

## Statistical Forecast

The forecast engine combines the current remaining-card composition, Monte Carlo probabilities, payout-based EV, EOR Count Target, Target Score, simulation error, and estimated games before the cut card. It does not claim certainty and does not use streaks, roads, or recent win/loss flow.

Forecast recommendation rules:

- EV is the first gate. If the highest EV is below `minimumForecastEV`, the forecast is `No Bet`.
- EOR Count Signal is used only for agreement scoring, not as an EV adjustment.
- Conservative EV uses 95% Monte Carlo confidence intervals.
- Confidence score is capped at 100 and combines EV, conservative EV, probability edge, count agreement, simulation stability, and penetration.
- Cut card zone stops the forecast and returns `No Bet`.

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
pnpm run test:forecast
pnpm run test:storage
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
