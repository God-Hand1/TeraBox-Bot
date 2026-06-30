import { MESSAGES } from '../constants/index.js'
import { formatUptime, escapeMarkdown } from '../utils/format.js'
import { getLogger } from '../logger/index.js'

const START_TIME = Date.now()

function registerCommands(bot) {
  const log = getLogger()

  bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot and get welcome message' },
    { command: 'help', description: 'Get detailed usage instructions' },
    { command: 'ping', description: 'Check if the bot is responsive' },
    { command: 'about', description: 'Learn more about this bot' },
  ]).catch((err) => {
    log.warn({ error: err.message }, 'Failed to set bot commands')
  })

  bot.command('start', async (ctx) => {
    const botUsername = ctx.me?.username || 'TeraBox Bot'
    await ctx.reply(MESSAGES.welcome(botUsername), {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📖 Help', callback_data: 'help' }],
        ],
      },
    })
    log.info({ userId: ctx.from?.id, username: ctx.from?.username }, 'Executed /start')
  })

  bot.command('help', async (ctx) => {
    await ctx.reply(MESSAGES.help, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    })
    log.info({ userId: ctx.from?.id }, 'Executed /help')
  })

  bot.command('ping', async (ctx) => {
    const start = Date.now()
    const msg = await ctx.reply('🏓 *Pinging\\.\\.\\.*', {
      parse_mode: 'MarkdownV2',
    })
    const latency = Date.now() - start
    await ctx.api.editMessageText(
      ctx.chat.id,
      msg.message_id,
      `✅ *Pong\\!*\n\n📡 *Latency:* ${escapeMarkdown(String(latency))}ms\n⏱️ *Uptime:* ${escapeMarkdown(formatUptime(START_TIME))}`,
      { parse_mode: 'MarkdownV2' },
    )
    log.info({ userId: ctx.from?.id, latency }, 'Executed /ping')
  })

  bot.command('about', async (ctx) => {
    await ctx.reply(MESSAGES.about(formatUptime(START_TIME)), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    })
    log.info({ userId: ctx.from?.id }, 'Executed /about')
  })
}

export { registerCommands, START_TIME }
