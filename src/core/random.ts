
export class Random {
  constructor(private seed: number) {
  }
  public next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  public nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
  public nextBoolean(): boolean {
    return this.next() < 0.5;
  }
}
