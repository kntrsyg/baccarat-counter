import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function transpile(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

const evMathUrl = dataUrl(await transpile('../src/evMath.ts'));
const forecastUrl = dataUrl((await transpile('../src/forecast.ts')).replaceAll("'./evMath'", `'${evMathUrl}'`));
const evMath = await import(evMathUrl);
const forecastModule = await import(forecastUrl);

const baseSettings = {
  bankerCommissionRate: 0.05,
  tieProfitPayout: 9,
  minimumBetEV: 0.01,
  minimumForecastEV: 0.01,
  confidenceLowMax: 45,
  confidenceMidMax: 70,
  conservativeEVRequired: true,
  minimumForecastTrials: 100_000,
  showForecastReasons: true,
};

function simulation(player, banker, tie, trials = 100_000) {
  return {
    playerWin: player,
    bankerWin: banker,
    tie,
    playerWinCount: Math.round(player * trials),
    bankerWinCount: Math.round(banker * trials),
    tieCount: trials - Math.round(player * trials) - Math.round(banker * trials),
    trialCount: trials,
  };
}

function makeForecast(simulationResult, overrides = {}) {
  const settings = { ...baseSettings, ...overrides.settings };
  const evResult = evMath.calculateEv(simulationResult, settings);
  return forecastModule.createForecast({
    simulation: simulationResult,
    evResult,
    countTarget: overrides.countTarget ?? 'Player',
    targetScore: overrides.targetScore ?? 1.4,
    tieAlert: overrides.tieAlert ?? false,
    restCards: overrides.restCards ?? 360,
    totalCards: 416,
    cutCards: 166,
    effectiveRest: 194,
    settings,
  });
}

assert.equal(makeForecast(simulation(0.446, 0.459, 0.095)).target, 'No Bet');
assert.equal(makeForecast(simulation(0.52, 0.39, 0.09)).target, 'Player');
assert.equal(makeForecast(simulation(0.39, 0.53, 0.08), { countTarget: 'Banker' }).target, 'Banker');
assert.equal(makeForecast(simulation(0.43, 0.44, 0.13), { countTarget: 'No Bet', tieAlert: true }).target, 'Tie');

const apparentTie = makeForecast(simulation(0.449, 0.45, 0.101, 10_000), {
  settings: { minimumForecastEV: 0.001 },
  tieAlert: true,
});
assert.equal(apparentTie.target, 'No Bet');
assert.equal(apparentTie.confidenceLevel, 'LOW');

const agreement = makeForecast(simulation(0.52, 0.39, 0.09), { countTarget: 'Player' });
assert.equal(agreement.countAgreement, true);

const disagreement = makeForecast(simulation(0.52, 0.39, 0.09), { countTarget: 'Banker' });
assert.equal(disagreement.countAgreement, false);
assert.equal(disagreement.recommendedEV, agreement.recommendedEV);

const lowTrials = makeForecast(simulation(0.52, 0.39, 0.09, 5_000), {
  settings: { minimumForecastTrials: 100_000 },
});
assert.equal(lowTrials.confidenceLevel, 'LOW');

const initial = makeForecast(simulation(0.44483, 0.45908, 0.09609));
assert.equal(initial.target, 'No Bet');
assert.equal(initial.confidenceLevel, 'LOW');

console.log('Forecast tests passed');
