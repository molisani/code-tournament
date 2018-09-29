import { PlayerMetricsEntry } from "../../../core/metrics";
import { AbstractPlayer, PlayerFactory, PlayerRoundInfo, PlayerRoundResult, PlayerStartInfo, PlayerStartResult } from "../../../core/players";
import { BallCount, Point } from "./common";
import { FootballGameConfig } from "./game";

export interface FootballTeamStartInfo extends PlayerStartInfo {
  config: FootballGameConfig;
  homeGoal: Point;
}

export interface FootballTeamStartResult extends PlayerStartResult {
  playerPositions: ReadonlyArray<Point>;
}

export interface FootballTeamRoundInfo extends PlayerRoundInfo {
  playerPositions: ReadonlyArray<Point>;
  balls: BallCount;
}

export interface FootballTeamRoundResult extends PlayerRoundResult {
  playerActions: ReadonlyArray<PlayerAction>
}

export interface Move {
  type: "move";
  delta: Point;
}

export interface Kick {
  type: "kick";
  delta: Point;
}

export type PlayerAction = Move | Kick;

export abstract class FootballTeam extends AbstractPlayer<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult> {

  public processStart(info: FootballTeamStartInfo): FootballTeamStartResult {
    const playerPositions = this.init(info.config.teamPlayers, info.config.kickDistance, info.config.fieldLength, info.homeGoal);
    return { playerPositions };
  }

  public processRound(info: FootballTeamRoundInfo): FootballTeamRoundResult {
    const playerActions = this.move(info.playerPositions, info.balls);
    return { playerActions };
  }

  public abstract init(players: number, kickDistance: number, fieldLength: number, homeGoal: Point): ReadonlyArray<Point>;
  public abstract move(playerPositions: ReadonlyArray<Point>, balls: BallCount): ReadonlyArray<PlayerAction>;

}

export interface FootballTeamMetrics extends PlayerMetricsEntry {

  score: number;

}

export type FootballTeamFactory = PlayerFactory<FootballTeamStartInfo, FootballTeamStartResult, FootballTeamRoundInfo, FootballTeamRoundResult, FootballTeam>;
