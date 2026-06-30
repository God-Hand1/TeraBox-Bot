import { extname } from 'node:path'
import { InputFile } from 'grammy'
import { getLogger } from '../logger/index.js'
import {
  VIDEO_EXTENSIONS,
  AUDIO_EXTENSIONS,
  PHOTO_EXTENSIONS,
  MAX_CAPTION_LENGTH,
} from '../constants/index.js'
import { escapeMarkdown, truncateText } from '../utils/format.js'

function determineFileType(filename) {
  const ext = extname(filename).toLowerCase()
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (PHOTO_EXTENSIONS.has(ext)) return 'photo'
  return 'document'
}

function buildCaption(filename, fileSize) {
  const parts = [
    `📄 *${escapeMarkdown(filename)}*`,
    fileSize ? `📦 Size: ${escapeMarkdown(fileSize)}` : '',
  ].filter(Boolean)

  const caption = parts.join('\n')
  return truncateText(caption, MAX_CAPTION_LENGTH)
}

class UploadError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'UploadError'
    this.code = code
    this.details = details
  }
}

class UploaderService {
  constructor() {
    this._activeUploads = new Set()
  }

  get activeCount() {
    return this._activeUploads.size
  }

  async uploadStream(ctx, stream, filename, fileSize) {
    const log = getLogger()
    log.info({ filename }, 'Starting stream upload to Telegram')

    const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this._activeUploads.add(uploadId)

    const fileType = determineFileType(filename)
    const caption = buildCaption(filename, fileSize)
    const inputFile = new InputFile(stream, filename)

    try {
      switch (fileType) {
        case 'video': {
          await ctx.replyWithVideo(inputFile, {
            caption,
            parse_mode: 'MarkdownV2',
            supports_streaming: true,
          })
          break
        }
        case 'audio': {
          await ctx.replyWithAudio(inputFile, {
            caption,
            parse_mode: 'MarkdownV2',
          })
          break
        }
        case 'photo': {
          await ctx.replyWithPhoto(inputFile, {
            caption,
            parse_mode: 'MarkdownV2',
          })
          break
        }
        default: {
          await ctx.replyWithDocument(inputFile, {
            caption,
            parse_mode: 'MarkdownV2',
          })
          break
        }
      }
    } catch (error) {
      if (stream.destroyed === false) {
        stream.destroy()
      }
      throw new UploadError(
        `Telegram upload failed: ${error.message}`,
        'UPLOAD_FAILED',
        { fileType, filename },
      )
    } finally {
      this._activeUploads.delete(uploadId)
    }

    log.info({ filename, fileType }, 'Stream upload completed successfully')
  }
}

export { UploaderService, UploadError }
