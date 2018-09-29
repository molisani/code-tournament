import { Multimap, Table } from "./common";
import { AbstractGameState, GameConfig, GameFactory, GameStateFactory } from "./games";
import { PlayerMetricField, PlayerMetricsConfig, PlayerMetricsEntry, Statistic } from "./metrics";
import { AbstractPlayer, PlayerClassName, PlayerFactory, PlayerRoundInfo, PlayerRoundResult, PlayerStartInfo, PlayerStartResult } from "./players";
import { Random } from "./random";


interface TournamentConfig<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  gameStateFactory: GameStateFactory<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>;
  trialsPerRound: number;
  playerFactories: PlayerFactory<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER>[];

}

export class TournamentRound<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  constructor(
      public readonly gameStateFactory: GameStateFactory<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>,
      public readonly gameFactory: GameFactory<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>,
      public readonly playerFactories: PlayerFactory<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER>[],
      public readonly config: CONFIG) {

  }

  public *generateTrials(n: number, random: Random): IterableIterator<TournamentTrial<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>> {
    for (let i = 0; i < n; ++i) {
      yield new TournamentTrial(this, random.next());
    }
  }

}

interface TournamentTrialResult<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  readonly config: CONFIG;
  readonly seed: number;
  readonly className: PlayerClassName;
  readonly metrics: METRICS;

}

class TournamentResultTable<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  private readonly _resultsByConfigs = new Map<CONFIG, Multimap<PlayerClassName, METRICS>>();

  insert(result: TournamentTrialResult<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>): void {
    let metricsByClass = this._resultsByConfigs.get(result.config);
    if (!metricsByClass) {
      metricsByClass = new Multimap<PlayerClassName, METRICS>();
      this._resultsByConfigs.set(result.config, metricsByClass);
    }
    metricsByClass.put(result.className, result.metrics);
  }

  getAll(): Map<CONFIG, Multimap<PlayerClassName, METRICS>> {
    return this._resultsByConfigs;
  }

}

export class TournamentTrial<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  constructor(public readonly preset: TournamentRound<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>, public readonly seed: number) {
  }

  public run(): TournamentTrialResult<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>[] {
    const random = new Random(this.seed);
    const state = this.preset.gameStateFactory(random, this.preset.config);

    const game = this.preset.gameFactory(new Random(this.seed), state);

    const players = this.preset.playerFactories.map((factory, i) => factory(new Random(this.seed), i));

    game.start(this.preset.config, players);
    while (game.isRunning()) {
      game.round();
    }

    const results: TournamentTrialResult<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>[] = [];
    for (const [player, metrics] of game.getMetrics().entries()) {
      results.push({
        className: player.className,
        metrics,
        config: this.preset.config,
        seed: this.seed,
      });
    }
    return results;
  }

}

class TournamentTrialRunner<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  public runTrialsFromRounds(rounds: Table<CONFIG, PlayerClassName, TournamentRound<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>>, trialsPerRound: number): ReadonlyArray<TournamentTrialResult<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>> {
    const trialResults: TournamentTrialResult<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>[] = [];
    const random = new Random(0);
    for (const round of rounds.values()) {
      for (const trial of round.generateTrials(trialsPerRound, random)) {
        trialResults.push(...trial.run());
      }
    }
    return trialResults;
  }

}

type PlayerMetricAggregate<METRICS extends PlayerMetricsEntry> = Map<PlayerClassName, Map<PlayerMetricField<METRICS>, Statistic>>;

export class TournamentManager<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  constructor(
      public readonly config: TournamentConfig<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>,
      public readonly trialRunner: TournamentTrialRunner<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>,
      public readonly metricsConfig: PlayerMetricsConfig<METRICS>) {
    
  }

  public getPlayerAggregates(): Map<CONFIG, PlayerMetricAggregate<METRICS>> {
    const resultTable = new TournamentResultTable<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>();
    // this.trialRunner.runTrialsFromRounds(this.config.this.config.trialsPerRound).forEach((result) => resultTable.insert(result));

    const result = new Map<CONFIG, PlayerMetricAggregate<METRICS>>();
    for (const [config, metricsByClass] of resultTable.getAll().entries()) {
      const aggregate = new Map<PlayerClassName, Map<PlayerMetricField<METRICS>, Statistic>>();
      for (const [className, metrics] of metricsByClass.entries()) {
        aggregate.set(className, this.metricsConfig.extractStatistics(metrics))
      }
      result.set(config, aggregate);
    }
    return result;
  }

}