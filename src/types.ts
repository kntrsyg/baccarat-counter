export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10';

export type CountValues = Record<Rank, number>;

export type Settings = {
  deckCount: number;
  cutCards: number;
  countValues: CountValues;
  tieThreshold: number;
  pairThreshold: number;
};

export type Probabilities = {
  playerWin: number;
  bankerWin: number;
  tie: number;
  playerPair: number;
  bankerPair: number;
};

export type TargetOrder = 'Player' | 'Banker' | 'No Bet';
export type BetOrder = 'NONE' | 'LOW' | 'MID' | 'HIGH';
export type BestBet = 'Player' | 'Banker' | 'Tie' | 'Player Pair' | 'Banker Pair' | 'No Bet';
export type SideBetName = 'Tie' | 'Player Pair' | 'Banker Pair';
export type SideBetOrder = 'NONE' | 'LOW' | 'MID' | 'HIGH';
export type BestSideBet = SideBetName | 'No Bet';
