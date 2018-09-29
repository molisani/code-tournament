import { Multimap } from "./common";

export class Statistic {
  public readonly min: number;
  public readonly max: number;
  public readonly mean: number;
  public readonly stddev: number;
  public readonly count: number;
  constructor(values: number[]) {
    let tempMin = Number.POSITIVE_INFINITY;
    let tempMax = Number.NEGATIVE_INFINITY;
    let total = 0;
    for (const val of values) {
      tempMin = Math.min(tempMin, val);
      tempMax = Math.max(tempMax, val);
      total += val;
    }
    this.min = tempMin;
    this.max = tempMax;
    this.count = values.length;
    this.mean = total / this.count;
    let residuals = 0;
    for (const val of values) {
      const diff = val - this.mean;
      residuals += Math.pow(diff, 2);
    }
    this.stddev = Math.sqrt(residuals / (this.count - 1));
  }
}

export interface PlayerMetricField<METRICS extends PlayerMetricsEntry> {
  name: string;
  chart: boolean;
  propertyName: keyof METRICS;
}

export class PlayerMetricsConfig<METRICS extends PlayerMetricsEntry> {
  constructor(private _fields: ReadonlyArray<PlayerMetricField<METRICS>>) {
  }
  extractStatistics(allMetrics: ReadonlyArray<METRICS>): Map<PlayerMetricField<METRICS>, Statistic> {
    const valuesByField = new Multimap<PlayerMetricField<METRICS>, number>();
    for (const metrics of allMetrics) {
      for (const field of this._fields) {
        valuesByField.put(field, metrics[field.propertyName]);
      }
    }
    const statistics = new Map<PlayerMetricField<METRICS>, Statistic>();
    for (const [field, values] of valuesByField) {
      statistics.set(field, new Statistic(values));
    }
    return statistics;
  }
}

export interface PlayerMetricsEntry {
  [propertyName: string]: number;
  timeRecorded: number;
}


