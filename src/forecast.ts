import { tieBreakEvenProbability } from './evMath';
import type {
  ConfidenceLevel,
  ForecastInputs,
  ForecastResult,
  ForecastTarget,
  ProbabilityInterval,
} from './types';

type ForecastCandidate = Exclude<ForecastTarget, 'No Bet'>;

const FORECAST_CANDIDATES: ForecastCandidate[] = ['Player', 'Banker', 'Tie'];

export function createForecast(inputs: ForecastInputs): ForecastResult {
  const intervals = createProbabilityIntervals(inputs);
  const best = findHighestEVTarget(inputs);
  const bestProbability = getProbability(best.target, inputs);
  const probabilityEdge = calculateProbabilityEdge(best.target, inputs);
  const countAgreement = calculateCountAgreement(best.target, inputs);
  const conservativeEV = calculateConservativeEV(best.target, inputs, intervals);
  const simulationMargin = intervals[best.target].margin95;
  const simulationStable = inputs.simulation.trialCount >= 100_000 && simulationMargin <= 0.005;
  const estimatedGamesToCut = estimateGamesToCut(inputs.restCards, inputs.cutCards);

  if (inputs.restCards <= inputs.cutCards) {
    return noBetForecast(inputs, intervals, {
      recommendedEV: best.ev,
      conservativeEV,
      probability: bestProbability,
      probabilityEdge,
      reasons: ['Cut card zone has been reached.', 'Forecast is stopped near the end of the shoe.'],
      warnings: ['COUNT RESET is recommended before continuing.'],
    });
  }

  if (best.ev < inputs.settings.minimumForecastEV) {
    return noBetForecast(inputs, intervals, {
      recommendedEV: best.ev,
      conservativeEV,
      probability: bestProbability,
      probabilityEdge,
      reasons: [
        'All EV candidates are below the minimum forecast threshold.',
        'Monte Carlo probabilities do not show a sufficient positive edge.',
      ],
      warnings: buildCommonWarnings(inputs, simulationMargin, conservativeEV),
    });
  }

  const score = calculateConfidenceScore({
    ev: best.ev,
    conservativeEV,
    probabilityEdge,
    countAgreement,
    simulationTrials: inputs.simulation.trialCount,
    confidenceMargin95: simulationMargin,
    restCards: inputs.restCards,
    totalCards: inputs.totalCards,
  });
  const conservativeAllowed = conservativeEV > 0 || !inputs.settings.conservativeEVRequired;
  const target: ForecastTarget = conservativeAllowed ? best.target : 'No Bet';
  const confidenceLevel = forceLowConfidence(
    getConfidenceLevel(score, inputs.settings.confidenceLowMax, inputs.settings.confidenceMidMax),
    conservativeEV,
    inputs.simulation.trialCount,
    inputs.settings.minimumForecastTrials,
  );
  const reasons = buildForecastReasons(best.target, inputs, {
    countAgreement,
    conservativeEV,
    probabilityEdge,
    simulationStable,
  });
  const warnings = buildCommonWarnings(inputs, simulationMargin, conservativeEV);

  if (best.target === 'Tie') {
    warnings.unshift('Tie has high variance and should not be treated as a strong certainty.');
  }

  if (target === 'No Bet' && conservativeEV <= 0) {
    reasons.unshift('Conservative EV is not positive after Monte Carlo error is considered.');
  }

  return {
    target,
    confidenceScore: Math.round(score),
    confidenceLevel,
    recommendedEV: best.ev,
    conservativeEV,
    probability: bestProbability,
    probabilityEdge,
    countAgreement,
    simulationStable,
    simulationTrials: inputs.simulation.trialCount,
    estimatedGamesToCut,
    intervals,
    reasons: unique(reasons).slice(0, 4),
    warnings: unique(warnings).slice(0, 4),
  };
}

export function standardError(probability: number, trials: number) {
  if (trials <= 0) return 0;
  return Math.sqrt(probability * (1 - probability) / trials);
}

export function confidenceMargin95(probability: number, trials: number) {
  return 1.96 * standardError(probability, trials);
}

export function getEVScore(ev: number) {
  if (ev <= 0) return 0;
  if (ev >= 0.05) return 40;
  return (ev / 0.05) * 40;
}

export function getConservativeEVScore(conservativeEV: number) {
  if (conservativeEV <= 0) return 0;
  if (conservativeEV >= 0.03) return 20;
  return (conservativeEV / 0.03) * 20;
}

export function getProbabilityEdgeScore(edge: number) {
  if (edge <= 0.01) return 0;
  if (edge >= 0.04) return 15;
  return ((edge - 0.01) / 0.03) * 15;
}

export function getSimulationStabilityScore(trials: number, margin95: number) {
  let score = 0;
  if (trials >= 500_000) score = 10;
  else if (trials >= 100_000) score = 8;
  else if (trials >= 50_000) score = 6;
  else if (trials >= 10_000) score = 3;

  if (margin95 > 0.005) score -= 2;
  return Math.max(0, score);
}

export function getPenetrationScore(penetration: number) {
  if (penetration < 0.2) return 0;
  if (penetration < 0.4) return 1;
  if (penetration < 0.55) return 3;
  return 5;
}

export function getConfidenceLevel(score: number, lowMax = 45, midMax = 70): ConfidenceLevel {
  if (score < lowMax) return 'LOW';
  if (score < midMax) return 'MID';
  return 'HIGH';
}

export function calculateConservativeEV(
  target: ForecastCandidate,
  inputs: ForecastInputs,
  intervals = createProbabilityIntervals(inputs),
) {
  if (target === 'Player') {
    return intervals.Player.lower95 - intervals.Banker.upper95;
  }
  if (target === 'Banker') {
    return intervals.Banker.lower95 * (1 - inputs.settings.bankerCommissionRate) - intervals.Player.upper95;
  }
  return intervals.Tie.lower95 * inputs.settings.tieProfitPayout - (1 - intervals.Tie.lower95);
}

function createProbabilityIntervals(inputs: ForecastInputs): Record<ForecastCandidate, ProbabilityInterval> {
  return {
    Player: createInterval(inputs.simulation.playerWin, inputs.simulation.trialCount),
    Banker: createInterval(inputs.simulation.bankerWin, inputs.simulation.trialCount),
    Tie: createInterval(inputs.simulation.tie, inputs.simulation.trialCount),
  };
}

function createInterval(probability: number, trials: number): ProbabilityInterval {
  const margin95 = confidenceMargin95(probability, trials);
  return {
    lower95: Math.max(0, probability - margin95),
    upper95: Math.min(1, probability + margin95),
    margin95,
  };
}

function findHighestEVTarget(inputs: ForecastInputs) {
  const evMap: Record<ForecastCandidate, number> = {
    Player: inputs.evResult.playerEV,
    Banker: inputs.evResult.bankerEV,
    Tie: inputs.evResult.tieEV,
  };

  return FORECAST_CANDIDATES
    .map((target) => ({ target, ev: evMap[target] }))
    .sort((a, b) => b.ev - a.ev)[0];
}

function getProbability(target: ForecastCandidate, inputs: ForecastInputs) {
  if (target === 'Player') return inputs.simulation.playerWin;
  if (target === 'Banker') return inputs.simulation.bankerWin;
  return inputs.simulation.tie;
}

function calculateProbabilityEdge(target: ForecastCandidate, inputs: ForecastInputs) {
  if (target === 'Tie') {
    return inputs.simulation.tie - tieBreakEvenProbability(inputs.settings.tieProfitPayout);
  }
  return Math.abs(inputs.simulation.playerWin - inputs.simulation.bankerWin);
}

function calculateCountAgreement(target: ForecastCandidate, inputs: ForecastInputs) {
  if (target === 'Tie') return inputs.tieAlert;
  return target === inputs.countTarget;
}

function calculateConfidenceScore({
  ev,
  conservativeEV,
  probabilityEdge,
  countAgreement,
  simulationTrials,
  confidenceMargin95,
  restCards,
  totalCards,
}: {
  ev: number;
  conservativeEV: number;
  probabilityEdge: number;
  countAgreement: boolean;
  simulationTrials: number;
  confidenceMargin95: number;
  restCards: number;
  totalCards: number;
}) {
  const penetration = totalCards > 0 ? 1 - restCards / totalCards : 0;
  const score =
    getEVScore(ev)
    + getConservativeEVScore(conservativeEV)
    + getProbabilityEdgeScore(probabilityEdge)
    + (countAgreement ? 10 : 0)
    + getSimulationStabilityScore(simulationTrials, confidenceMargin95)
    + getPenetrationScore(penetration);

  return Math.max(0, Math.min(100, score));
}

function forceLowConfidence(
  level: ConfidenceLevel,
  conservativeEV: number,
  trials: number,
  minimumTrials: number,
): ConfidenceLevel {
  if (conservativeEV <= 0) return 'LOW';
  if (trials < minimumTrials) return 'LOW';
  return level;
}

function buildForecastReasons(
  target: ForecastCandidate,
  inputs: ForecastInputs,
  flags: {
    countAgreement: boolean;
    conservativeEV: number;
    probabilityEdge: number;
    simulationStable: boolean;
  },
) {
  const reasons = [`${target} EV is the highest current payout-based EV candidate.`];
  if (flags.conservativeEV > 0) {
    reasons.push('Conservative EV remains positive after Monte Carlo error is considered.');
  }
  if (flags.countAgreement) {
    reasons.push(target === 'Tie' ? 'Tie Alert agrees with the EV candidate.' : 'Count Target agrees with the EV direction.');
  }
  if (flags.probabilityEdge > 0.01) {
    reasons.push('Probability edge is above the base comparison threshold.');
  }
  if (flags.simulationStable) {
    reasons.push(`${inputs.simulation.trialCount.toLocaleString('en-US')} trials meet the stability threshold.`);
  }
  return reasons;
}

function buildCommonWarnings(inputs: ForecastInputs, margin95: number, conservativeEV: number) {
  const warnings: string[] = [];
  if (conservativeEV <= 0) {
    warnings.push('Monte Carlo error may remove the apparent edge.');
  }
  if (inputs.simulation.trialCount < inputs.settings.minimumForecastTrials) {
    warnings.push('Simulation trials are below the configured forecast minimum.');
  }
  if (margin95 > 0.005) {
    warnings.push('95% confidence interval is relatively wide.');
  }
  if (inputs.restCards <= inputs.cutCards) {
    warnings.push('Cut card zone reached; forecast is suspended.');
  }
  return warnings;
}

function noBetForecast(
  inputs: ForecastInputs,
  intervals: Record<ForecastCandidate, ProbabilityInterval>,
  overrides: {
    recommendedEV: number;
    conservativeEV: number;
    probability: number;
    probabilityEdge: number;
    reasons: string[];
    warnings: string[];
  },
): ForecastResult {
  return {
    target: 'No Bet',
    confidenceScore: 0,
    confidenceLevel: 'LOW',
    recommendedEV: overrides.recommendedEV,
    conservativeEV: overrides.conservativeEV,
    probability: overrides.probability,
    probabilityEdge: overrides.probabilityEdge,
    countAgreement: false,
    simulationStable: inputs.simulation.trialCount >= 100_000,
    simulationTrials: inputs.simulation.trialCount,
    estimatedGamesToCut: estimateGamesToCut(inputs.restCards, inputs.cutCards),
    intervals,
    reasons: unique(overrides.reasons).slice(0, 4),
    warnings: unique(overrides.warnings).slice(0, 4),
  };
}

function estimateGamesToCut(restCards: number, cutCards: number) {
  return Math.max(0, Math.floor((restCards - cutCards) / 6));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
