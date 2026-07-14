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
  forecastEnabled: boolean;
  minimumForecastEV: number;
  confidenceLowMax: number;
  confidenceMidMax: number;
  conservativeEVRequired: boolean;
  minimumForecastTrials: number;
  showForecastReasons: boolean;
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

export type ForecastTarget = 'Player' | 'Banker' | 'Tie' | 'No Bet';
export type ConfidenceLevel = 'LOW' | 'MID' | 'HIGH';

export type ForecastSettings = {
  minimumForecastEV: number;
  confidenceLowMax: number;
  confidenceMidMax: number;
  conservativeEVRequired: boolean;
  minimumForecastTrials: number;
  showForecastReasons: boolean;
  bankerCommissionRate: number;
  tieProfitPayout: number;
};

export type ForecastInputs = {
  simulation: SimulationResult;
  evResult: EvResult;
  countTarget: TargetOrder;
  targetScore: number;
  tieAlert: boolean;
  restCards: number;
  totalCards: number;
  cutCards: number;
  effectiveRest: number;
  settings: ForecastSettings;
};

export type ProbabilityInterval = {
  lower95: number;
  upper95: number;
  margin95: number;
};

export type ForecastResult = {
  target: ForecastTarget;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  recommendedEV: number;
  conservativeEV: number;
  probability: number;
  probabilityEdge: number;
  countAgreement: boolean;
  simulationStable: boolean;
  simulationTrials: number;
  estimatedGamesToCut: number;
  intervals: Record<Exclude<ForecastTarget, 'No Bet'>, ProbabilityInterval>;
  reasons: string[];
  warnings: string[];
};
