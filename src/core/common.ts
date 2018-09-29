
export class Multimap<K, V> extends Map<K, V[]> {
  put(key: K, val: V): this {
    const arr = this.get(key) || [];
    arr.push(val);
    this.set(key, arr);
    return this;
  }
}

export class Table<X, Y, V> {
  private _map = new Map<X, Map<Y, V>>();
  public set(x: X, y: Y, val: V): void {
    const yMap = this._map.get(x) || new Map<Y, V>();
    this._map.set(x, yMap);
    yMap.set(y, val);
  }
  public get(x: X, y: Y): V | undefined {
    const yMap = this._map.get(x);
    if (!yMap) {
      return yMap;
    }
    return yMap.get(y);
  }
  public* values(): IterableIterator<V> {
    for (const yMap of this._map.values()) {
      for (const val of yMap.values()) {
        yield val;
      }
    }
  }
}