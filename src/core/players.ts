import { Random } from "./random";


export interface PlayerStartInfo {}
export interface PlayerStartResult {}
export interface PlayerRoundInfo {}
export interface PlayerRoundResult {}

export type PlayerClassName = string & { __PlayerClassName: never };
export type PlayerName = string & { __PlayerName: never };

export abstract class AbstractPlayer<START_INFO extends PlayerStartInfo, START_RESULT extends PlayerStartResult, ROUND_INFO extends PlayerRoundInfo, ROUND_RESULT extends PlayerRoundResult> {
  constructor(public readonly random: Random, public readonly index: number) {

  }
  public abstract readonly className: PlayerClassName;
  public name(): PlayerName {
    return `${this.className}_${this.index}` as PlayerName;
  }
  public abstract processStart(info: START_INFO): START_RESULT;
  public abstract processRound(info: ROUND_INFO): ROUND_RESULT;
}

export type PlayerFactory<
  START_INFO extends PlayerStartInfo,
  START_RESULT extends PlayerStartResult,
  ROUND_INFO extends PlayerRoundInfo,
  ROUND_RESULT extends PlayerRoundResult,
  PLAYER extends AbstractPlayer<START_INFO, START_RESULT, ROUND_INFO, ROUND_RESULT>> = (random: Random, index: number) => PLAYER;
