import { getLogger } from '../logger/index.js'
import { MESSAGES } from '../constants/index.js'
import { TeraBoxError } from '../services/terabox.js'
import { DownloadError } from '../services/downloader.js'
import { UploadError } from '../services/uploader.js'
import { QueueError } from '../services/queue.js'

const ERROR_MESSAGE_MAP = [
  {
    check: (err) => err instanceof TeraBoxError && err.code === 'INVALID_SHARE_ID',
    message: '❌ *Invalid Link*\n\nCould not extract file information from the provided link\\.',
  },
  {
    check: (err) => err instanceof TeraBoxError && err.code === 'EMPTY_LINK',
    message: '❌ *No Files Found*\n\nThe shared link appears to have no files\\.',
  },
  {
    check: (err) => err instanceof TeraBoxError && err.code === 'API_FAILURE',
    message: '❌ *Extraction Failed*\n\nCould not retrieve file information from TeraBox\\. The service may be temporarily unavailable\\.',
  },
  {
    check: (err) => err instanceof DownloadError && err.code === 'FILE_TOO_LARGE',
    message: '❌ *File Too Large*\n\nThe file exceeds the maximum allowed size of 2GB\\.',
  },
  {
    check: (err) => err instanceof DownloadError && err.code === 'CANCELLED',
    message: '🚫 *Download Cancelled*\n\nThe download was cancelled\\.',
  },
  {
    check: (err) => err instanceof DownloadError && err.code === 'HTTP_ERROR',
    message: '❌ *Download Failed*\n\nThe TeraBox server returned an error\\. Please try again later\\.',
  },
  {
    check: (err) => err instanceof DownloadError,
    message: '❌ *Download Failed*\n\nAn error occurred while downloading\\. Please try again\\.',
  },
  {
    check: (err) => err instanceof UploadError,
    message: '❌ *Upload Failed*\n\nAn error occurred while uploading to Telegram\\. Please try again\\.',
  },
  {
    check: (err) => err instanceof QueueError && err.code === 'QUEUE_FULL',
    message: MESSAGES.queueFull,
  },
  {
    check: (err) => err instanceof QueueError && err.code === 'DUPLICATE_TASK',
    message: '❌ *Already Queued*\n\nThis file is already in the download queue\\.',
  },
  {
    check: (err) => err.name === 'GrammyError' && err.description?.includes('Too Many Requests'),
    message: '⚠️ *Telegram Rate Limit*\n\nPlease wait a moment \\.\\.\\.',
  },
  {
    check: (err) => err.name === 'GrammyError' && err.description?.includes('bot was blocked'),
    message: null,
  },
  {
    check: (err) => err.name === 'GrammyError' && err.description?.includes('chat not found'),
    message: null,
  },
]

function errorHandlerMiddleware() {
  return async (ctx, next) => {
    try {
      await next()
    } catch (error) {
      const log = getLogger()
      log.error(
        {
          error: error.message,
          code: error.code,
          name: error.name,
          userId: ctx.from?.id,
          updateId: ctx.update.update_id,
        },
        'Unhandled error in middleware',
      )

      for (const mapping of ERROR_MESSAGE_MAP) {
        if (mapping.check(error)) {
          if (mapping.message) {
            try {
              await ctx.reply(mapping.message, { parse_mode: 'MarkdownV2' })
            } catch {
            }
          }
          return
        }
      }

      try {
        await ctx.reply(
          '❌ *An unexpected error occurred*\n\nPlease try again later\\.',
          { parse_mode: 'MarkdownV2' },
        )
      } catch {
      }
    }
  }
}

export { errorHandlerMiddleware }
