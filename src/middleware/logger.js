import { getLogger } from '../logger/index.js'

function loggingMiddleware() {
  const log = getLogger()

  return async (ctx, next) => {
    const start = Date.now()
    const updateId = ctx.update.update_id
    const userId = ctx.from?.id
    const username = ctx.from?.username || 'unknown'
    const chatId = ctx.chat?.id

    log.debug(
      { updateId, userId, username, chatId },
      'Processing update',
    )

    try {
      await next()
    } finally {
      const ms = Date.now() - start
      log.debug(
        { updateId, ms },
        'Update processed',
      )
    }
  }
}

export { loggingMiddleware }
