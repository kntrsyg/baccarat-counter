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

const constantsUrl = dataUrl(await transpile('../src/constants.ts'));
const storageUrl = dataUrl((await transpile('../src/storage.ts')).replaceAll("'./constants'", `'${constantsUrl}'`));
const storage = new Map();

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const { DEFAULT_SETTINGS } = await import(constantsUrl);
const { loadSettings, saveSettings } = await import(storageUrl);

const next = {
  ...DEFAULT_SETTINGS,
  forecastEnabled: false,
  minimumForecastEV: 0.025,
  confidenceLowMax: 40,
  confidenceMidMax: 75,
  conservativeEVRequired: false,
  minimumForecastTrials: 500_000,
  showForecastReasons: false,
};

saveSettings(next);
const loaded = loadSettings();

assert.equal(loaded.forecastEnabled, false);
assert.equal(loaded.minimumForecastEV, 0.025);
assert.equal(loaded.confidenceLowMax, 40);
assert.equal(loaded.confidenceMidMax, 75);
assert.equal(loaded.conservativeEVRequired, false);
assert.equal(loaded.minimumForecastTrials, 500_000);
assert.equal(loaded.showForecastReasons, false);

console.log('Storage tests passed');
