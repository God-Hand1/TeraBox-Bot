import { getConfig } from '../config/index.js'
import { MESSAGES } from '../constants/index.js'

function adminAuthMiddleware() {
  const config = getConfig()

  return async (ctx, next) => {
    const userId = ctx.from?.id

    if (!config.adminId) {
      try {
        await ctx.reply(MESSAGES.adminOnly, { parse_mode: 'MarkdownV2' })
      } catch {
      }
      return
    }

    if (String(userId) !== String(config.adminId)) {
      try {
        await ctx.reply(MESSAGES.adminOnly, { parse_mode: 'MarkdownV2' })
      } catch {
      }
      return
    }

    await next()
  }
}

function isAdmin(ctx) {
  const config = getConfig()
  if (!config.adminId) return false
  return String(ctx.from?.id) === String(config.adminId)
}

export { adminAuthMiddleware, isAdmin }
