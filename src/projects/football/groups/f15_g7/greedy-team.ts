import { PlayerClassName } from "../../../../core/players";
import { Random } from "../../../../core/random";
import { BallCount, distance, equals, Point } from "../../core/common";
import { FootballTeam, FootballTeamFactory, PlayerAction } from "../../core/player";

export class GreedyTeam extends FootballTeam {
  public className = "GreedyTeam" as PlayerClassName;
  private _homeGoal!: Point;
  private _players!: number;
  private _kickDistance!: number;
  private _fieldLength!: number;
  public init(players: number, kickDistance: number, fieldLength: number, homeGoal: Point): ReadonlyArray<Point> {
    this._homeGoal = homeGoal;
    this._players = players;
    this._kickDistance = kickDistance;
    this._fieldLength = fieldLength;

    const positions: Point[] = [];
    let currX = this._kickDistance;
    let currY = 0;
    for (let i = 0; i < players; ++i) {
      if (((currX * currX) + (currY * currY)) > (kickDistance * kickDistance)) {
        currX--;
        if (currX < 0) {
          currX = kickDistance;
        }
        currY = 0
      }

      positions.push({
        x: (homeGoal.x === 0) ? currX : homeGoal.x - currX,
        y: (homeGoal.y === 0) ? currY : homeGoal.y - currY,
      });
      currY++;
    }
    return positions;
  }
  private _getClosestWithMostBalls(balls: BallCount, current: Point, currentMinDist: number): Point {
    let minPosition: Point | undefined;
    let minDistance = currentMinDist;
    let maxBalls = 0;

    for (let x = current.x - 1; x <= current.x + 1; ++x) {
      for (let y = current.y - 1; y <= current.y + 1; ++y) {
        const testPoint = { x, y };
        if (equals(current, testPoint)) {
          continue;
        }
        if (x >= 0 && x < this._fieldLength && y >= 0 && y < this._fieldLength) {
          const b = balls.getAt(testPoint);
          if (b > 0) {
            const ballDistance = distance(current, testPoint);
            if (ballDistance < minDistance || ((ballDistance === minDistance) && b > maxBalls)) {
              minPosition = testPoint;
              minDistance = ballDistance;
              maxBalls = b;
            }
          }
        }
      }
    }

    if (!minPosition) {
      // TODO recurse on adjacent
      const randomMove = { x: this.random.nextInt(3) - 1, y: this.random.nextInt(3) - 1 };
      if (randomMove.x === 0 && randomMove.y === 0) {
        if (this.random.nextBoolean()) {
          randomMove.x = (this.random.nextInt(2) * 2) - 1;
        } else {
          randomMove.y = (this.random.nextInt(2) * 2) - 1;
        }
      }
      if (current.x === 0) {
        randomMove.x = this.random.nextInt(2);
      } else if (current.x === (this._fieldLength - 1)) {
        randomMove.x = -1 * this.random.nextInt(2);
      }
      if (current.y === 0) {
        randomMove.y = this.random.nextInt(2);
      } else if (current.y === (this._fieldLength - 1)) {
        randomMove.y = -1 * this.random.nextInt(2);
      }
      randomMove.x += current.x;
      randomMove.y += current.y;
      return randomMove;
    }
    return minPosition;
  }
  public move(playerPositions: ReadonlyArray<Point>, balls: BallCount): ReadonlyArray<PlayerAction> {
    const actions: PlayerAction[] = [];
    for (const position of playerPositions) {
      if (balls.getAt(position) > 0) {
        const maxKickX = this._homeGoal.x - position.x;
        const maxKickY = this._homeGoal.y - position.y;
        const distanceToGoal = distance(this._homeGoal, position);
        if (distanceToGoal <= this._kickDistance) {
          actions.push({
            type: "kick",
            delta: {
              x: maxKickX,
              y: maxKickY,
            },
          });
        } else {
          const angleOfGoal = Math.atan2(maxKickY, maxKickX);
          actions.push({
            type: "kick",
            delta: {
              x: Math.round(this._kickDistance * Math.cos(angleOfGoal)),
              y: Math.round(this._kickDistance * Math.sin(angleOfGoal)),
            },
          });
        }
      } else {
        const toBall = this._getClosestWithMostBalls(balls, position, Number.MAX_VALUE);
        actions.push({
          type: "move",
          delta: {
            x: toBall.x - position.x,
            y: toBall.y - position.y,
          },
        });
      }
    }
    return actions;
  }
}

export const GreedyTeamFactory: FootballTeamFactory = (random: Random, index: number) => new GreedyTeam(random, index);
