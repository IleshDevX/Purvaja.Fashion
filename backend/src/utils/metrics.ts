/**
 * Operational Metrics Subsystem for Purvaja Fashion E-Commerce Backend.
 *
 * Tracks high-fidelity operational counters, histograms, and subsystem health
 * without storing or exposing customer PII, secrets, or financial payloads.
 */

export interface LatencyStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
}

export interface WorkerMetricsSnapshot {
  totalSweeps: number;
  successfulSweeps: number;
  failedSweeps: number;
  totalReleasedReservations: number;
  lastRunAt: string | null;
  lastCompletedAt: string | null;
  lastDurationMs: number;
  concurrencySkips: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  http: {
    totalRequests: number;
    status2xx: number;
    status3xx: number;
    status4xx: number;
    status5xx: number;
    activeRequests: number;
    latency: LatencyStats;
    byRoute: Record<string, { count: number; errors: number; avgMs: number }>;
  };
  database: {
    queriesExecuted: number;
    queryFailures: number;
    poolTimeouts: number;
    lastFailureAt: string | null;
  };
  redis: {
    operations: number;
    hits: number;
    misses: number;
    fallbacks: number;
    connectionErrors: number;
  };
  business: {
    checkout: {
      attempts: number;
      successes: number;
      failures: number;
    };
    payments: {
      initiated: number;
      succeeded: number;
      failed: number;
      cancelled: number;
      expired: number;
      reconciled: number;
      mismatches: number;
    };
    reservations: {
      created: number;
      consumed: number;
      released: number;
      expired: number;
      releaseFailures: number;
    };
    inventory: {
      adjustments: number;
      adjustmentFailures: number;
    };
    coupons: {
      validations: number;
      redemptions: number;
      reverts: number;
      conflicts: number;
    };
    returns: {
      requested: number;
      approved: number;
      rejected: number;
      refunded: number;
      failures: number;
    };
  };
  worker: WorkerMetricsSnapshot;
}

class MetricsRegistry {
  static readonly MAX_ROUTE_LABELS = 100;
  static readonly OVERFLOW_ROUTE = '__other__';
  private startTime = Date.now();
  private activeRequests = 0;

  // HTTP metrics
  private httpRequestsTotal = 0;
  private http2xx = 0;
  private http3xx = 0;
  private http4xx = 0;
  private http5xx = 0;
  private httpLatencyTotalMs = 0;
  private httpLatencyMinMs = Number.POSITIVE_INFINITY;
  private httpLatencyMaxMs = 0;
  private routesMap = new Map<string, { count: number; errors: number; totalMs: number }>();

  // Database metrics
  private dbQueries = 0;
  private dbFailures = 0;
  private dbPoolTimeouts = 0;
  private lastDbFailureAt: string | null = null;

  // Redis metrics
  private redisOps = 0;
  private redisHits = 0;
  private redisMisses = 0;
  private redisFallbacks = 0;
  private redisErrors = 0;

  // Business metrics
  private checkoutAttempts = 0;
  private checkoutSuccesses = 0;
  private checkoutFailures = 0;

  private paymentsInitiated = 0;
  private paymentsSucceeded = 0;
  private paymentsFailed = 0;
  private paymentsCancelled = 0;
  private paymentsExpired = 0;
  private paymentsReconciled = 0;
  private paymentMismatches = 0;

  private reservationsCreated = 0;
  private reservationsConsumed = 0;
  private reservationsReleased = 0;
  private reservationsExpired = 0;
  private reservationReleaseFailures = 0;

  private inventoryAdjustments = 0;
  private inventoryAdjustmentFailures = 0;

  private couponValidations = 0;
  private couponRedemptions = 0;
  private couponReverts = 0;
  private couponConflicts = 0;

  private returnsRequested = 0;
  private returnsApproved = 0;
  private returnsRejected = 0;
  private returnsRefunded = 0;
  private returnFailures = 0;

  // Worker metrics
  private workerSweeps = 0;
  private workerSuccesses = 0;
  private workerFailures = 0;
  private workerReleasedCount = 0;
  private workerLastRunAt: string | null = null;
  private workerLastCompletedAt: string | null = null;
  private workerLastDurationMs = 0;
  private workerConcurrencySkips = 0;

  // ----------------- HTTP Tracking -----------------
  requestStarted(): void {
    this.activeRequests++;
  }

  requestCompleted(route: string, statusCode: number, durationMs: number): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.httpRequestsTotal++;
    this.httpLatencyTotalMs += durationMs;
    this.httpLatencyMinMs = Math.min(this.httpLatencyMinMs, durationMs);
    this.httpLatencyMaxMs = Math.max(this.httpLatencyMaxMs, durationMs);

    if (statusCode >= 200 && statusCode < 300) this.http2xx++;
    else if (statusCode >= 300 && statusCode < 400) this.http3xx++;
    else if (statusCode >= 400 && statusCode < 500) this.http4xx++;
    else if (statusCode >= 500) this.http5xx++;

    const requestedRoute = route.split('?')[0] || '/';
    const normalizedRoute = this.routesMap.has(requestedRoute) || this.routesMap.size < MetricsRegistry.MAX_ROUTE_LABELS - 1
      ? requestedRoute
      : MetricsRegistry.OVERFLOW_ROUTE;
    const entry = this.routesMap.get(normalizedRoute) ?? { count: 0, errors: 0, totalMs: 0 };
    entry.count++;
    entry.totalMs += durationMs;
    if (statusCode >= 400) entry.errors++;
    this.routesMap.set(normalizedRoute, entry);
  }

  // ----------------- Database Tracking -----------------
  recordDbQuery(success: boolean, isPoolTimeout = false): void {
    this.dbQueries++;
    if (!success) {
      this.dbFailures++;
      this.lastDbFailureAt = new Date().toISOString();
      if (isPoolTimeout) this.dbPoolTimeouts++;
    }
  }

  // ----------------- Redis Tracking -----------------
  recordRedisOp(outcome: 'hit' | 'miss' | 'fallback' | 'error'): void {
    this.redisOps++;
    if (outcome === 'hit') this.redisHits++;
    else if (outcome === 'miss') this.redisMisses++;
    else if (outcome === 'fallback') this.redisFallbacks++;
    else if (outcome === 'error') this.redisErrors++;
  }

  // ----------------- Business Tracking -----------------
  recordCheckoutAttempt(): void { this.checkoutAttempts++; }
  recordCheckoutSuccess(): void { this.checkoutSuccesses++; }
  recordCheckoutFailure(): void { this.checkoutFailures++; }

  recordPaymentInitiated(): void { this.paymentsInitiated++; }
  recordPaymentSucceeded(): void { this.paymentsSucceeded++; }
  recordPaymentFailed(): void { this.paymentsFailed++; }
  recordPaymentCancelled(): void { this.paymentsCancelled++; }
  recordPaymentExpired(): void { this.paymentsExpired++; }
  recordPaymentReconciled(): void { this.paymentsReconciled++; }
  recordPaymentMismatch(): void { this.paymentMismatches++; }

  recordReservationCreated(count = 1): void { this.reservationsCreated += count; }
  recordReservationConsumed(count = 1): void { this.reservationsConsumed += count; }
  recordReservationReleased(count = 1): void { this.reservationsReleased += count; }
  recordReservationExpired(count = 1): void { this.reservationsExpired += count; }
  recordReservationReleaseFailure(): void { this.reservationReleaseFailures++; }

  recordInventoryAdjustment(): void { this.inventoryAdjustments++; }
  recordInventoryAdjustmentFailure(): void { this.inventoryAdjustmentFailures++; }

  recordCouponValidation(): void { this.couponValidations++; }
  recordCouponRedemption(): void { this.couponRedemptions++; }
  recordCouponRevert(): void { this.couponReverts++; }
  recordCouponConflict(): void { this.couponConflicts++; }

  recordReturnRequested(): void { this.returnsRequested++; }
  recordReturnApproved(): void { this.returnsApproved++; }
  recordReturnRejected(): void { this.returnsRejected++; }
  recordReturnRefunded(): void { this.returnsRefunded++; }
  recordReturnFailure(): void { this.returnFailures++; }

  // ----------------- Worker Tracking -----------------
  recordWorkerSweepStart(): void {
    this.workerSweeps++;
    this.workerLastRunAt = new Date().toISOString();
  }

  recordWorkerSweepCompleted(durationMs: number, releasedCount: number): void {
    this.workerSuccesses++;
    this.workerLastCompletedAt = new Date().toISOString();
    this.workerLastDurationMs = durationMs;
    this.workerReleasedCount += releasedCount;
  }

  recordWorkerSweepFailed(durationMs: number): void {
    this.workerFailures++;
    this.workerLastCompletedAt = new Date().toISOString();
    this.workerLastDurationMs = durationMs;
  }

  recordWorkerConcurrencySkip(): void {
    this.workerConcurrencySkips++;
  }

  // ----------------- Snapshot Exporter -----------------
  getSnapshot(): MetricsSnapshot {
    const byRoute: Record<string, { count: number; errors: number; avgMs: number }> = {};
    for (const [route, data] of this.routesMap.entries()) {
      byRoute[route] = {
        count: data.count,
        errors: data.errors,
        avgMs: data.count > 0 ? Math.round((data.totalMs / data.count) * 100) / 100 : 0,
      };
    }

    const minMs = Number.isFinite(this.httpLatencyMinMs) ? this.httpLatencyMinMs : 0;
    const avgMs = this.httpRequestsTotal > 0 ? Math.round((this.httpLatencyTotalMs / this.httpRequestsTotal) * 100) / 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      http: {
        totalRequests: this.httpRequestsTotal,
        status2xx: this.http2xx,
        status3xx: this.http3xx,
        status4xx: this.http4xx,
        status5xx: this.http5xx,
        activeRequests: this.activeRequests,
        latency: {
          count: this.httpRequestsTotal,
          totalMs: Math.round(this.httpLatencyTotalMs),
          minMs: Math.round(minMs * 100) / 100,
          maxMs: Math.round(this.httpLatencyMaxMs * 100) / 100,
          avgMs,
        },
        byRoute,
      },
      database: {
        queriesExecuted: this.dbQueries,
        queryFailures: this.dbFailures,
        poolTimeouts: this.dbPoolTimeouts,
        lastFailureAt: this.lastDbFailureAt,
      },
      redis: {
        operations: this.redisOps,
        hits: this.redisHits,
        misses: this.redisMisses,
        fallbacks: this.redisFallbacks,
        connectionErrors: this.redisErrors,
      },
      business: {
        checkout: {
          attempts: this.checkoutAttempts,
          successes: this.checkoutSuccesses,
          failures: this.checkoutFailures,
        },
        payments: {
          initiated: this.paymentsInitiated,
          succeeded: this.paymentsSucceeded,
          failed: this.paymentsFailed,
          cancelled: this.paymentsCancelled,
          expired: this.paymentsExpired,
          reconciled: this.paymentsReconciled,
          mismatches: this.paymentMismatches,
        },
        reservations: {
          created: this.reservationsCreated,
          consumed: this.reservationsConsumed,
          released: this.reservationsReleased,
          expired: this.reservationsExpired,
          releaseFailures: this.reservationReleaseFailures,
        },
        inventory: {
          adjustments: this.inventoryAdjustments,
          adjustmentFailures: this.inventoryAdjustmentFailures,
        },
        coupons: {
          validations: this.couponValidations,
          redemptions: this.couponRedemptions,
          reverts: this.couponReverts,
          conflicts: this.couponConflicts,
        },
        returns: {
          requested: this.returnsRequested,
          approved: this.returnsApproved,
          rejected: this.returnsRejected,
          refunded: this.returnsRefunded,
          failures: this.returnFailures,
        },
      },
      worker: {
        totalSweeps: this.workerSweeps,
        successfulSweeps: this.workerSuccesses,
        failedSweeps: this.workerFailures,
        totalReleasedReservations: this.workerReleasedCount,
        lastRunAt: this.workerLastRunAt,
        lastCompletedAt: this.workerLastCompletedAt,
        lastDurationMs: this.workerLastDurationMs,
        concurrencySkips: this.workerConcurrencySkips,
      },
    };
  }

  resetForTesting(): void {
    this.httpRequestsTotal = 0;
    this.http2xx = 0;
    this.http3xx = 0;
    this.http4xx = 0;
    this.http5xx = 0;
    this.httpLatencyTotalMs = 0;
    this.httpLatencyMinMs = Number.POSITIVE_INFINITY;
    this.httpLatencyMaxMs = 0;
    this.routesMap.clear();
    this.dbQueries = 0;
    this.dbFailures = 0;
    this.dbPoolTimeouts = 0;
    this.lastDbFailureAt = null;
    this.redisOps = 0;
    this.redisHits = 0;
    this.redisMisses = 0;
    this.redisFallbacks = 0;
    this.redisErrors = 0;
    this.checkoutAttempts = 0;
    this.checkoutSuccesses = 0;
    this.checkoutFailures = 0;
    this.paymentsInitiated = 0;
    this.paymentsSucceeded = 0;
    this.paymentsFailed = 0;
    this.paymentsCancelled = 0;
    this.paymentsExpired = 0;
    this.paymentsReconciled = 0;
    this.paymentMismatches = 0;
    this.reservationsCreated = 0;
    this.reservationsConsumed = 0;
    this.reservationsReleased = 0;
    this.reservationsExpired = 0;
    this.reservationReleaseFailures = 0;
    this.inventoryAdjustments = 0;
    this.inventoryAdjustmentFailures = 0;
    this.couponValidations = 0;
    this.couponRedemptions = 0;
    this.couponReverts = 0;
    this.couponConflicts = 0;
    this.returnsRequested = 0;
    this.returnsApproved = 0;
    this.returnsRejected = 0;
    this.returnsRefunded = 0;
    this.returnFailures = 0;
    this.workerSweeps = 0;
    this.workerSuccesses = 0;
    this.workerFailures = 0;
    this.workerReleasedCount = 0;
    this.workerLastRunAt = null;
    this.workerLastCompletedAt = null;
    this.workerLastDurationMs = 0;
    this.workerConcurrencySkips = 0;
  }
}

export const metrics = new MetricsRegistry();

type RouteRequest = {
  originalUrl?: string;
  path?: string;
  route?: { path?: unknown };
};

const SENSITIVE_OR_UNBOUNDED_SEGMENT = /^(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,}|[^/]*@[^/]*|(?=.*\d)(?=.*[a-zA-Z])[a-zA-Z0-9_-]{24,})$/i;

/**
 * Prefer Express' matched route pattern. The fallback never preserves values
 * that can create unbounded labels or expose identifiers in metrics.
 */
export function boundedRouteLabel(req: RouteRequest): string {
  const pathname = (req.originalUrl ?? req.path ?? '/').split('?')[0] || '/';
  const routePath = typeof req.route?.path === 'string' ? req.route.path : undefined;

  if (routePath) {
    const pathSegments = pathname.split('/').filter(Boolean);
    const routeSegments = routePath.split('/').filter(Boolean);
    const prefix = pathSegments.slice(0, Math.max(0, pathSegments.length - routeSegments.length));
    return `/${[...prefix, ...routeSegments].join('/')}`;
  }

  if (pathname === '/healthz' || pathname === '/readyz') return pathname;
  const normalized = pathname.split('/').filter(Boolean).map(segment =>
    SENSITIVE_OR_UNBOUNDED_SEGMENT.test(segment) || segment.length > 48 ? ':value' : segment,
  );
  return normalized.length === 0 ? '/' : `/${normalized.join('/')}`;
}
