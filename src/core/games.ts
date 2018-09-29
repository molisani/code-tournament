import { PlayerMetricsEntry } from "./metrics";
import { AbstractPlayer, PlayerRoundInfo, PlayerRoundResult, PlayerStartInfo, PlayerStartResult } from "./players";
import { Random } from "./random";


export interface GameConfig {

}

export abstract class AbstractGameState<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig> {

  private _time: number = 0;

  public tick(): void {
    this._time++;
  }

  public get time(): number {
    return this._time;
  }

  constructor(public readonly random: Random, public readonly config: CONFIG) {
  }

  public abstract configure(players: ReadonlyArray<PLAYER>): void;
  public abstract startOrder(): ReadonlyArray<PLAYER>;
  public abstract startInfoForPlayer(player: PLAYER): START_INFO;
  public abstract processStartResult(player: PLAYER, result: START_RESULT): boolean;
  public abstract postStart(results: Map<PLAYER, START_RESULT>): void;

  public abstract isGameOver(): boolean;

  public abstract preRound(): void;
  public abstract roundOrder(): ReadonlyArray<PLAYER>;
  public abstract roundInfoForPlayer(player: PLAYER): ROUND_INFO;
  public abstract processRoundResult(player: PLAYER, result: ROUND_RESULT): boolean;
  public abstract postRound(results: Map<PLAYER, ROUND_RESULT>): void;

  public abstract getInitialMetricsForPlayer(player: PLAYER): METRICS;
  public abstract getCurrentMetricsForPlayer(player: PLAYER, previous: METRICS | undefined): METRICS;

}

export type GameStateFactory<
  START_INFO extends PlayerStartInfo,
  START_RESULT extends PlayerStartResult,
  ROUND_INFO extends PlayerRoundInfo,
  ROUND_RESULT extends PlayerRoundResult,
  PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
  METRICS extends PlayerMetricsEntry,
  CONFIG extends GameConfig,
  STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> = (random: Random, config: CONFIG) => STATE;

export abstract class AbstractGame<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> {

  private _isRunning: boolean = true;

  constructor(public readonly random: Random, public readonly state: STATE) {
    
  }

  public terminate(): void {
    this._isRunning = false;
  }

  public isRunning(): boolean {
    return this._isRunning && !this.state.isGameOver();
  }

  public abstract start(config: CONFIG, players: ReadonlyArray<PLAYER>): void;
  public abstract round(): void;

  public abstract getMetrics(): Map<PLAYER, METRICS>;

}

export class SinglePlayerGame<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> extends AbstractGame<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE> {

  private _player!: PLAYER;
  private _lastMetrics: METRICS | undefined;

  public start(config: CONFIG, players: ReadonlyArray<PLAYER>) {
    this.state.configure(players);
    this._player = players[0];
    const info = this.state.startInfoForPlayer(this._player);
    const result = this._player.processStart(info);
    if (this.state.processStartResult(this._player, result)) {
      const results = new Map<PLAYER, START_RESULT>();
      results.set(this._player, result);
      this.state.postStart(results);
    }
    this._lastMetrics = this.state.getInitialMetricsForPlayer(this._player);
  }

  public round(): void {
    this.state.preRound();
    const info = this.state.roundInfoForPlayer(this._player);
    const result = this._player.processRound(info);
    if (this.state.processRoundResult(this._player, result)) {
      const results = new Map<PLAYER, ROUND_RESULT>();
      results.set(this._player, result);
      this.state.postRound(results);
    }
    this._lastMetrics = this.state.getCurrentMetricsForPlayer(this._player, this._lastMetrics);
    this.state.tick();
  }

  public getMetrics(): Map<PLAYER, METRICS> {
    const result = new Map<PLAYER, METRICS>();
    if (this._lastMetrics) {
      result.set(this._player, this._lastMetrics);
    }
    return result;
  }

}

export class MultiPlayerGame<
    START_INFO extends PlayerStartInfo,
    START_RESULT extends PlayerStartResult,
    ROUND_INFO extends PlayerRoundInfo,
    ROUND_RESULT extends PlayerRoundResult,
    PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
    METRICS extends PlayerMetricsEntry,
    CONFIG extends GameConfig,
    STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> extends AbstractGame<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE> {

  private _players!: ReadonlyArray<PLAYER>;
  private _currentMetrics = new Map<PLAYER, METRICS>();

  public start(config: CONFIG, players: ReadonlyArray<PLAYER>) {
    this.state.configure(players);
    this._players = players;

    const results = new Map<PLAYER, START_RESULT>();
    for (const player of this._players) {
      const info = this.state.startInfoForPlayer(player);
      const result = player.processStart(info);
      if (this.state.processStartResult(player, result)) {
        results.set(player, result);
      }
    }
    this.state.postStart(results);
    for (const player of this._players) {
      const metrics = this.state.getInitialMetricsForPlayer(player);
      this._currentMetrics.set(player, metrics);
    }
  }

  public round(): void {
    this.state.preRound();
    const results = new Map<PLAYER, ROUND_RESULT>();
    for (const player of this._players) {
      const info = this.state.roundInfoForPlayer(player);
      const result = player.processRound(info);
      if (this.state.processRoundResult(player, result)) {
        results.set(player, result);
      }
    }
    this.state.postRound(results);
    for (const player of this._players) {
      const lastMetrics = this._currentMetrics.get(player);
      const newMetrics = this.state.getCurrentMetricsForPlayer(player, lastMetrics);
      this._currentMetrics.set(player, newMetrics);
    }
    this.state.tick();
  }

  public getMetrics(): Map<PLAYER, METRICS> {
    return this._currentMetrics;
  }

}

export type GameFactory<
  START_INFO extends PlayerStartInfo,
  START_RESULT extends PlayerStartResult,
  ROUND_INFO extends PlayerRoundInfo,
  ROUND_RESULT extends PlayerRoundResult,
  PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>,
  METRICS extends PlayerMetricsEntry,
  CONFIG extends GameConfig,
  STATE extends AbstractGameState<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG>> = (random: Random, state: STATE) => AbstractGame<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT, PLAYER, METRICS, CONFIG, STATE>;

