import { EMPTY_PROBABILITIES, MONTE_CARLO_TRIALS, RANKS } from './constants';
import type {
  BestBet,
  BestSideBet,
  BetOrder,
  CountValues,
  Probabilities,
  Rank,
  Settings,
  SideBetName,
  SideBetOrder,
  TargetOrder,
} from './types';

export type Shoe = Record<Rank, number>;

type Winner = 'player' | 'banker' | 'tie';

export function createInitialShoe(deckCount: number): Shoe {
  return Object.fromEntries(
    RANKS.map((rank) => [rank, rank === '10' ? deckCount * 16 : deckCount * 4]),
  ) as Shoe;
}

export function createRemainingShoe(deckCount: number, history: Rank[]): Shoe {
  const shoe = createInitialShoe(deckCount);
  for (const rank of history) {
    shoe[rank] = Math.max(0, shoe[rank] - 1);
  }
  return shoe;
}

export function totalCards(shoe: Shoe) {
  return RANKS.reduce((sum, rank) => sum + shoe[rank], 0);
}

export function runningCount(history: Rank[], countValues: CountValues) {
  return history.reduce((sum, rank) => sum + countValues[rank], 0);
}

export function trueCount(rc: number, rest: number) {
  if (rest <= 0) return 0;
  return rc / (rest / 52);
}

export function effectiveRest(rest: number, cutCards: number) {
  return Math.max(rest - cutCards, 1);
}

export function effectiveTrueCount(rc: number, effectiveCards: number) {
  return rc / (effectiveCards / 52);
}

export function targetOrder(effectiveTc: number): TargetOrder {
  if (effectiveTc >= 1) return 'Player';
  if (effectiveTc <= -1) return 'Banker';
  return 'No Bet';
}

export function betOrder(effectiveTc: number): BetOrder {
  const absolute = Math.abs(effectiveTc);
  if (absolute < 1) return 'NONE';
  if (absolute < 1.5) return 'LOW';
  if (absolute < 2.5) return 'MID';
  return 'HIGH';
}

export function bestBet(target: TargetOrder, probabilities: Probabilities, settings: Settings): BestBet {
  if (target === 'Player') return 'Player';
  if (target === 'Banker') return 'Banker';
  if (probabilities.tie >= settings.tieThreshold) return 'Tie';
  if (probabilities.playerPair >= settings.pairThreshold) return 'Player Pair';
  if (probabilities.bankerPair >= settings.pairThreshold) return 'Banker Pair';
  return 'No Bet';
}

export function tieEv(tieProbability: number) {
  return tieProbability * 9 - (1 - tieProbability);
}

export function pairEv(pairProbability: number) {
  return pairProbability * 11 - (1 - pairProbability);
}

export function sideBetOrder(name: SideBetName, probability: number): SideBetOrder {
  if (name === 'Tie') {
    if (probability >= 0.115) return 'HIGH';
    if (probability >= 0.108) return 'MID';
    if (probability >= 0.103) return 'LOW';
    return 'NONE';
  }

  if (probability >= 0.098) return 'HIGH';
  if (probability >= 0.09) return 'MID';
  if (probability >= 0.085) return 'LOW';
  return 'NONE';
}

export function bestSideBet(probabilities: Probabilities): BestSideBet {
  const candidates: Array<{ name: SideBetName; ev: number }> = [
    { name: 'Tie', ev: tieEv(probabilities.tie) },
    { name: 'Player Pair', ev: pairEv(probabilities.playerPair) },
    { name: 'Banker Pair', ev: pairEv(probabilities.bankerPair) },
  ];

  const best = candidates.reduce((currentBest, candidate) => (candidate.ev > currentBest.ev ? candidate : currentBest));
  return best.ev > 0 ? best.name : 'No Bet';
}

export function remainingPercent(shoe: Shoe, rank: Rank) {
  const rest = totalCards(shoe);
  if (rest <= 0) return 0;
  return shoe[rank] / rest;
}

export function estimateProbabilities(shoe: Shoe, trials = MONTE_CARLO_TRIALS): Probabilities {
  if (totalCards(shoe) < 6) return EMPTY_PROBABILITIES;

  let playerWin = 0;
  let bankerWin = 0;
  let tie = 0;
  const rng = createDeterministicRng();

  for (let i = 0; i < trials; i += 1) {
    const result = simulateGame(shoe, rng);
    if (result === 'player') playerWin += 1;
    if (result === 'banker') bankerWin += 1;
    if (result === 'tie') tie += 1;
  }

  const pair = exactPairProbability(shoe);

  return {
    playerWin: playerWin / trials,
    bankerWin: bankerWin / trials,
    tie: tie / trials,
    playerPair: pair,
    bankerPair: pair,
  };
}

function simulateGame(startingShoe: Shoe, rng: () => number): Winner {
  const shoe = { ...startingShoe };
  const playerCards = [draw(shoe, rng)];
  const bankerCards = [draw(shoe, rng)];
  playerCards.push(draw(shoe, rng));
  bankerCards.push(draw(shoe, rng));

  let playerTotal = baccaratTotal(playerCards);
  let bankerTotal = baccaratTotal(bankerCards);

  if (playerTotal >= 8 || bankerTotal >= 8) {
    return winner(playerTotal, bankerTotal);
  }

  let playerThird: Rank | null = null;
  if (playerTotal <= 5) {
    playerThird = draw(shoe, rng);
    playerCards.push(playerThird);
    playerTotal = baccaratTotal(playerCards);
  }

  if (shouldBankerDraw(bankerTotal, playerThird)) {
    bankerCards.push(draw(shoe, rng));
    bankerTotal = baccaratTotal(bankerCards);
  }

  return winner(playerTotal, bankerTotal);
}

function draw(shoe: Shoe, rng: () => number): Rank {
  const rest = totalCards(shoe);
  let ticket = Math.floor(rng() * rest);

  for (const rank of RANKS) {
    if (ticket < shoe[rank]) {
      shoe[rank] -= 1;
      return rank;
    }
    ticket -= shoe[rank];
  }

  return '10';
}

function createDeterministicRng() {
  let state = 20_260_626;

  return () => {
    state = (1_664_525 * state + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function cardValue(rank: Rank) {
  if (rank === 'A') return 1;
  if (rank === '10') return 0;
  return Number(rank);
}

function baccaratTotal(cards: Rank[]) {
  return cards.reduce((sum, rank) => (sum + cardValue(rank)) % 10, 0);
}

function shouldBankerDraw(bankerTotal: number, playerThird: Rank | null) {
  if (!playerThird) return bankerTotal <= 5;

  const value = cardValue(playerThird);
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return value !== 8;
  if (bankerTotal === 4) return value >= 2 && value <= 7;
  if (bankerTotal === 5) return value >= 4 && value <= 7;
  if (bankerTotal === 6) return value === 6 || value === 7;
  return false;
}

function winner(player: number, banker: number): Winner {
  if (player > banker) return 'player';
  if (banker > player) return 'banker';
  return 'tie';
}

function exactPairProbability(shoe: Shoe) {
  const rest = totalCards(shoe);
  if (rest < 2) return 0;

  const nonTenMatchingPairs = RANKS
    .filter((rank) => rank !== '10')
    .reduce((sum, rank) => sum + shoe[rank] * Math.max(shoe[rank] - 1, 0), 0);
  const tenMatchingPairs = tenRankMatchingPairs(shoe['10']);
  const matchingPairs = nonTenMatchingPairs + tenMatchingPairs;

  return matchingPairs / (rest * (rest - 1));
}

function tenRankMatchingPairs(tenBucketCount: number) {
  const baseCount = Math.floor(tenBucketCount / 4);
  const remainder = tenBucketCount % 4;

  return Array.from({ length: 4 }, (_, index) => baseCount + (index < remainder ? 1 : 0)).reduce(
    (sum, count) => sum + count * Math.max(count - 1, 0),
    0,
  );
}
