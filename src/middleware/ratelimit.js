import { getLogger } from '../logger/index.js'
import { RATE_LIMIT } from '../constants/index.js'

class RateLimiter {
  constructor() {
    this._windows = new Map()
    this._windowMs = RATE_LIMIT.windowMs
    this._maxRequests = RATE_LIMIT.maxRequests
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000)
  }

  _cleanup() {
    const now = Date.now()
    for (const [key, window] of this._windows) {
      window.entries = window.entries.filter((t) => now - t < this._windowMs)
      if (window.entries.length === 0) {
        this._windows.delete(key)
      }
    }
  }

  check(key) {
    const now = Date.now()
    let window = this._windows.get(key)

    if (!window) {
      window = { entries: [], blocked: false }
      this._windows.set(key, window)
    }

    window.entries = window.entries.filter((t) => now - t < this._windowMs)

    if (window.blocked) {
      return false
    }

    if (window.entries.length >= this._maxRequests) {
      window.blocked = true
      setTimeout(() => {
        const w = this._windows.get(key)
        if (w) w.blocked = false
      }, this._windowMs)
      return false
    }

    window.entries.push(now)
    return true
  }

  destroy() {
    clearInterval(this._cleanupInterval)
    this._windows.clear()
  }
}

function rateLimitMiddleware(rateLimiter) {
  return async (ctx, next) => {
    const userId = ctx.from?.id
    if (!userId) {
      await next()
      return
    }

    const key = String(userId)

    if (!rateLimiter.check(key)) {
      const log = getLogger()
      log.warn({ userId }, 'Rate limit exceeded')

      try {
        await ctx.reply(
          '⚠️ *Too many requests*\n\nPlease wait a moment before sending another request\\.',
          { parse_mode: 'MarkdownV2' },
        )
      } catch {
      }
      return
    }

    await next()
  }
}

export { rateLimitMiddleware, RateLimiter }
