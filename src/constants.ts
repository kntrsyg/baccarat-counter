import type { CountValues, EorWeights, Rank, Settings, SimulationResult } from './types';

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const DECK_OPTIONS = [1, 2, 4, 6, 8];
export const MONTE_CARLO_TRIALS = 10_000;

export const DEFAULT_COUNT_VALUES: CountValues = {
  A: -1,
  '2': 1,
  '3': 1,
  '4': 2,
  '5': 2,
  '6': 1,
  '7': 0,
  '8': 0,
  '9': -1,
  '10': -1,
};

export const DEFAULT_EOR_WEIGHTS: EorWeights = {
  A: { player: -1, banker: 1, tie: -1 },
  '2': { player: 0.5, banker: -0.5, tie: 0.5 },
  '3': { player: 1, banker: -1, tie: 1 },
  '4': { player: 1.5, banker: -1.5, tie: 1.5 },
  '5': { player: 1.5, banker: -1.5, tie: 1.5 },
  '6': { player: 1, banker: -1, tie: 1 },
  '7': { player: 0.3, banker: -0.3, tie: 0.2 },
  '8': { player: 0, banker: 0, tie: -0.2 },
  '9': { player: -0.5, banker: 0.5, tie: -0.5 },
  '10': { player: -1, banker: 1, tie: -1 },
};

export const DEFAULT_SETTINGS: Settings = {
  deckCount: 8,
  cutCards: 166,
  countValues: DEFAULT_COUNT_VALUES,
  eorWeights: DEFAULT_EOR_WEIGHTS,
  targetScoreThreshold: 1,
  tieAlertThreshold: 1,
};

export const EMPTY_SIMULATION_RESULT: SimulationResult = {
  playerWin: 0,
  bankerWin: 0,
  tie: 0,
  playerWinCount: 0,
  bankerWinCount: 0,
  tieCount: 0,
  trialCount: MONTE_CARLO_TRIALS,
};
