import type { Express, NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../logger/app-logger.service';
import type { RedisService } from '../../redis/redis.service';

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_GENERAL_LIMIT = 300;
const DEFAULT_AUTH_LIMIT = 20;
const FALLBACK_MAX_KEYS = 10_000;

interface FallbackRateEntry {
  count: number;
  expiresAt: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requestIdentity(request: Request): string {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function isSensitiveAuthPath(pathname: string): boolean {
  return [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function registerProductionSecurityHeaders(
  expressApp: Express,
  isProduction: boolean,
): void {
  expressApp.disable('x-powered-by');

  expressApp.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(self), geolocation=(), payment=()',
    );
    if (isProduction) {
      response.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "connect-src 'self' https: wss:",
          "media-src 'self' blob: https:",
          "worker-src 'self' blob:",
        ].join('; '),
      );
      response.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }
    next();
  });
}

export function registerApiRateLimiting(
  expressApp: Express,
  redisService: RedisService,
  logger: AppLogger,
): void {
  const windowSeconds = positiveInteger(
    process.env.RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS,
  );
  const generalLimit = positiveInteger(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_GENERAL_LIMIT,
  );
  const authLimit = positiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_AUTH_LIMIT,
  );
  const fallback = new Map<string, FallbackRateEntry>();

  expressApp.use(async (request: Request, response: Response, next: NextFunction) => {
    if (request.method === 'OPTIONS' || !request.path.startsWith('/api/v1/')) {
      next();
      return;
    }

    const sensitive = isSensitiveAuthPath(request.path);
    const limit = sensitive ? authLimit : generalLimit;
    const scope = sensitive ? 'auth' : 'api';
    const now = Date.now();
    const bucket = Math.floor(now / (windowSeconds * 1000));
    const identity = requestIdentity(request);
    const key = `voicecloud:rate-limit:${scope}:${bucket}:${identity}`;
    let count: number;

    try {
      const redis = redisService.getClient();
      count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds + 1);
      }
    } catch (error) {
      const expiresAt = (bucket + 1) * windowSeconds * 1000;
      const current = fallback.get(key);
      count = current && current.expiresAt > now ? current.count + 1 : 1;
      fallback.set(key, { count, expiresAt });

      if (fallback.size > FALLBACK_MAX_KEYS) {
        for (const [candidate, entry] of fallback) {
          if (entry.expiresAt <= now) fallback.delete(candidate);
          if (fallback.size <= FALLBACK_MAX_KEYS) break;
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Rate limiter Redis fallback engaged: ${message}`);
    }

    response.setHeader('RateLimit-Limit', String(limit));
    response.setHeader('RateLimit-Remaining', String(Math.max(0, limit - count)));
    response.setHeader('RateLimit-Reset', String(windowSeconds));

    if (count > limit) {
      response.setHeader('Retry-After', String(windowSeconds));
      response.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please retry later.',
        error: 'Too Many Requests',
      });
      return;
    }

    next();
  });
}
