import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/evMath.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
});

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const {
  bankerEv,
  calculateEv,
  formatEvPercent,
  getBetStrength,
  playerEv,
  probabilitySumWarning,
  tieBreakEvenProbability,
  tieEv,
} = await import(moduleUrl);

const settings = {
  bankerCommissionRate: 0.05,
  tieProfitPayout: 9,
  minimumBetEV: 0.01,
};

const result = {
  playerWin: 0.446,
  bankerWin: 0.459,
  tie: 0.095,
  playerWinCount: 446,
  bankerWinCount: 459,
  tieCount: 95,
  trialCount: 1000,
};

function approx(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`);
}

approx(playerEv(result), -0.013);
assert.equal(formatEvPercent(playerEv(result)), '-1.30%');

approx(bankerEv(result, settings.bankerCommissionRate), -0.009949999999999959);
assert.equal(formatEvPercent(bankerEv(result, settings.bankerCommissionRate)), '-1.00%');

approx(tieEv(result.tie, settings.tieProfitPayout), -0.04999999999999993);
assert.equal(formatEvPercent(tieEv(result.tie, settings.tieProfitPayout)), '-5.00%');

approx(tieBreakEvenProbability(settings.tieProfitPayout), 0.1);
approx(tieEv(0.1, settings.tieProfitPayout), 0);
approx(tieEv(0.105, settings.tieProfitPayout), 0.050000000000000044);
assert.equal(formatEvPercent(tieEv(0.105, settings.tieProfitPayout)), '+5.00%');

assert.equal(calculateEv(result, settings).bestBet, 'No Bet');
assert.equal(getBetStrength(0.0099), 'NONE');
assert.equal(getBetStrength(0.01), 'LOW');
assert.equal(getBetStrength(0.02), 'MID');
assert.equal(getBetStrength(0.04), 'HIGH');
assert.equal(probabilitySumWarning(result), false);
assert.equal(formatEvPercent(Number.NaN), '--');
assert.equal(formatEvPercent(Number.POSITIVE_INFINITY), '--');

console.log('EV formula tests passed');
