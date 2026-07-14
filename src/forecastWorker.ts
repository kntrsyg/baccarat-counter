import { calculateEv, estimateProbabilities } from './baccarat';
import { createForecast } from './forecast';
import type { ForecastResult, Rank, Settings, SimulationResult, TargetOrder } from './types';

type Shoe = Record<Rank, number>;

type ForecastWorkerRequest = {
  requestId: number;
  shoe: Shoe;
  settings: Settings;
  countTarget: TargetOrder;
  targetScore: number;
  tieAlert: boolean;
  restCards: number;
  totalCards: number;
  effectiveRest: number;
};

type ForecastWorkerResponse = {
  requestId: number;
  simulation: SimulationResult;
  forecast: ForecastResult;
};

const MAX_CACHE_ENTRIES = 100;
const cache = new Map<string, ForecastWorkerResponse>();

self.onmessage = (event: MessageEvent<ForecastWorkerRequest>) => {
  try {
    const request = event.data;
    const key = createCacheKey(request);
    const cached = cache.get(key);
    if (cached) {
      postMessage({ ...cached, requestId: request.requestId });
      return;
    }

    const simulation = estimateProbabilities(request.shoe, request.settings.simulationTrials);
    const evResult = calculateEv(simulation, request.settings);
    const forecast = createForecast({
      simulation,
      evResult,
      countTarget: request.countTarget,
      targetScore: request.targetScore,
      tieAlert: request.tieAlert,
      restCards: request.restCards,
      totalCards: request.totalCards,
      cutCards: request.settings.cutCards,
      effectiveRest: request.effectiveRest,
      settings: request.settings,
    });
    const response = { requestId: request.requestId, simulation, forecast };
    cache.set(key, response);
    trimCache();
    postMessage(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Forecast worker failed';
    postMessage({ requestId: event.data.requestId, error: message });
  }
};

function createCacheKey(request: ForecastWorkerRequest) {
  return JSON.stringify({
    remainingCards: request.shoe,
    simulationTrials: request.settings.simulationTrials,
    bankerCommissionRate: request.settings.bankerCommissionRate,
    tieProfitPayout: request.settings.tieProfitPayout,
    cutCards: request.settings.cutCards,
    minimumForecastEV: request.settings.minimumForecastEV,
    confidenceLowMax: request.settings.confidenceLowMax,
    confidenceMidMax: request.settings.confidenceMidMax,
    conservativeEVRequired: request.settings.conservativeEVRequired,
    minimumForecastTrials: request.settings.minimumForecastTrials,
    countTarget: request.countTarget,
    targetScore: request.targetScore,
    tieAlert: request.tieAlert,
    restCards: request.restCards,
  });
}

function trimCache() {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

export {};
