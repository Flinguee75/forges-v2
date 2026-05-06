import { CircuitBreakerService } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ouvre le circuit si le taux d erreur dépasse le seuil', () => {
    const breaker = new CircuitBreakerService({
      failureThresholdPct: 50,
      minimumSamples: 4,
      openTimeoutMs: 30_000,
    });

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();

    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);
  });

  it('passe en HALF_OPEN après timeout puis se referme sur succès', () => {
    const breaker = new CircuitBreakerService({
      failureThresholdPct: 50,
      minimumSamples: 2,
      openTimeoutMs: 30_000,
    });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    jest.advanceTimersByTime(30_000);

    expect(breaker.canExecute()).toBe(true);
    expect(breaker.getState()).toBe('HALF_OPEN');

    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });
});
