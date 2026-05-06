export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThresholdPct?: number;
  minimumSamples?: number;
  openTimeoutMs?: number;
}

export class CircuitBreakerService {
  private state: CircuitBreakerState = 'CLOSED';
  private openedAt?: number;
  private readonly samples: boolean[] = [];
  private readonly failureThresholdPct: number;
  private readonly minimumSamples: number;
  private readonly openTimeoutMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThresholdPct = options.failureThresholdPct ?? 50;
    this.minimumSamples = options.minimumSamples ?? 10;
    this.openTimeoutMs = options.openTimeoutMs ?? 30_000;
  }

  canExecute(): boolean {
    if (this.state !== 'OPEN') return true;

    if (this.openedAt && Date.now() - this.openedAt >= this.openTimeoutMs) {
      this.state = 'HALF_OPEN';
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.reset();
      return;
    }

    this.record(true);
  }

  recordFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.open();
      return;
    }

    this.record(false);
    this.evaluate();
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.openedAt = undefined;
    this.samples.length = 0;
  }

  private record(success: boolean): void {
    this.samples.push(success);
    if (this.samples.length > this.minimumSamples) {
      this.samples.shift();
    }
  }

  private evaluate(): void {
    if (this.samples.length < this.minimumSamples) return;

    const failures = this.samples.filter((success) => !success).length;
    const failureRate = (failures / this.samples.length) * 100;

    if (failureRate > this.failureThresholdPct) {
      this.open();
    }
  }

  private open(): void {
    this.state = 'OPEN';
    this.openedAt = Date.now();
  }
}

export const ngserCircuitBreaker = new CircuitBreakerService({
  failureThresholdPct: Number(process.env.NGSER_CIRCUIT_FAILURE_THRESHOLD_PCT || 50),
  minimumSamples: Number(process.env.NGSER_CIRCUIT_MINIMUM_SAMPLES || 10),
  openTimeoutMs: Number(process.env.NGSER_CIRCUIT_OPEN_TIMEOUT_MS || 30_000),
});
