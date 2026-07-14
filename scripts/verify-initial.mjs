import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function transpileSource(path) {
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

const evMathUrl = dataUrl(await transpileSource('../src/evMath.ts'));
const constantsUrl = dataUrl(await transpileSource('../src/constants.ts'));
const baccaratSource = (await transpileSource('../src/baccarat.ts'))
  .replaceAll("'./constants'", `'${constantsUrl}'`)
  .replaceAll("'./evMath'", `'${evMathUrl}'`);
const baccarat = await import(dataUrl(baccaratSource));

const shoe = baccarat.createInitialShoe(8);
const simulation = baccarat.estimateProbabilities(shoe, 100_000);
const ev = baccarat.calculateEv(simulation, {
  bankerCommissionRate: 0.05,
  tieProfitPayout: 9,
  minimumBetEV: 0.01,
});

console.log(JSON.stringify({
  playerProbability: simulation.playerWin,
  bankerProbability: simulation.bankerWin,
  tieProbability: simulation.tie,
  playerHits: simulation.playerWinCount,
  bankerHits: simulation.bankerWinCount,
  tieHits: simulation.tieCount,
  simulationTrials: simulation.trialCount,
  probabilitySum: baccarat.probabilitySum(simulation),
  probabilityWarning: baccarat.probabilitySumWarning(simulation),
  playerEV: ev.playerEV,
  bankerEV: ev.bankerEV,
  tieEV: ev.tieEV,
  bestEV: ev.bestEV,
  bestEVBet: ev.bestBet,
  evStrength: ev.strength,
}, null, 2));
