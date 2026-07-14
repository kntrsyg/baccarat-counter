export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

export type CountValues = Record<Rank, number>;

export type EorWeights = Record<Rank, {
  player: number;
  banker: number;
  tie: number;
}>;

export type EorCounts = {
  playerRC: number;
  bankerRC: number;
  tieRC: number;
};

export type Settings = {
  deckCount: number;
  cutCards: number;
  countValues: CountValues;
  eorWeights: EorWeights;
  targetScoreThreshold: number;
  tieAlertThreshold: number;
  bankerCommissionRate: number;
  tieProfitPayout: number;
  minimumBetEV: number;
  simulationTrials: number;
};

export type SimulationResult = {
  playerWin: number;
  bankerWin: number;
  tie: number;
  playerWinCount: number;
  bankerWinCount: number;
  tieCount: number;
  trialCount: number;
};

export type TargetOrder = 'Player' | 'Banker' | 'No Bet';
export type BetOrder = 'NONE' | 'LOW' | 'MID' | 'HIGH';
export type BestBet = 'Player' | 'Banker' | 'Tie' | 'No Bet';
export type BetStrength = 'NONE' | 'LOW' | 'MID' | 'HIGH';

export type EvSettings = {
  bankerCommissionRate: number;
  tieProfitPayout: number;
  minimumBetEV: number;
};

export type EvResult = {
  playerEV: number;
  bankerEV: number;
  tieEV: number;
  bestEV: number;
  bestBet: BestBet;
  strength: BetStrength;
};
