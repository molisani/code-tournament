import { Table } from "../../../core/common";

export interface Point {
  x: number;
  y: number;
}

export function equals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export class BallCount {
  private _table = new Table<number, number, number>();
  getAt(point: Point): number {
    return this._table.get(point.x, point.y) || 0;
  }
  setAt(point: Point, count: number): void {
    this._table.set(point.x, point.y, count);
  }
}
