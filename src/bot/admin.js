import { getLogger } from '../logger/index.js'
import { adminAuthMiddleware } from '../middleware/auth.js'
import { formatUptime, formatBytes, escapeMarkdown } from '../utils/format.js'
import { CALLBACK_ACTIONS } from '../constants/index.js'
import { START_TIME } from './commands.js'

function registerAdminCommands(bot, queueService, downloaderService) {
  const log = getLogger()

  const adminOnly = adminAuthMiddleware()

  bot.command('stats', adminOnly, async (ctx) => {
    const queueStats = queueService.getStats()
    const memory = process.memoryUsage()

    const stats = [
      '*📊 Bot Statistics*',
      '',
      '*Queue:*',
      `Pending: ${escapeMarkdown(String(queueStats.pending))}`,
      `Queued: ${escapeMarkdown(String(queueStats.size))}`,
      `Completed: ${escapeMarkdown(String(queueStats.completed))}`,
      `Failed: ${escapeMarkdown(String(queueStats.failed))}`,
      `Max Size: ${escapeMarkdown(String(queueStats.maxSize))}`,
      '',
      '*Downloads:*',
      `Active: ${escapeMarkdown(String(downloaderService.activeCount))}`,
      '',
      '*Memory:*',
      `RSS: ${escapeMarkdown(formatBytes(memory.rss))}`,
      `Heap: ${escapeMarkdown(formatBytes(memory.heapUsed))}/${escapeMarkdown(formatBytes(memory.heapTotal))}`,
      '',
      '*Uptime:*',
      formatUptime(START_TIME),
    ].join('\n')

    await ctx.reply(stats, { parse_mode: 'MarkdownV2' })
    log.info({ userId: ctx.from?.id }, 'Executed /stats')
  })

  bot.command('uptime', adminOnly, async (ctx) => {
    const uptime = formatUptime(START_TIME)
    await ctx.reply(
      `⏱️ *Uptime:* ${escapeMarkdown(uptime)}`,
      { parse_mode: 'MarkdownV2' },
    )
  })

  bot.command('memory', adminOnly, async (ctx) => {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()

    const msg = [
      '*💾 System Resources*',
      '',
      '*Memory:*',
      `RSS: ${escapeMarkdown(formatBytes(memory.rss))}`,
      `Heap Used: ${escapeMarkdown(formatBytes(memory.heapUsed))}`,
      `Heap Total: ${escapeMarkdown(formatBytes(memory.heapTotal))}`,
      `External: ${escapeMarkdown(formatBytes(memory.external))}`,
      '',
      '*CPU:*',
      `User: ${escapeMarkdown(String(Math.round(cpu.user / 1000)))}ms`,
      `System: ${escapeMarkdown(String(Math.round(cpu.system / 1000)))}ms`,
    ].join('\n')

    await ctx.reply(msg, { parse_mode: 'MarkdownV2' })
  })

  bot.command('active', adminOnly, async (ctx) => {
    const activeDownloads = downloaderService.getActiveDownloads()

    if (activeDownloads.length === 0) {
      await ctx.reply(
        '📭 *No active downloads*',
        { parse_mode: 'MarkdownV2' },
      )
      return
    }

    const downloadList = activeDownloads
      .map((id) => `• ${escapeMarkdown(id)}`)
      .join('\n')

    await ctx.reply(
      `*🔄 Active Downloads:*\n\n${downloadList}`,
      { parse_mode: 'MarkdownV2' },
    )
  })

  bot.command('broadcast', adminOnly, async (ctx) => {
    const text = ctx.match
    if (!text || text.trim().length === 0) {
      await ctx.reply(
        'Usage: /broadcast <message>',
      )
      return
    }
    await ctx.reply(
      '📢 *Broadcast*\n\nThis feature requires a database of user IDs\\. For now, use the message manually\\.',
      { parse_mode: 'MarkdownV2' },
    )
  })

  bot.command('maintenance', adminOnly, async (ctx) => {
    const isPaused = queueService.isPaused()

    if (isPaused) {
      queueService.start()
      await ctx.reply('✅ *Maintenance mode disabled*\n\nQueue processing has resumed\\.', {
        parse_mode: 'MarkdownV2',
      })
      log.info('Maintenance mode disabled')
    } else {
      queueService.pause()
      await ctx.reply('🔧 *Maintenance mode enabled*\n\nNew downloads will be queued but not processed\\.', {
        parse_mode: 'MarkdownV2',
      })
      log.info('Maintenance mode enabled')
    }
  })

  bot.callbackQuery(CALLBACK_ACTIONS.ADMIN_STATS, adminOnly, async (ctx) => {
    const queueStats = queueService.getStats()
    const memory = process.memoryUsage()

    const stats = [
      `*📊 Stats*\n`,
      `Queue: ${queueStats.pending}/${queueStats.maxSize}`,
      `Done: ${queueStats.completed}`,
      `Failed: ${queueStats.failed}`,
      `Memory: ${formatBytes(memory.heapUsed)}`,
    ].join('\n')

    await ctx.editMessageText(stats, { parse_mode: 'MarkdownV2' })
    await ctx.answerCallbackQuery()
  })
}

export { registerAdminCommands }
