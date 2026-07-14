import { DEFAULT_SETTINGS, RANKS, SIMULATION_TRIAL_OPTIONS } from './constants';
import type { Rank, Settings } from './types';

const SETTINGS_KEY = 'baccarat-counter.settings.v1';
const HISTORY_KEY = 'baccarat-counter.history.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<Settings>;
    const deckCount = [1, 2, 4, 6, 8].includes(parsed.deckCount ?? 0)
      ? parsed.deckCount!
      : DEFAULT_SETTINGS.deckCount;

    const countValues = { ...DEFAULT_SETTINGS.countValues };
    for (const rank of RANKS) {
      const value = parsed.countValues?.[rank];
      if (Number.isFinite(value)) {
        countValues[rank] = Number(value);
      }
    }

    const eorWeights = { ...DEFAULT_SETTINGS.eorWeights };
    for (const rank of RANKS) {
      eorWeights[rank] = { ...DEFAULT_SETTINGS.eorWeights[rank] };
      const saved = parsed.eorWeights?.[rank];
      const player = saved?.player;
      const banker = saved?.banker;
      const tie = saved?.tie;
      if (Number.isFinite(player)) eorWeights[rank].player = Number(player);
      if (Number.isFinite(banker)) eorWeights[rank].banker = Number(banker);
      if (Number.isFinite(tie)) eorWeights[rank].tie = Number(tie);
    }

    return {
      deckCount,
      cutCards: normalizeNumber(parsed.cutCards, DEFAULT_SETTINGS.cutCards, 1, 416),
      countValues,
      eorWeights,
      targetScoreThreshold: normalizeNumber(
        parsed.targetScoreThreshold,
        DEFAULT_SETTINGS.targetScoreThreshold,
        0.1,
        99,
      ),
      tieAlertThreshold: normalizeNumber(parsed.tieAlertThreshold, DEFAULT_SETTINGS.tieAlertThreshold, 0.1, 99),
      bankerCommissionRate: normalizeNumber(
        parsed.bankerCommissionRate,
        DEFAULT_SETTINGS.bankerCommissionRate,
        0,
        1,
      ),
      tieProfitPayout: normalizeNumber(parsed.tieProfitPayout, DEFAULT_SETTINGS.tieProfitPayout, 1, 99),
      minimumBetEV: normalizeNumber(parsed.minimumBetEV, DEFAULT_SETTINGS.minimumBetEV, -1, 1),
      simulationTrials: normalizeSimulationTrials(parsed.simulationTrials),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadHistory(): Rank[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((rank): rank is Rank => RANKS.includes(rank));
  } catch {
    return [];
  }
}

export function saveHistory(history: Rank[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeSimulationTrials(value: unknown) {
  const numeric = Number(value);
  return SIMULATION_TRIAL_OPTIONS.includes(numeric) ? numeric : DEFAULT_SETTINGS.simulationTrials;
}
