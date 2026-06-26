import { DEFAULT_SETTINGS, RANKS } from './constants';
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

    return {
      deckCount,
      cutCards: normalizeNumber(parsed.cutCards, DEFAULT_SETTINGS.cutCards, 1, 416),
      countValues,
      tieThreshold: normalizeNumber(parsed.tieThreshold, DEFAULT_SETTINGS.tieThreshold, 0, 1),
      pairThreshold: normalizeNumber(parsed.pairThreshold, DEFAULT_SETTINGS.pairThreshold, 0, 1),
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
