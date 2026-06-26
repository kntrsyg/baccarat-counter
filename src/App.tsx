import { useEffect, useMemo, useState } from 'react';
import {
  betOrder,
  bestBet,
  bestSideBet,
  createRemainingShoe,
  effectiveRest,
  effectiveTrueCount,
  estimateProbabilities,
  pairEv,
  remainingPercent,
  runningCount,
  sideBetOrder,
  targetOrder,
  tieEv,
  totalCards,
  trueCount,
} from './baccarat';
import { DEFAULT_SETTINGS, DECK_OPTIONS, EMPTY_PROBABILITIES, RANKS } from './constants';
import { loadHistory, loadSettings, saveHistory, saveSettings } from './storage';
import type { Probabilities, Rank, Settings } from './types';

function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [history, setHistory] = useState<Rank[]>(() => loadHistory());
  const [probabilities, setProbabilities] = useState<Probabilities>(EMPTY_PROBABILITIES);
  const [isEstimating, setIsEstimating] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const shoe = useMemo(() => createRemainingShoe(settings.deckCount, history), [settings.deckCount, history]);
  const rest = totalCards(shoe);
  const rc = runningCount(history, settings.countValues);
  const betTc = trueCount(rc, rest);
  const effRest = effectiveRest(rest, settings.cutCards);
  const effectiveTc = effectiveTrueCount(rc, effRest);
  const target = targetOrder(effectiveTc);
  const bet = betOrder(effectiveTc);
  const best = bestBet(target, probabilities, settings);
  const bestSide = bestSideBet(probabilities);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    setIsEstimating(true);
    const timer = window.setTimeout(() => {
      setProbabilities(estimateProbabilities(shoe));
      setIsEstimating(false);
    }, 10);

    return () => window.clearTimeout(timer);
  }, [shoe]);

  function inputCard(rank: Rank) {
    if (shoe[rank] <= 0) return;
    setHistory((current) => [...current, rank]);
  }

  function undo() {
    setHistory((current) => current.slice(0, -1));
  }

  function resetCount() {
    setHistory([]);
    setProbabilities(EMPTY_PROBABILITIES);
  }

  function applySettings(next: Settings) {
    setSettings(next);
    if (next.deckCount !== settings.deckCount) {
      setHistory([]);
      setProbabilities(EMPTY_PROBABILITIES);
    }
    setIsConfigOpen(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 py-3 sm:px-5 lg:px-8">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-normal sm:text-2xl">Baccarat Counter</h1>
            <p className="text-xs font-semibold text-zinc-500">Cards {history.length} / {settings.deckCount * 52}</p>
          </div>
          <button className="control-button w-28 bg-zinc-800" onClick={() => setIsConfigOpen(true)}>
            CONFIG
          </button>
        </header>

        <section className="grid flex-1 gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <OrderPanel target={target} bet={bet} best={best} effectiveTc={effectiveTc} />
            <SideBetPanel probabilities={probabilities} bestSideBet={bestSide} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Bet-RC" value={formatNumber(rc, 1)} />
              <Metric label="Bet-TC" value={formatNumber(betTc, 2)} />
              <Metric label="Effective TC" value={formatNumber(effectiveTc, 2)} important />
              <Metric label="Rest" value={String(rest)} />
              <Metric label="Cut" value={String(settings.cutCards)} />
              <Metric label="EffectiveRest" value={String(effRest)} />
            </div>

            <ProbabilityPanel probabilities={probabilities} isEstimating={isEstimating} />
          </div>

          <div className="space-y-3">
            <RemainingTable shoe={shoe} />
            <HistoryStrip history={history} />
          </div>
        </section>

        <CardInputPanel shoe={shoe} onInput={inputCard} onUndo={undo} onReset={resetCount} canUndo={history.length > 0} />
      </div>

      {isConfigOpen && (
        <ConfigDialog
          settings={settings}
          onCancel={() => setIsConfigOpen(false)}
          onSave={applySettings}
        />
      )}
    </main>
  );
}

function OrderPanel({
  target,
  bet,
  best,
  effectiveTc,
}: {
  target: string;
  bet: string;
  best: string;
  effectiveTc: number;
}) {
  const tone =
    target === 'Player'
      ? 'text-cyan-300'
      : target === 'Banker'
        ? 'text-rose-300'
        : 'text-white';

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-center">
      <div className={`text-5xl font-black leading-none tracking-normal sm:text-6xl ${tone}`}>{target}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-900 p-3">
          <div className="label">Effective TC</div>
          <div className="mt-1 font-mono text-4xl font-black text-yellow-300">{formatNumber(effectiveTc, 2)}</div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <div className="label">BetOrder</div>
          <div className="mt-2 text-3xl font-black">{bet}</div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-emerald-950 px-3 py-2 text-sm font-black text-emerald-200">
        Best Bet: {best}
      </div>
    </section>
  );
}

function Metric({ label, value, important = false }: { label: string; value: string; important?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="label">{label}</div>
      <div className={`mt-1 truncate font-mono font-black ${important ? 'text-3xl text-yellow-300' : 'text-2xl'}`}>
        {value}
      </div>
    </div>
  );
}

function ProbabilityPanel({
  probabilities,
  isEstimating,
}: {
  probabilities: Probabilities;
  isEstimating: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-black">Probabilities</h2>
        <span className="text-xs font-bold text-zinc-500">{isEstimating ? 'SIMULATING' : '10,000 TRIALS'}</span>
      </div>
      <ProbabilityRow label="Player" value={probabilities.playerWin} />
      <ProbabilityRow label="Banker" value={probabilities.bankerWin} />
      <ProbabilityRow label="Tie" value={probabilities.tie} />
      <ProbabilityRow label="Player Pair" value={probabilities.playerPair} />
      <ProbabilityRow label="Banker Pair" value={probabilities.bankerPair} />
    </section>
  );
}

function SideBetPanel({
  probabilities,
  bestSideBet,
}: {
  probabilities: Probabilities;
  bestSideBet: string;
}) {
  const tie = {
    label: 'Tie',
    probability: probabilities.tie,
    ev: tieEv(probabilities.tie),
    order: sideBetOrder('Tie', probabilities.tie),
  };
  const playerPair = {
    label: 'Player Pair',
    probability: probabilities.playerPair,
    ev: pairEv(probabilities.playerPair),
    order: sideBetOrder('Player Pair', probabilities.playerPair),
  };
  const bankerPair = {
    label: 'Banker Pair',
    probability: probabilities.bankerPair,
    ev: pairEv(probabilities.bankerPair),
    order: sideBetOrder('Banker Pair', probabilities.bankerPair),
  };

  return (
    <section className="rounded-lg border border-emerald-900/70 bg-emerald-950/30 p-3">
      <div className="mb-3 rounded-lg bg-black/40 p-3 text-center">
        <div className="label">Best Side Bet</div>
        <div className="mt-1 text-3xl font-black text-emerald-200 sm:text-4xl">{bestSideBet}</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <SideBetCard {...tie} />
        <SideBetCard {...playerPair} />
        <SideBetCard {...bankerPair} />
      </div>
    </section>
  );
}

function SideBetCard({
  label,
  probability,
  ev,
  order,
}: {
  label: string;
  probability: number;
  ev: number;
  order: string;
}) {
  const evTone = ev > 0 ? 'text-emerald-300' : 'text-zinc-400';
  const orderTone =
    order === 'HIGH'
      ? 'bg-emerald-400 text-black'
      : order === 'MID'
        ? 'bg-yellow-300 text-black'
        : order === 'LOW'
          ? 'bg-cyan-300 text-black'
          : 'bg-zinc-800 text-zinc-300';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-zinc-200">{label}</div>
        <div className={`rounded-md px-2 py-1 text-xs font-black ${orderTone}`}>{order}</div>
      </div>
      <div className="mt-3">
        <div className="label">Probability</div>
        <div className="font-mono text-3xl font-black text-white">{formatPercent(probability)}</div>
      </div>
      <div className="mt-2">
        <div className="label">EV</div>
        <div className={`font-mono text-3xl font-black ${evTone}`}>{formatSignedPercent(ev)}</div>
      </div>
    </div>
  );
}

function ProbabilityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-900 py-2 first:border-t-0">
      <span className="text-sm font-bold text-zinc-300">{label}</span>
      <span className="font-mono text-base font-black">{formatPercent(value)}</span>
    </div>
  );
}

function RemainingTable({ shoe }: { shoe: Record<Rank, number> }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 grid grid-cols-[48px_1fr_88px] text-xs font-black text-zinc-500">
        <span>Card</span>
        <span className="text-right">Remaining</span>
        <span className="text-right">Ratio</span>
      </div>
      {RANKS.map((rank) => (
        <div key={rank} className="grid grid-cols-[48px_1fr_88px] items-center border-t border-zinc-900 py-2 first:border-t-0">
          <span className="text-lg font-black">{rank}</span>
          <span className="text-right font-mono text-lg font-black">{shoe[rank]}</span>
          <span className="text-right font-mono text-sm font-bold text-zinc-300">{formatPercent(remainingPercent(shoe, rank))}</span>
        </div>
      ))}
    </section>
  );
}

function HistoryStrip({ history }: { history: Rank[] }) {
  const recent = history.slice(-18).reverse();

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-black">Input History</h2>
        <span className="text-xs font-bold text-zinc-500">{history.length}</span>
      </div>
      <div className="flex min-h-10 flex-wrap gap-2">
        {recent.length === 0 ? (
          <span className="text-sm font-semibold text-zinc-600">No cards entered</span>
        ) : (
          recent.map((rank, index) => (
            <span key={`${rank}-${history.length - index}`} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-black">
              {rank}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

function CardInputPanel({
  shoe,
  onInput,
  onUndo,
  onReset,
  canUndo,
}: {
  shoe: Record<Rank, number>;
  onInput: (rank: Rank) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
}) {
  return (
    <section className="sticky bottom-0 mt-3 border-t border-zinc-900 bg-black pt-3">
      <div className="grid grid-cols-5 gap-2">
        {RANKS.map((rank) => (
          <button
            key={rank}
            className="h-14 rounded-lg bg-white text-xl font-black text-black active:bg-zinc-300 disabled:bg-zinc-800 disabled:text-zinc-600"
            disabled={shoe[rank] <= 0}
            onClick={() => onInput(rank)}
          >
            {rank}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="control-button bg-zinc-800 disabled:text-zinc-600" disabled={!canUndo} onClick={onUndo}>
          UNDO
        </button>
        <button className="control-button bg-red-800" onClick={onReset}>
          COUNT RESET
        </button>
      </div>
    </section>
  );
}

function ConfigDialog({
  settings,
  onCancel,
  onSave,
}: {
  settings: Settings;
  onCancel: () => void;
  onSave: (settings: Settings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  function setCountValue(rank: Rank, value: number) {
    setDraft((current) => ({
      ...current,
      countValues: {
        ...current.countValues,
        [rank]: value,
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 p-3 sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">CONFIG</h2>
          <button className="control-button w-24 bg-zinc-800" onClick={onCancel}>CANCEL</button>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="config-title">Shoe</h3>
            <div className="grid grid-cols-5 gap-2">
              {DECK_OPTIONS.map((deck) => (
                <button
                  key={deck}
                  className={`h-11 rounded-lg text-sm font-black ${draft.deckCount === deck ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
                  onClick={() => setDraft((current) => ({ ...current, deckCount: deck }))}
                >
                  {deck}
                </button>
              ))}
            </div>
            <NumberField
              label="Cut Cards"
              min={1}
              max={416}
              value={draft.cutCards}
              onChange={(cutCards) => setDraft((current) => ({ ...current, cutCards }))}
            />
          </section>

          <section>
            <h3 className="config-title">Count Values</h3>
            <div className="grid grid-cols-2 gap-2">
              {RANKS.map((rank) => (
                <NumberField
                  key={rank}
                  label={rank}
                  min={-9}
                  max={9}
                  value={draft.countValues[rank]}
                  onChange={(value) => setCountValue(rank, value)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="config-title">Thresholds</h3>
            <SliderField
              label="Tie"
              value={draft.tieThreshold}
              max={0.25}
              onChange={(tieThreshold) => setDraft((current) => ({ ...current, tieThreshold }))}
            />
            <SliderField
              label="Pair"
              value={draft.pairThreshold}
              max={0.2}
              onChange={(pairThreshold) => setDraft((current) => ({ ...current, pairThreshold }))}
            />
          </section>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="control-button bg-zinc-800" onClick={() => setDraft(DEFAULT_SETTINGS)}>
            DEFAULT
          </button>
          <button className="control-button bg-emerald-700" onClick={() => onSave(draft)}>
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2">
      <span className="text-sm font-black">{label}</span>
      <input
        className="w-24 rounded-lg border border-zinc-700 bg-black px-2 py-2 text-right font-mono font-black text-white"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
    </label>
  );
}

function SliderField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-3 block rounded-lg bg-zinc-900 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black">{label}</span>
        <span className="font-mono text-sm font-black">{formatPercent(value, 1)}</span>
      </div>
      <input
        className="w-full accent-white"
        type="range"
        min={0}
        max={max}
        step={0.005}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function formatNumber(value: number, digits: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number, digits = 2) {
  return value.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default App;
