import { randomUUID } from 'node:crypto';
import { CommerceService } from './commerce.service.js';
import { logger, logOperationalEvent } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';
import { operationalAlerts } from './operational-alert.service.js';

export interface WorkerTelemetry {
  isStarted: boolean;
  isSweepRunning: boolean;
  intervalMs: number;
  totalSweeps: number;
  successfulSweeps: number;
  failedSweeps: number;
  totalReleasedReservations: number;
  lastRunAt: string | null;
  lastDurationMs: number;
  concurrencySkips: number;
}

export class ReservationCleanupWorker {
  private static instance: ReservationCleanupWorker | null = null;

  private isStarted = false;
  private isSweepRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private commerceService: CommerceService;
  private intervalMs = 60_000;
  private startedAt = 0;
  private lastCompletedAt = 0;
  private stallAlertSent = false;

  private constructor() {
    this.commerceService = new CommerceService();
  }

  public static getInstance(): ReservationCleanupWorker {
    if (!ReservationCleanupWorker.instance) {
      ReservationCleanupWorker.instance = new ReservationCleanupWorker();
    }
    return ReservationCleanupWorker.instance;
  }

  public static resetInstanceForTesting(): void {
    if (ReservationCleanupWorker.instance) {
      ReservationCleanupWorker.instance.stop();
      ReservationCleanupWorker.instance = null;
    }
  }

  public start(intervalMs = 60_000): void {
    if (this.isStarted) {
      logger.warn('ReservationCleanupWorker is already running; duplicate start invocation ignored.');
      return;
    }

    this.intervalMs = intervalMs;
    this.isStarted = true;
    this.startedAt = Date.now();
    this.lastCompletedAt = 0;
    this.stallAlertSent = false;
    logger.info({ intervalMs: this.intervalMs }, 'Starting ReservationCleanupWorker.');

    this.timer = setInterval(() => {
      void this.runSweep().catch(error => {
        logger.error(
          { error: error instanceof Error ? error.message : 'UnknownError' },
          'Unhandled exception in background reservation worker tick.',
        );
      });
    }, this.intervalMs);
    this.timer.unref();
    this.watchdog = setInterval(() => { void this.checkForStall(); }, Math.max(1_000, this.intervalMs));
    this.watchdog.unref();
  }

  public stop(): void {
    if (!this.isStarted && !this.timer) {
      return;
    }

    this.isStarted = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    logger.info('ReservationCleanupWorker stopped cleanly.');
  }

  public isRunning(): boolean {
    return this.isStarted;
  }

  public async runSweep(): Promise<{
    releasedCount: number;
    durationMs: number;
    sweepId: string;
  }> {
    const sweepId = randomUUID();

    // 1. Guard against overlapping executions inside the same process
    if (this.isSweepRunning) {
      metrics.recordWorkerConcurrencySkip();
      logger.warn(
        { sweepId },
        'Background reservation cleanup sweep skipped: previous sweep execution is still running.',
      );
      return { releasedCount: 0, durationMs: 0, sweepId };
    }

    this.isSweepRunning = true;
    const startTime = performance.now();
    metrics.recordWorkerSweepStart();

    logger.debug({ sweepId }, 'Starting reservation cleanup sweep.');

    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= MAX_RETRIES) {
      try {
        const result = await this.commerceService.releaseExpiredReservations();
        const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

        if (result.skippedDueToDistributedLock) {
          metrics.recordWorkerConcurrencySkip();
          this.lastCompletedAt = Date.now();
          this.stallAlertSent = false;
          this.isSweepRunning = false;
          return { releasedCount: 0, durationMs, sweepId };
        }

        metrics.recordWorkerSweepCompleted(durationMs, result.releasedCount);
        this.lastCompletedAt = Date.now();
        this.stallAlertSent = false;

        if (result.releasedCount > 0) {
          logOperationalEvent('reservation_expired', {
            sweepId,
            releasedCount: result.releasedCount,
            durationMs,
          });
        }

        this.isSweepRunning = false;
        return { releasedCount: result.releasedCount, durationMs, sweepId };
      } catch (error) {
        attempt++;
        lastError = error;
        logger.warn(
          {
            sweepId,
            attempt,
            maxRetries: MAX_RETRIES,
            error: error instanceof Error ? error.message : 'UnknownError',
          },
          'Reservation cleanup sweep encountered an error during execution.',
        );

        if (attempt <= MAX_RETRIES) {
          // Bounded exponential backoff between retries (100ms, 200ms)
          await new Promise(resolve => setTimeout(resolve, attempt * 100));
        }
      }
    }

    // If retries exhausted
    const totalDurationMs = Math.round((performance.now() - startTime) * 100) / 100;
    metrics.recordWorkerSweepFailed(totalDurationMs);
    metrics.recordReservationReleaseFailure();

    logger.error(
      {
        sweepId,
        attempts: attempt,
        durationMs: totalDurationMs,
        error: lastError instanceof Error ? lastError.message : 'UnknownError',
      },
      'Background reservation cleanup sweep failed after exhausting retries.',
    );
    void operationalAlerts.deliver({
      code: 'RESERVATION_WORKER_FAILED',
      severity: 'critical',
      summary: 'Reservation cleanup exhausted its retry budget.',
      attributes: { attempts: attempt, durationMs: totalDurationMs },
    }, 'reservation-worker-failed');

    this.lastCompletedAt = Date.now();
    this.isSweepRunning = false;
    return { releasedCount: 0, durationMs: totalDurationMs, sweepId };
  }

  public getTelemetry(): WorkerTelemetry {
    const snapshot = metrics.getSnapshot();
    return {
      isStarted: this.isStarted,
      isSweepRunning: this.isSweepRunning,
      intervalMs: this.intervalMs,
      totalSweeps: snapshot.worker.totalSweeps,
      successfulSweeps: snapshot.worker.successfulSweeps,
      failedSweeps: snapshot.worker.failedSweeps,
      totalReleasedReservations: snapshot.worker.totalReleasedReservations,
      lastRunAt: snapshot.worker.lastRunAt,
      lastDurationMs: snapshot.worker.lastDurationMs,
      concurrencySkips: snapshot.worker.concurrencySkips,
    };
  }

  public async checkForStall(now = Date.now()): Promise<boolean> {
    if (!this.isStarted) return false;
    const reference = this.lastCompletedAt || this.startedAt;
    const stalled = now - reference > this.intervalMs * 3;
    if (stalled && !this.stallAlertSent) {
      this.stallAlertSent = true;
      await operationalAlerts.deliver({
        code: 'RESERVATION_WORKER_STALLED',
        severity: 'critical',
        summary: 'Reservation cleanup has not completed within three scheduled intervals.',
        attributes: { intervalMs: this.intervalMs, elapsedMs: now - reference },
      }, 'reservation-worker-stalled');
    }
    return stalled;
  }
}
