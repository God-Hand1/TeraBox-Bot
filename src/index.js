import { createServer } from 'node:http'
import { getConfig } from './config/index.js'
import { getLogger } from './logger/index.js'
import { TeraBoxService } from './services/terabox.js'
import { DownloaderService } from './services/downloader.js'
import { QueueService } from './services/queue.js'
import { createBot } from './bot/index.js'
import { HEALTH_CHECK_PORT } from './constants/index.js'

async function validateEnvironment() {
  const log = getLogger()

  try {
    getConfig()
    log.info('Configuration validated successfully')
  } catch (error) {
    log.fatal({ error: error.message }, 'Configuration validation failed')
    process.exit(1)
  }

  const config = getConfig()

  if (!config.botToken || config.botToken === 'your_telegram_bot_token_here') {
    log.fatal('BOT_TOKEN is not configured')
    process.exit(1)
  }

  log.info('Streaming pipeline: no local storage required')
}

async function setupHealthServer() {
  const config = getConfig()
  const log = getLogger()
  const port = config.port || HEALTH_CHECK_PORT

  const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }))
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  })

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      log.info({ port }, 'Health check server listening')
      resolve(server)
    })
  })
}

async function shutdown(signal, stopBot, healthServer, downloaderService, queueService) {
  const log = getLogger()
  log.info({ signal }, 'Shutdown initiated')

  try {
    if (stopBot) {
      await stopBot()
      log.info('Bot stopped')
    }

    if (downloaderService) {
      const activeDownloads = downloaderService.getActiveDownloads()
      for (const downloadId of activeDownloads) {
        downloaderService.cancelDownload(downloadId)
      }
      log.info({ cancelled: activeDownloads.length }, 'Active downloads cancelled')
    }

    if (queueService) {
      queueService.clear()
      log.info('Queue cleared')
    }

    if (healthServer) {
      await new Promise((resolve) => healthServer.close(resolve))
      log.info('Health server stopped')
    }

    log.info('Shutdown complete')
  } catch (error) {
    log.error({ error: error.message }, 'Error during shutdown')
  }

  process.exit(0)
}

async function main() {
  const log = getLogger()

  log.info('Starting TeraBox Downloader Bot')
  log.info({ nodeVersion: process.version, platform: process.platform }, 'Runtime info')

  await validateEnvironment()

  const teraboxService = new TeraBoxService()
  const downloaderService = new DownloaderService()
  const queueService = new QueueService()

  const { bot, start, stop: shutdownBot } = createBot({
    teraboxService,
    downloaderService,
    queueService,
  })

  const healthServer = await setupHealthServer()

  bot.catch((err) => {
    log.error({ error: err.message }, 'Bot error')
  })

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
      await shutdown(signal, shutdownBot, healthServer, downloaderService, queueService)
    })
  }

  process.on('uncaughtException', (error) => {
    log.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception')
    shutdown('SIGTERM', shutdownBot, healthServer, downloaderService, queueService)
  })

  process.on('unhandledRejection', (reason) => {
    log.error({ error: reason?.message || String(reason) }, 'Unhandled rejection')
  })

  try {
    await start()
  } catch (error) {
    log.fatal({ error: error.message }, 'Failed to start bot')
    process.exit(1)
  }
}

main()
