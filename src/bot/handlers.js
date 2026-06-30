import { getLogger } from '../logger/index.js'
import { isValidShareUrl } from '../utils/validation.js'
import { formatBytes, escapeMarkdown } from '../utils/format.js'
import { MESSAGES, CALLBACK_ACTIONS } from '../constants/index.js'
import { getConfig } from '../config/index.js'
import { DownloadError } from '../services/downloader.js'

const SESSION_TTL_MS = 300_000

class DownloadSession {
  constructor(url, fileInfo) {
    this.url = url
    this.fileInfo = fileInfo
    this.status = 'pending'
    this.messageId = null
    this.createdAt = Date.now()
    this.timeout = setTimeout(() => {
      if (this.status === 'pending') {
        this.status = 'expired'
      }
    }, SESSION_TTL_MS)
  }

  destroy() {
    clearTimeout(this.timeout)
  }
}

function registerHandlers(bot, teraboxService, downloaderService, uploaderService, queueService) {
  const log = getLogger()
  const sessions = new Map()

  function getSessionKey(ctx) {
    return `${ctx.from?.id}:${ctx.chat?.id}`
  }

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim()
    const validation = isValidShareUrl(text)

    if (!validation.valid) {
      const reason = validation.reason
      if (reason === 'invalidUrl') {
        if (text.startsWith('/')) return
        await ctx.reply(MESSAGES.invalidUrl, { parse_mode: 'MarkdownV2' })
      } else if (reason === 'unsupportedDomain') {
        await ctx.reply(MESSAGES.unsupportedDomain, { parse_mode: 'MarkdownV2' })
      } else if (reason === 'privateLink') {
        await ctx.reply(MESSAGES.privateLink, { parse_mode: 'MarkdownV2' })
      } else if (reason === 'emptyMessage') {
        await ctx.reply(MESSAGES.emptyMessage, { parse_mode: 'MarkdownV2' })
      }
      return
    }

    if (queueService.isFull) {
      await ctx.reply(MESSAGES.queueFull, { parse_mode: 'MarkdownV2' })
      return
    }

    if (queueService.isPaused()) {
      await ctx.reply(MESSAGES.maintenanceMode, { parse_mode: 'MarkdownV2' })
      return
    }

    const extractingMsg = await ctx.reply(MESSAGES.extracting, { parse_mode: 'MarkdownV2' })

    try {
      const result = await teraboxService.extract(text)
      const files = result.files

      if (files.length === 0) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          extractingMsg.message_id,
          '❌ *No files found in the shared link*',
          { parse_mode: 'MarkdownV2' },
        )
        return
      }

      const file = files[0]
      const fileSize = formatBytes(file.size)

      if (file.size > 0) {
        const config = getConfig()
        if (file.size > config.maxFileSize) {
          await ctx.api.editMessageText(
            ctx.chat.id,
            extractingMsg.message_id,
            MESSAGES.fileTooLarge,
            { parse_mode: 'MarkdownV2' },
          )
          return
        }
      }

      if (!file.downloadUrl) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          extractingMsg.message_id,
          '❌ *No download link available*\n\nTeraBox did not provide a direct download URL for this file\\.',
          { parse_mode: 'MarkdownV2' },
        )
        return
      }

      const fileInfo = `📄 *File Information*

*Name:* ${escapeMarkdown(file.filename)}
*Size:* ${escapeMarkdown(fileSize)}
*Type:* ${escapeMarkdown(file.extension.toUpperCase() || 'Unknown')}`

      const sessionKey = getSessionKey(ctx)
      const existing = sessions.get(sessionKey)
      if (existing) existing.destroy()
      const session = new DownloadSession(text, file)
      sessions.set(sessionKey, session)

      const confirmKeyboard = {
        inline_keyboard: [
          [
            { text: '⬇️ Download', callback_data: CALLBACK_ACTIONS.CONFIRM_DOWNLOAD },
            { text: '❌ Cancel', callback_data: CALLBACK_ACTIONS.CANCEL_DOWNLOAD },
          ],
        ],
      }

      const sentMsg = await ctx.api.editMessageText(
        ctx.chat.id,
        extractingMsg.message_id,
        fileInfo,
        {
          parse_mode: 'MarkdownV2',
          reply_markup: confirmKeyboard,
        },
      )

      session.messageId = sentMsg.message_id
    } catch (error) {
      log.error({ error: error.message, url: text.slice(0, 50) }, 'Extraction failed')

      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          extractingMsg.message_id,
          `❌ *Extraction Failed*\n\n${escapeMarkdown(error.message)}`,
          { parse_mode: 'MarkdownV2' },
        )
      } catch {
      }
    }
  })

  bot.callbackQuery(CALLBACK_ACTIONS.CONFIRM_DOWNLOAD, async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    const session = sessions.get(sessionKey)

    if (!session || session.status !== 'pending') {
      await ctx.answerCallbackQuery({ text: 'Session expired or already processed' })
      return
    }

    session.status = 'downloading'
    const file = session.fileInfo

    await ctx.editMessageText(
      MESSAGES.downloadStarted,
      { parse_mode: 'MarkdownV2' },
    )
    await ctx.answerCallbackQuery()

    const downloadId = `${ctx.from?.id}_${Date.now()}`
    const controller = downloaderService.createController(downloadId)

    try {
      await queueService.add(
        downloadId,
        async () => {
          const progressMsg = await ctx.api.sendMessage(
            ctx.chat.id,
            '⬇️ *Starting stream\\.\\.\\.*',
            { parse_mode: 'MarkdownV2' },
          )

          const { stream, contentLength } = await downloaderService.downloadWithRetry(
            file.downloadUrl,
            file.filename,
            (percentage, speed, downloaded, total) => {
              const speedStr = formatBytes(speed)
              const sizeStr = formatBytes(downloaded)
              const progressText = total > 0
                ? `⬇️ *Transferring\\.\\.\\.* ${percentage}%\n${sizeStr} @ ${speedStr}/s`
                : `⬇️ *Transferring\\.\\.\\.* ${sizeStr} @ ${speedStr}/s`
              ctx.api.editMessageText(
                ctx.chat.id,
                progressMsg.message_id,
                progressText,
                { parse_mode: 'MarkdownV2' },
              ).catch(() => {})
            },
            controller.signal,
          )

          const effectiveSize = contentLength || file.size

          await uploaderService.uploadStream(
            ctx,
            stream,
            file.filename,
            formatBytes(effectiveSize),
          )

          await ctx.api.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            '✅ *Transfer complete\\!*',
            { parse_mode: 'MarkdownV2' },
          )

          session.status = 'completed'
          return { success: true }
        },
      )
    } catch (error) {
      session.status = 'failed'
      log.error({ error: error.message, downloadId }, 'Stream transfer failed')

      let userMessage
      if (error instanceof DownloadError && error.code === 'CANCELLED') {
        userMessage = '🚫 *Transfer cancelled*'
      } else {
        userMessage = `❌ *Transfer failed*\n\n${escapeMarkdown(error.message)}`
      }

      try {
        await ctx.reply(userMessage, {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Retry', callback_data: CALLBACK_ACTIONS.RETRY_DOWNLOAD }],
            ],
          },
        })
      } catch {
      }
    } finally {
      downloaderService.releaseController(downloadId)
      const s = sessions.get(sessionKey)
      if (s) s.destroy()
      sessions.delete(sessionKey)
    }
  })

  bot.callbackQuery(CALLBACK_ACTIONS.CANCEL_DOWNLOAD, async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    const session = sessions.get(sessionKey)

    if (session) {
      session.status = 'cancelled'
      session.destroy()
      sessions.delete(sessionKey)
    }

    await ctx.editMessageText(
      MESSAGES.cancelled,
      { parse_mode: 'MarkdownV2' },
    )
    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery(CALLBACK_ACTIONS.RETRY_DOWNLOAD, async (ctx) => {
    await ctx.editMessageText(
      '🔄 *Please send the link again to retry*',
      { parse_mode: 'MarkdownV2' },
    )
    await ctx.answerCallbackQuery()
  })

  bot.callbackQuery('help', async (ctx) => {
    await ctx.editMessageText(MESSAGES.help, {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    })
    await ctx.answerCallbackQuery()
  })

  bot.on('callback_query:data', async (ctx) => {
    await ctx.answerCallbackQuery()
  })
}

export { registerHandlers }
