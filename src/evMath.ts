import type { BestBet, BetStrength, EvResult, EvSettings, SimulationResult } from './types';

export function playerEv(result: SimulationResult) {
  return result.playerWin - result.bankerWin;
}

export function bankerEv(result: SimulationResult, bankerCommissionRate = 0.05) {
  const bankerNetPayout = 1 - bankerCommissionRate;
  return result.bankerWin * bankerNetPayout - result.playerWin;
}

export function tieEv(tieProbability: number, tieProfitPayout = 9) {
  return tieProbability * tieProfitPayout - (1 - tieProbability);
}

export function tieBreakEvenProbability(tieProfitPayout = 9) {
  return 1 / (tieProfitPayout + 1);
}

export function getBetStrength(ev: number): BetStrength {
  if (ev < 0.01) return 'NONE';
  if (ev < 0.02) return 'LOW';
  if (ev < 0.04) return 'MID';
  return 'HIGH';
}

export function calculateEv(result: SimulationResult, settings: EvSettings): EvResult {
  const playerEV = playerEv(result);
  const bankerEV = bankerEv(result, settings.bankerCommissionRate);
  const tieEV = tieEv(result.tie, settings.tieProfitPayout);
  const candidates: Array<{ name: Exclude<BestBet, 'No Bet'>; ev: number }> = [
    { name: 'Player', ev: playerEV },
    { name: 'Banker', ev: bankerEV },
    { name: 'Tie', ev: tieEV },
  ];
  const best = candidates.reduce((current, candidate) => candidate.ev > current.ev ? candidate : current);
  const bestBet = best.ev >= settings.minimumBetEV ? best.name : 'No Bet';

  return {
    playerEV,
    bankerEV,
    tieEV,
    bestEV: best.ev,
    bestBet,
    strength: getBetStrength(best.ev),
  };
}

export function bestBet(result: SimulationResult, settings: EvSettings): BestBet {
  return calculateEv(result, settings).bestBet;
}

export function probabilitySum(result: SimulationResult) {
  return result.playerWin + result.bankerWin + result.tie;
}

export function probabilitySumWarning(result: SimulationResult) {
  const hits = result.playerWinCount + result.bankerWinCount + result.tieCount;
  if (hits === 0) return false;
  if (hits !== result.trialCount) return true;
  const sum = probabilitySum(result);
  return Number.isFinite(sum) && Math.abs(sum - 1) > 0.001;
}

export function formatEvPercent(ev: number) {
  if (!Number.isFinite(ev)) return '--';
  const formatted = ev.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return ev > 0 ? `+${formatted}` : formatted;
}
