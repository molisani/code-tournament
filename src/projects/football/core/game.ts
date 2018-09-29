import { Multimap } from "../../../core/common";
import { AbstractGameState, GameConfig, GameFactory, GameStateFactory, MultiPlayerGame } from "../../../core/games";
import { Random } from "../../../core/random";
import { BallCount, Point } from "./common";
import { FootballTeam, FootballTeamMetrics, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeamStartInfo, FootballTeamStartResult, PlayerAction } from "./player";

export interface FootballGameConfig extends GameConfig {
  fieldLength: number;
  teamPlayers: number;
  kickDistance: number;
  timeLimit: number;
}

function pad(n: number, length: number, char: string = "0") {
  let s = n.toString();
  while (s.length < length) {
    s = `0${s}`;
  }
  return s;
}

export class FootballField extends AbstractGameState<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeam, FootballTeamMetrics, FootballGameConfig> {
  private _teams!: ReadonlyArray<FootballTeam>;
  private _totalBalls!: number;
  private _ballCount = new BallCount();
  private _finishedStart = false;
  private _score = new Map<FootballTeam, number>();
  private _homeGoals = new Map<FootballTeam, Point>();
  private _teamPlayerPositions = new Map<FootballTeam, ReadonlyArray<Point>>();
  public configure(players: ReadonlyArray<FootballTeam>): void {
    this._teams = players;
    this._homeGoals.set(this._teams[0], { x: 0, y: 0 });
    this._homeGoals.set(this._teams[1], { x: 0, y: this.config.fieldLength - 1 });
    this._homeGoals.set(this._teams[2], { x: this.config.fieldLength - 1, y: 0 });
    this._homeGoals.set(this._teams[3], { x: this.config.fieldLength - 1, y: this.config.fieldLength - 1 });

    this._totalBalls = this.config.fieldLength * this.config.fieldLength;
    for (let x = 0; x < this.config.fieldLength; ++x) {
      for (let y = 0; y < this.config.fieldLength; ++y) {
        this._ballCount.setAt({ x, y }, 1);
      }
    }
  }
  public startOrder(): ReadonlyArray<FootballTeam> {
    return this._teams;
  }
  public startInfoForPlayer(team: FootballTeam): FootballTeamStartInfo {
    const homeGoal = this._homeGoals.get(team);
    if (!homeGoal) {
      throw new Error();
    }
    return {
      config: this.config,
      homeGoal,
    };
  }
  public processStartResult(team: FootballTeam, result: FootballTeamStartResult): boolean {
    for (const position of result.playerPositions) {
      if (!this.isValid(position)) {
        return false;
      }
    }
    return true;
  }
  public postStart(results: Map<FootballTeam, FootballTeamStartResult>): void {
    for (const [team, result] of results.entries()) {
      this._teamPlayerPositions.set(team, result.playerPositions);
    }
    this._finishedStart = true;
  }
  public isGameOver(): boolean {
    return this._totalBalls === 0 || this.time >= this.config.timeLimit;
  }
  public preRound(): void {
    // if (this.time % 100 === 0) {
    //   console.log(`time: ${this.time}, balls: ${this._totalBalls}`);
    //   const output: string[] = [];
    //   for (let x = 0; x < this.config.fieldLength; ++x) {
    //     const row: string[] = [];
    //     for (let y = 0; y < this.config.fieldLength; ++y) {
    //       const balls = this._ballCount.getAt({ x, y });
    //       row.push(pad(balls, 2));
    //     }
    //     output.push(row.join(" "));
    //   }
    //   console.log(output.join("\n"));
    // }
    return;
  }
  public roundOrder(): ReadonlyArray<FootballTeam> {
    return this._teams;
  }
  public roundInfoForPlayer(team: FootballTeam): FootballTeamRoundInfo {
    const playerPositions = this._teamPlayerPositions.get(team);
    if (!playerPositions) {
      throw new Error();
    }
    return {
      balls: this._ballCount,
      playerPositions,
    };
  }
  public processRoundResult(player: FootballTeam, result: FootballTeamRoundResult): boolean {
    const positions = this._teamPlayerPositions.get(player);
    if (!positions) {
      throw new Error();
    }
    for (let i = 0; i < this.config.teamPlayers; ++i) {
      const position = positions[i];
      const action = result.playerActions[i];
      const newPosition = { x: position.x + action.delta.x, y: position.y + action.delta.y };
      if (!this.isValid(newPosition)) {
        return false;
      }
    }
    return true;
  }
  public postRound(results: Map<FootballTeam, FootballTeamRoundResult>): void {
    const kicks = new Multimap<Point, PlayerAction>();
    for (const [team, result] of results.entries()) {
      const positions = this._teamPlayerPositions.get(team);
      if (!positions) {
        throw new Error();
      }
      for (let i = 0; i < this.config.teamPlayers; ++i) {
        const position = positions[i];
        const action = result.playerActions[i];
        // console.log(team.name(), i, action);
        if (action.type === "kick") {
          kicks.put(position, action);
        } else {
          position.x += action.delta.x;
          position.y += action.delta.y;
        }
      }
    }
    for (const [ball, actions] of kicks.entries()) {
      const numBalls = this._ballCount.getAt(ball);
      if (numBalls === 0) {
        continue;
      }
      const allowedKicks = [...actions];
      while (allowedKicks.length > numBalls) {
        const idx = this.random.nextInt(allowedKicks.length);
        allowedKicks.splice(idx, 1);
      }
      const ballsLeft = numBalls - allowedKicks.length;
      this._ballCount.setAt(ball, ballsLeft);
      for (const kick of allowedKicks) {
        const landingZone = { x: ball.x + kick.delta.x, y: ball.y + kick.delta.y };
        const currentNumBalls = this._ballCount.getAt(landingZone);
        this._ballCount.setAt(landingZone, currentNumBalls + 1);
      }
    }
    for (const team of results.keys()) {
      const homeGoal = this._homeGoals.get(team);
      if (!homeGoal) {
        throw new Error();
      }
      const scored = this._ballCount.getAt(homeGoal);
      this._ballCount.setAt(homeGoal, 0);
      this._totalBalls -= scored;
      const score = (this._score.get(team) || 0) + scored;
      this._score.set(team, score);
    }
  }
  public getInitialMetricsForPlayer(player: FootballTeam): FootballTeamMetrics {
    return {
      timeRecorded: this.time,
      score: this._score.get(player) || 0,
    };
  }
  public getCurrentMetricsForPlayer(player: FootballTeam, previous: FootballTeamMetrics | undefined): FootballTeamMetrics {
    return {
      timeRecorded: this.time,
      score: this._score.get(player) || 0,
    };
  }

  private isValid(point: Point): boolean {
    return point.x >= 0 && point.x < this.config.fieldLength && point.y >= 0 && point.y < this.config.fieldLength;
  }
}

export const FootballFieldFactory: GameStateFactory<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeam, FootballTeamMetrics, FootballGameConfig, FootballField> = (random: Random, config: FootballGameConfig) => new FootballField(random, config);

export class FootballGame extends MultiPlayerGame<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeam, FootballTeamMetrics, FootballGameConfig, FootballField> {

}

export const FootballGameFactory: GameFactory<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeam, FootballTeamMetrics, FootballGameConfig, FootballField> = (random: Random, state: FootballField) => new FootballGame(random, state);
