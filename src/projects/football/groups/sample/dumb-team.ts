import { PlayerClassName } from "../../../../core/players";
import { Random } from "../../../../core/random";
import { BallCount, Point } from "../../core/common";
import { FootballTeam, FootballTeamFactory, PlayerAction } from "../../core/player";

export class DumbTeam extends FootballTeam {
  public className = "DumbTeam" as PlayerClassName;
  private _homeGoal!: Point;
  public init(players: number, kickDistance: number, fieldLength: number, homeGoal: Point): ReadonlyArray<Point> {
    this._homeGoal = homeGoal;
    const positions: Point[] = [];
    for (let i = 0; i < players; ++i) {
      positions.push({ x: this.random.nextInt(fieldLength), y: this.random.nextInt(fieldLength) });
    }
    return positions;
  }
  public move(playerPositions: ReadonlyArray<Point>, balls: BallCount): ReadonlyArray<PlayerAction> {
    const actions: PlayerAction[] = [];
    for (const position of playerPositions) {
      if (balls.getAt(position) > 0) {
        if (position.x > this._homeGoal.x) {
          actions.push({ type: "kick", delta: { x: -1, y: 0 } });
        } else if (position.x < this._homeGoal.x) {
          actions.push({ type: "kick", delta: { x: 1, y: 0 } });
        } else if (position.y > this._homeGoal.y) {
          actions.push({ type: "kick", delta: { x: 0, y: -1 } });
        } else {
          actions.push({ type: "kick", delta: { x: 0, y: 1 } });
        }
      } else {
        actions.push({ type: "move", delta: { x: this.random.nextInt(3) - 1, y: this.random.nextInt(3) - 1 } });
      }
    }
    return actions;
  }
}

export const DumbTeamFactory: FootballTeamFactory = (random: Random, index: number) => new DumbTeam(random, index);
