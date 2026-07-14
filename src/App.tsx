import { useEffect, useMemo, useRef, useState } from 'react';
import {
  betOrder,
  calculateEv,
  createRemainingShoe,
  effectiveRest,
  effectiveTrueCount,
  eorRunningCounts,
  eorTrueCount,
  probabilitySumWarning,
  remainingPercent,
  runningCount,
  targetOrder,
  targetScore,
  tieAlert,
  tieBreakEvenProbability,
  totalCards,
  trueCount,
} from './baccarat';
import {
  DEFAULT_SETTINGS,
  DECK_OPTIONS,
  EMPTY_FORECAST_RESULT,
  EMPTY_SIMULATION_RESULT,
  RANKS,
  SIMULATION_TRIAL_OPTIONS,
} from './constants';
import { loadHistory, loadSettings, saveHistory, saveSettings } from './storage';
import type { EvResult, ForecastResult, Rank, Settings, SimulationResult } from './types';

type EorWeightKey = 'player' | 'banker' | 'tie';

function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [history, setHistory] = useState<Rank[]>(() => loadHistory());
  const [simulation, setSimulation] = useState<SimulationResult>(EMPTY_SIMULATION_RESULT);
  const [forecast, setForecast] = useState<ForecastResult>(EMPTY_FORECAST_RESULT);
  const [isEstimating, setIsEstimating] = useState(true);
  const [forecastWarning, setForecastWarning] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const shoe = useMemo(() => createRemainingShoe(settings.deckCount, history), [settings.deckCount, history]);
  const rest = totalCards(shoe);
  const rc = runningCount(history, settings.countValues);
  const betTc = trueCount(rc, rest);
  const effRest = effectiveRest(rest, settings.cutCards);
  const effectiveTc = effectiveTrueCount(rc, effRest);
  const eorCounts = eorRunningCounts(history, settings.eorWeights);
  const playerTC = eorTrueCount(eorCounts.playerRC, effRest);
  const bankerTC = eorTrueCount(eorCounts.bankerRC, effRest);
  const tieTC = eorTrueCount(eorCounts.tieRC, effRest);
  const score = targetScore(playerTC, bankerTC);
  const target = targetOrder(score, settings.targetScoreThreshold);
  const bet = betOrder(score);
  const evResult = calculateEv(simulation, settings);
  const isTieAlertOn = tieAlert(tieTC, evResult.tieEV, settings.tieAlertThreshold);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    setIsEstimating(true);
    setForecastWarning('');
    const timer = window.setTimeout(() => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('./forecastWorker.ts', import.meta.url), { type: 'module' });
      }

      const worker = workerRef.current;
      worker.onmessage = (event: MessageEvent<{
        requestId: number;
        simulation?: SimulationResult;
        forecast?: ForecastResult;
        error?: string;
      }>) => {
        if (event.data.requestId !== requestIdRef.current) return;
        if (event.data.error || !event.data.simulation || !event.data.forecast) {
          setForecastWarning(event.data.error || 'Forecast worker failed. Keeping the latest result.');
          setIsEstimating(false);
          return;
        }
        setSimulation(event.data.simulation);
        setForecast(event.data.forecast);
        setIsEstimating(false);
      };
      worker.onerror = () => {
        if (requestId !== requestIdRef.current) return;
        setForecastWarning('Forecast worker failed. Keeping the latest result.');
        setIsEstimating(false);
      };
      worker.postMessage({
        requestId,
        shoe,
        settings,
        countTarget: target,
        targetScore: score,
        tieAlert: isTieAlertOn,
        restCards: rest,
        totalCards: settings.deckCount * 52,
        effectiveRest: effRest,
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [shoe, settings, target, score, isTieAlertOn, rest, effRest]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  function inputCard(rank: Rank) {
    if (shoe[rank] <= 0) return;
    setHistory((current) => [...current, rank]);
  }

  function undo() {
    setHistory((current) => current.slice(0, -1));
  }

  function resetCount() {
    setHistory([]);
    setSimulation(EMPTY_SIMULATION_RESULT);
    setForecast(EMPTY_FORECAST_RESULT);
  }

  function applySettings(next: Settings) {
    setSettings(next);
    if (next.deckCount !== settings.deckCount) {
      setHistory([]);
      setSimulation(EMPTY_SIMULATION_RESULT);
      setForecast(EMPTY_FORECAST_RESULT);
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
            <OrderPanel
              target={target}
              countSignal={bet}
              evResult={evResult}
              score={score}
              tieAlertOn={isTieAlertOn}
            />
            {settings.forecastEnabled && (
              <ForecastPanel
                forecast={forecast}
                isEstimating={isEstimating}
                warning={forecastWarning}
                showReasons={settings.showForecastReasons}
              />
            )}
            <OutcomePanel
              simulation={simulation}
              evResult={evResult}
              isEstimating={isEstimating}
              bankerCommissionRate={settings.bankerCommissionRate}
              tieProfitPayout={settings.tieProfitPayout}
            />
            <CountDetails
              rc={rc}
              betTc={betTc}
              effectiveTc={effectiveTc}
              rest={rest}
              cutCards={settings.cutCards}
              effectiveRestValue={effRest}
              playerRC={eorCounts.playerRC}
              bankerRC={eorCounts.bankerRC}
              tieRC={eorCounts.tieRC}
              playerTC={playerTC}
              bankerTC={bankerTC}
              tieTC={tieTC}
              score={score}
            />
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
  countSignal,
  evResult,
  score,
  tieAlertOn,
}: {
  target: string;
  countSignal: string;
  evResult: EvResult;
  score: number;
  tieAlertOn: boolean;
}) {
  const tone =
    target === 'Player'
      ? 'text-cyan-300'
      : target === 'Banker'
        ? 'text-rose-300'
        : 'text-white';

  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-center sm:p-5">
      <div className="label">Count Target</div>
      <div className={`mt-2 text-6xl font-black leading-none tracking-normal sm:text-7xl ${tone}`}>{target}</div>
      <div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-2">
        <div className="rounded-lg border border-yellow-900/70 bg-yellow-950/30 p-3 sm:p-4">
          <div className="label text-yellow-600">Target Score</div>
          <div className="mt-1 font-mono text-5xl font-black text-yellow-300 sm:text-6xl">{formatNumber(score, 2)}</div>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <div className="label">Count Signal</div>
          <div className="mt-3 text-3xl font-black sm:text-4xl">{countSignal}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
          <div className="label">Best EV Bet</div>
          <div className="mt-1 text-4xl font-black text-emerald-300 sm:text-5xl">{evResult.bestBet}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="label">Best EV</div>
          <div className={`mt-2 font-mono text-3xl font-black sm:text-4xl ${evTone(evResult.bestEV)}`}>
            {formatSignedPercent(evResult.bestEV)}
          </div>
          <div className="mt-2 border-t border-zinc-800 pt-2">
            <div className="label">EV Strength</div>
            <div className="text-2xl font-black">{evResult.strength}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_0.75fr] gap-2">
        <div className="rounded-lg border border-zinc-800 bg-black p-3">
          <div className="label">EV Decision</div>
          <div className="mt-1 text-sm font-bold text-zinc-400">
            Payout-based EV only. Count signals are not used to adjust EV.
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${tieAlertOn ? 'border-emerald-500 bg-emerald-950/60' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="label">Tie Alert</div>
          <div className={`mt-2 text-3xl font-black ${tieAlertOn ? 'text-emerald-300' : 'text-zinc-500'}`}>
            {tieAlertOn ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>
    </section>
  );
}

function ForecastPanel({
  forecast,
  isEstimating,
  warning,
  showReasons,
}: {
  forecast: ForecastResult;
  isEstimating: boolean;
  warning: string;
  showReasons: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const targetTone = forecastTargetTone(forecast.target);
  const confidenceTone = forecastConfidenceTone(forecast.confidenceLevel);
  const intervalTargets: Array<'Player' | 'Banker' | 'Tie'> =
    forecast.target === 'No Bet' ? ['Player', 'Banker', 'Tie'] : [forecast.target];

  return (
    <section className={`rounded-lg border p-4 sm:p-5 ${targetTone.panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label">Statistical Forecast</div>
          <div className={`mt-1 text-5xl font-black leading-none sm:text-6xl ${targetTone.text}`}>
            {forecast.target}
          </div>
        </div>
        <button className="control-button h-10 bg-zinc-800" onClick={() => setIsExpanded((current) => !current)}>
          DETAIL
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ForecastMetric label="Confidence" value={forecast.confidenceLevel} tone={confidenceTone} />
        <ForecastMetric label="Score" value={`${forecast.confidenceScore} / 100`} />
        <ForecastMetric label="Probability" value={formatPercent(forecast.probability)} />
        <ForecastMetric label="EV" value={formatSignedPercent(forecast.recommendedEV)} tone={evTone(forecast.recommendedEV)} />
        <ForecastMetric
          label="Conservative EV"
          value={formatSignedPercent(forecast.conservativeEV)}
          tone={evTone(forecast.conservativeEV)}
        />
        <ForecastMetric label="Games To Cut" value={`~${forecast.estimatedGamesToCut}`} />
      </div>

      {isEstimating && <div className="mt-3 text-sm font-black text-yellow-300">Forecast calculating...</div>}
      {warning && <div className="mt-3 rounded-lg border border-yellow-700 bg-yellow-950/40 px-3 py-2 text-xs font-bold text-yellow-200">{warning}</div>}

      {isExpanded && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <ForecastMetric label="Probability Edge" value={formatSignedPercent(forecast.probabilityEdge)} />
            <ForecastMetric label="Count Agreement" value={forecast.countAgreement ? 'YES' : 'NO'} />
            <ForecastMetric label="Simulation Stable" value={forecast.simulationStable ? 'YES' : 'NO'} />
            <ForecastMetric label="Simulation Trials" value={formatIntegerFromForecast(forecast)} />
          </div>

          <div className="mt-3 rounded-lg border border-zinc-800 bg-black p-3">
            <div className="label">95% Confidence Interval</div>
            <div className="mt-2 space-y-1 font-mono text-sm font-bold text-zinc-300">
              {intervalTargets.map((target) => (
                <div key={target} className="flex justify-between gap-2">
                  <span>{target}</span>
                  <span>{formatInterval(forecast.intervals[target])}</span>
                </div>
              ))}
            </div>
          </div>

          {showReasons && forecast.reasons.length > 0 && (
            <ForecastList title="Reasons" items={forecast.reasons} />
          )}
          {forecast.warnings.length > 0 && <ForecastList title="Warnings" items={forecast.warnings} warning />}
        </div>
      )}
    </section>
  );
}

function ForecastMetric({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-3">
      <div className="label">{label}</div>
      <div className={`mt-1 font-mono text-xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

function ForecastList({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-black p-3">
      <div className={`label ${warning ? 'text-yellow-500' : ''}`}>{title}</div>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="text-sm font-bold text-zinc-300">
            - {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function CountDetails({
  rc,
  betTc,
  effectiveTc,
  rest,
  cutCards,
  effectiveRestValue,
  playerRC,
  bankerRC,
  tieRC,
  playerTC,
  bankerTC,
  tieTC,
  score,
}: {
  rc: number;
  betTc: number;
  effectiveTc: number;
  rest: number;
  cutCards: number;
  effectiveRestValue: number;
  playerRC: number;
  bankerRC: number;
  tieRC: number;
  playerTC: number;
  bankerTC: number;
  tieTC: number;
  score: number;
}) {
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <summary className="cursor-pointer text-sm font-black text-zinc-300">COUNT DETAILS</summary>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Player RC" value={formatNumber(playerRC, 1)} important />
        <Metric label="Banker RC" value={formatNumber(bankerRC, 1)} important />
        <Metric label="Tie RC" value={formatNumber(tieRC, 1)} important />
        <Metric label="Player TC" value={formatNumber(playerTC, 2)} />
        <Metric label="Banker TC" value={formatNumber(bankerTC, 2)} />
        <Metric label="Tie TC" value={formatNumber(tieTC, 2)} />
        <Metric label="Target Score" value={formatNumber(score, 2)} />
        <Metric label="Bet-RC" value={formatNumber(rc, 1)} />
        <Metric label="Bet-TC" value={formatNumber(betTc, 2)} />
        <Metric label="Effective TC" value={formatNumber(effectiveTc, 2)} />
        <Metric label="Rest" value={String(rest)} />
        <Metric label="Cut" value={String(cutCards)} />
        <Metric label="EffectiveRest" value={String(effectiveRestValue)} />
      </div>
    </details>
  );
}

function Metric({ label, value, important = false }: { label: string; value: string; important?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-3">
      <div className="label">{label}</div>
      <div className={`mt-1 truncate font-mono font-black ${important ? 'text-2xl text-yellow-300' : 'text-xl'}`}>
        {value}
      </div>
    </div>
  );
}

function OutcomePanel({
  simulation,
  evResult,
  isEstimating,
  bankerCommissionRate,
  tieProfitPayout,
}: {
  simulation: SimulationResult;
  evResult: EvResult;
  isEstimating: boolean;
  bankerCommissionRate: number;
  tieProfitPayout: number;
}) {
  const hasProbabilityWarning = probabilitySumWarning(simulation);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-black">Outcome Monitor</h2>
        <span className="text-xs font-bold text-zinc-500">
          {isEstimating ? 'SIMULATING' : `${formatInteger(simulation.trialCount)} TRIALS`}
        </span>
      </div>
      {hasProbabilityWarning && (
        <div className="mb-3 rounded-lg border border-yellow-700 bg-yellow-950/40 px-3 py-2 text-xs font-bold text-yellow-200">
          Probability total warning: Player + Banker + Tie is not close to 100%.
        </div>
      )}

      <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-center">
        <div className="text-lg font-black text-emerald-200">Tie</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <OutcomeValue label="Probability" value={formatPercent(simulation.tie)} large />
          <OutcomeValue
            label={`EV (${formatNumber(tieProfitPayout, 2)}x)`}
            value={formatSignedPercent(evResult.tieEV)}
            large
            tone={evTone(evResult.tieEV)}
          />
        </div>
        <HitCount hits={simulation.tieCount} trials={simulation.trialCount} />
        <div className="mt-2 text-xs font-bold text-zinc-400">
          Break-even {formatPercent(tieBreakEvenProbability(tieProfitPayout))}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <OutcomeCard
          label="Player"
          probability={simulation.playerWin}
          ev={evResult.playerEV}
          hits={simulation.playerWinCount}
          trials={simulation.trialCount}
        />
        <OutcomeCard
          label="Banker"
          probability={simulation.bankerWin}
          ev={evResult.bankerEV}
          hits={simulation.bankerWinCount}
          trials={simulation.trialCount}
          payoutLabel={`${formatNumber(1 - bankerCommissionRate, 2)}x net`}
        />
      </div>
    </section>
  );
}

function OutcomeCard({
  label,
  probability,
  ev,
  hits,
  trials,
  payoutLabel,
}: {
  label: string;
  probability: number;
  ev: number;
  hits: number;
  trials: number;
  payoutLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-sm font-black text-zinc-200">{label}</div>
      <OutcomeValue label="Probability" value={formatPercent(probability)} />
      <OutcomeValue label="EV" value={formatSignedPercent(ev)} tone={evTone(ev)} />
      {payoutLabel && <div className="mt-1 text-xs font-bold text-zinc-500">{payoutLabel}</div>}
      <HitCount hits={hits} trials={trials} />
    </div>
  );
}

function OutcomeValue({
  label,
  value,
  large = false,
  tone = 'text-white',
}: {
  label: string;
  value: string;
  large?: boolean;
  tone?: string;
}) {
  return (
    <div className="mt-2">
      <div className="label">{label}</div>
      <div className={`font-mono font-black ${large ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'} ${tone}`}>{value}</div>
    </div>
  );
}

function HitCount({ hits, trials }: { hits: number; trials: number }) {
  return (
    <div className="mt-3 border-t border-zinc-800/80 pt-2">
      <div className="label">Hits</div>
      <div className="font-mono text-sm font-black text-zinc-300">
        {formatInteger(hits)} / {formatInteger(trials)}
      </div>
    </div>
  );
}

function evTone(ev: number) {
  if (!Number.isFinite(ev) || Math.abs(ev) < 0.00005) return 'text-zinc-200';
  return ev > 0 ? 'text-emerald-300' : 'text-zinc-400';
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

  function setEorWeight(rank: Rank, key: EorWeightKey, value: number) {
    setDraft((current) => ({
      ...current,
      eorWeights: {
        ...current.eorWeights,
        [rank]: {
          ...current.eorWeights[rank],
          [key]: value,
        },
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 p-3 sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
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
            <h3 className="config-title">Decision Thresholds</h3>
            <NumberField
              label="Target Score"
              min={0.1}
              max={99}
              step={0.1}
              value={draft.targetScoreThreshold}
              onChange={(targetScoreThreshold) => setDraft((current) => ({ ...current, targetScoreThreshold }))}
            />
            <NumberField
              label="Tie Alert TC"
              min={0.1}
              max={99}
              step={0.1}
              value={draft.tieAlertThreshold}
              onChange={(tieAlertThreshold) => setDraft((current) => ({ ...current, tieAlertThreshold }))}
            />
          </section>

          <section>
            <h3 className="config-title">EV Payout Rules</h3>
            <NumberField
              label="Minimum Bet EV"
              min={-1}
              max={1}
              step={0.001}
              value={draft.minimumBetEV}
              onChange={(minimumBetEV) => setDraft((current) => ({ ...current, minimumBetEV }))}
            />
            <NumberField
              label="Banker Commission"
              min={0}
              max={1}
              step={0.01}
              value={draft.bankerCommissionRate}
              onChange={(bankerCommissionRate) => setDraft((current) => ({ ...current, bankerCommissionRate }))}
            />
            <NumberField
              label="Tie Profit Payout"
              min={1}
              max={99}
              step={0.1}
              value={draft.tieProfitPayout}
              onChange={(tieProfitPayout) => setDraft((current) => ({ ...current, tieProfitPayout }))}
            />
          </section>

          <section>
            <h3 className="config-title">Simulation Trials</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SIMULATION_TRIAL_OPTIONS.map((trials) => (
                <button
                  key={trials}
                  className={`h-11 rounded-lg text-sm font-black ${draft.simulationTrials === trials ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
                  onClick={() => setDraft((current) => ({ ...current, simulationTrials: trials }))}
                >
                  {formatInteger(trials)}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="config-title">Forecast</h3>
            <ToggleField
              label="Forecast Enabled"
              value={draft.forecastEnabled}
              onChange={(forecastEnabled) => setDraft((current) => ({ ...current, forecastEnabled }))}
            />
            <NumberField
              label="Minimum Forecast EV"
              min={-1}
              max={1}
              step={0.001}
              value={draft.minimumForecastEV}
              onChange={(minimumForecastEV) => setDraft((current) => ({ ...current, minimumForecastEV }))}
            />
            <NumberField
              label="Confidence LOW Max"
              min={0}
              max={100}
              value={draft.confidenceLowMax}
              onChange={(confidenceLowMax) => setDraft((current) => ({ ...current, confidenceLowMax }))}
            />
            <NumberField
              label="Confidence MID Max"
              min={0}
              max={100}
              value={draft.confidenceMidMax}
              onChange={(confidenceMidMax) => setDraft((current) => ({ ...current, confidenceMidMax }))}
            />
            <ToggleField
              label="Conservative EV Required"
              value={draft.conservativeEVRequired}
              onChange={(conservativeEVRequired) => setDraft((current) => ({ ...current, conservativeEVRequired }))}
            />
            <ToggleField
              label="Show Forecast Reasons"
              value={draft.showForecastReasons}
              onChange={(showForecastReasons) => setDraft((current) => ({ ...current, showForecastReasons }))}
            />
            <div className="mt-3">
              <div className="mb-2 text-sm font-black text-zinc-300">Minimum Simulation Trials</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SIMULATION_TRIAL_OPTIONS.map((trials) => (
                  <button
                    key={trials}
                    className={`h-11 rounded-lg text-sm font-black ${draft.minimumForecastTrials === trials ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}
                    onClick={() => setDraft((current) => ({ ...current, minimumForecastTrials: trials }))}
                  >
                    {formatInteger(trials)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="config-title">EOR Style Weights</h3>
            <p className="mb-2 text-xs font-semibold text-zinc-500">
              These EOR values are temporary starting parameters and can be adjusted after testing.
            </p>
            <div className="grid grid-cols-[42px_1fr_1fr_1fr] gap-2 text-xs font-black uppercase text-zinc-500">
              <span>Card</span>
              <span>Player</span>
              <span>Banker</span>
              <span>Tie</span>
            </div>
            <div className="mt-2 space-y-2">
              {RANKS.map((rank) => (
                <div key={rank} className="grid grid-cols-[42px_1fr_1fr_1fr] items-center gap-2">
                  <span className="text-sm font-black">{rank}</span>
                  <CompactNumberField
                    value={draft.eorWeights[rank].player}
                    onChange={(value) => setEorWeight(rank, 'player', value)}
                  />
                  <CompactNumberField
                    value={draft.eorWeights[rank].banker}
                    onChange={(value) => setEorWeight(rank, 'banker', value)}
                  />
                  <CompactNumberField
                    value={draft.eorWeights[rank].tie}
                    onChange={(value) => setEorWeight(rank, 'tie', value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <details className="rounded-lg border border-zinc-800 bg-black p-3">
            <summary className="cursor-pointer text-sm font-black text-zinc-300">Legacy Count Values</summary>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {RANKS.map((rank) => (
                <NumberField
                  key={rank}
                  label={rank}
                  min={-9}
                  max={9}
                  step={0.1}
                  value={draft.countValues[rank]}
                  onChange={(value) => setCountValue(rank, value)}
                />
              ))}
            </div>
          </details>
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
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
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
        step={step}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
      />
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2">
      <span className="text-sm font-black">{label}</span>
      <button
        type="button"
        className={`h-9 w-20 rounded-lg text-sm font-black ${value ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}
        onClick={() => onChange(!value)}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </label>
  );
}

function CompactNumberField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      className="min-w-0 rounded-lg border border-zinc-700 bg-black px-2 py-2 text-right font-mono text-sm font-black text-white"
      type="number"
      min={-99}
      max={99}
      step={0.1}
      value={value}
      onChange={(event) => onChange(clamp(Number(event.target.value), -99, 99))}
    />
  );
}

function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value: number) {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('en-US');
}

function formatPercent(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSignedPercent(value: number) {
  if (!Number.isFinite(value)) return '--';
  const formatted = formatPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function forecastTargetTone(target: ForecastResult['target']) {
  if (target === 'Player') return { panel: 'border-cyan-800 bg-cyan-950/30', text: 'text-cyan-300' };
  if (target === 'Banker') return { panel: 'border-rose-800 bg-rose-950/30', text: 'text-rose-300' };
  if (target === 'Tie') return { panel: 'border-yellow-800 bg-yellow-950/30', text: 'text-yellow-300' };
  return { panel: 'border-zinc-800 bg-zinc-950', text: 'text-zinc-200' };
}

function forecastConfidenceTone(level: ForecastResult['confidenceLevel']) {
  if (level === 'HIGH') return 'text-emerald-300';
  if (level === 'MID') return 'text-yellow-300';
  return 'text-zinc-300';
}

function formatInterval(interval: ForecastResult['intervals']['Player']) {
  return `${formatPercent(interval.lower95)}-${formatPercent(interval.upper95)}`;
}

function formatIntegerFromForecast(forecast: ForecastResult) {
  return formatInteger(forecast.simulationTrials);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default App;
