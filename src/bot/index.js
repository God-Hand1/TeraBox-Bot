import { Bot } from 'grammy'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logger/index.js'
import { loggingMiddleware } from '../middleware/logger.js'
import { errorHandlerMiddleware } from '../middleware/error.js'
import { rateLimitMiddleware, RateLimiter } from '../middleware/ratelimit.js'
import { registerCommands } from './commands.js'
import { registerAdminCommands } from './admin.js'
import { registerHandlers } from './handlers.js'
import { UploaderService } from '../services/uploader.js'

function createBot(services) {
  const config = getConfig()
  const log = getLogger()

  log.info('Initializing Telegram bot')

  const bot = new Bot(config.botToken)

  const uploaderService = new UploaderService()

  const rateLimiter = new RateLimiter()

  bot.use(loggingMiddleware())
  bot.use(errorHandlerMiddleware())
  bot.use(rateLimitMiddleware(rateLimiter))

  registerCommands(bot)

  registerAdminCommands(bot, services.queueService, services.downloaderService)

  registerHandlers(
    bot,
    services.teraboxService,
    services.downloaderService,
    uploaderService,
    services.queueService,
  )

  bot.catch((err) => {
    log.error(
      { error: err.message, stack: err.stack },
      'Bot error caught',
    )
  })

  async function start() {
    log.info('Starting bot polling')
    await bot.start({
      drop_pending_updates: true,
      onStart: () => {
        log.info('Bot started polling')
      },
    })
  }

  async function stop() {
    log.info('Stopping bot')
    rateLimiter.destroy()
    await bot.stop()
    log.info('Bot stopped')
  }

  return { bot, start, stop, uploaderService }
}

export { createBot }
