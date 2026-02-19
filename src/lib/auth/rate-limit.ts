/**
 * Rate Limiting
 *
 * Simple in-memory sliding window rate limiter keyed by userId.
 * Designed for Vercel serverless — note that each instance has its own
 * in-memory store, so limits are per-instance. This provides a reasonable
 * first line of defense against abuse without external dependencies.
 */

import { NextResponse } from 'next/server'

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const cutoff = now - windowMs
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t: number) => t > cutoff)
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  })
}

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique key for the rate limit bucket (e.g., `chat:${userId}`)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with `limited` boolean and remaining count
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): { limited: boolean; remaining: number; resetMs: number } {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const resetMs = oldestInWindow + windowMs - now
    return {
      limited: true,
      remaining: 0,
      resetMs,
    }
  }

  entry.timestamps.push(now)
  return {
    limited: false,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  }
}

/**
 * Returns a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(resetMs: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil(resetMs / 1000).toString(),
      },
    }
  )
}
