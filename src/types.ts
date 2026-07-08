export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

export type CountValues = Record<Rank, number>;

export type Settings = {
  deckCount: number;
  cutCards: number;
  countValues: CountValues;
  tieThreshold: number;
};

export type Probabilities = {
  playerWin: number;
  bankerWin: number;
  tie: number;
};

export type TargetOrder = 'Player' | 'Banker' | 'No Bet';
export type BetOrder = 'NONE' | 'LOW' | 'MID' | 'HIGH';
export type BestBet = 'Player' | 'Banker' | 'Tie' | 'No Bet';
export type TieBetOrder = 'NONE' | 'LOW' | 'MID' | 'HIGH';
