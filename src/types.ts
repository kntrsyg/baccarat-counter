export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

export type CountValues = Record<Rank, number>;

export type Settings = {
  deckCount: number;
  cutCards: number;
  countValues: CountValues;
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
