import { EMPTY_SIMULATION_RESULT, MONTE_CARLO_TRIALS, RANKS } from './constants';
import type {
  BestBet,
  BetOrder,
  CountValues,
  Rank,
  SimulationResult,
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

export function playerEv(result: SimulationResult) {
  return result.playerWin - result.bankerWin;
}

export function bankerEv(result: SimulationResult) {
  return result.bankerWin * 0.95 - result.playerWin;
}

export function tieEv(tieProbability: number) {
  return tieProbability * 9 - (1 - tieProbability);
}

export function bestBet(result: SimulationResult): BestBet {
  const candidates: Array<{ name: Exclude<BestBet, 'No Bet'>; ev: number }> = [
    { name: 'Player', ev: playerEv(result) },
    { name: 'Banker', ev: bankerEv(result) },
    { name: 'Tie', ev: tieEv(result.tie) },
  ];
  const best = candidates.reduce((current, candidate) => candidate.ev > current.ev ? candidate : current);
  return best.ev > 0 ? best.name : 'No Bet';
}

export function remainingPercent(shoe: Shoe, rank: Rank) {
  const rest = totalCards(shoe);
  if (rest <= 0) return 0;
  return shoe[rank] / rest;
}

export function estimateProbabilities(shoe: Shoe, trials = MONTE_CARLO_TRIALS): SimulationResult {
  if (totalCards(shoe) < 6) return { ...EMPTY_SIMULATION_RESULT, trialCount: trials };

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

  return {
    playerWin: playerWin / trials,
    bankerWin: bankerWin / trials,
    tie: tie / trials,
    playerWinCount: playerWin,
    bankerWinCount: bankerWin,
    tieCount: tie,
    trialCount: trials,
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
