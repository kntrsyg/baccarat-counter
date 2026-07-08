import type { CountValues, Rank, Settings, SimulationResult } from './types';

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

export const DEFAULT_SETTINGS: Settings = {
  deckCount: 8,
  cutCards: 166,
  countValues: DEFAULT_COUNT_VALUES,
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
