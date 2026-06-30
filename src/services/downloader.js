import { Transform } from 'node:stream'
import { request } from 'undici'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logger/index.js'
import { MAX_RETRIES, RETRY_DELAY_MS } from '../constants/index.js'

class DownloadError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'DownloadError'
    this.code = code
    this.details = details
  }
}

class DownloadController {
  constructor() {
    this._abortController = new AbortController()
  }

  get signal() {
    return this._abortController.signal
  }

  cancel() {
    this._abortController.abort()
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class ProgressTransform extends Transform {
  constructor(totalSize, onProgress) {
    super({
      highWaterMark: 65536,
      autoDestroy: true,
    })
    this.bytesRead = 0
    this.totalSize = totalSize
    this.onProgress = onProgress
    this.lastUpdate = Date.now()
    this.lastBytes = 0
  }

  _transform(chunk, encoding, callback) {
    this.bytesRead += chunk.length
    const now = Date.now()
    if (now - this.lastUpdate >= 2000) {
      this._report(now)
      this.lastUpdate = now
      this.lastBytes = this.bytesRead
    }
    this.push(chunk)
    callback()
  }

  _flush(callback) {
    this._report(Date.now())
    callback()
  }

  _report(now) {
    if (!this.onProgress) return
    const elapsed = (now - this.lastUpdate) / 1000
    const bytesDelta = this.bytesRead - this.lastBytes
    const speed = elapsed > 0 ? Math.round(bytesDelta / elapsed) : 0
    const percentage =
      this.totalSize > 0
        ? Math.round((this.bytesRead / this.totalSize) * 100)
        : 0
    this.onProgress(percentage, speed, this.bytesRead, this.totalSize)
  }
}

class DownloaderService {
  constructor() {
    this._activeDownloads = new Map()
  }

  get activeCount() {
    return this._activeDownloads.size
  }

  getActiveDownloads() {
    return Array.from(this._activeDownloads.keys())
  }

  createController(downloadId) {
    const controller = new DownloadController()
    this._activeDownloads.set(downloadId, controller)
    return controller
  }

  cancelDownload(downloadId) {
    const controller = this._activeDownloads.get(downloadId)
    if (controller) {
      controller.cancel()
      this._activeDownloads.delete(downloadId)
      return true
    }
    return false
  }

  releaseController(downloadId) {
    this._activeDownloads.delete(downloadId)
  }

  async createDownloadStream(url, filename, signal, onProgress) {
    const log = getLogger()
    const config = getConfig()

    log.info({ filename }, 'Creating download stream')

    const response = await request(url, {
      method: 'GET',
      headers: {
        'User-Agent': config.teraboxUserAgent,
        Referer: 'https://www.terabox.com/',
        Accept: '*/*',
      },
      signal,
      headersTimeout: config.downloadTimeout,
      bodyTimeout: config.downloadTimeout,
      maxRedirections: 5,
    })

    if (response.statusCode !== 200 && response.statusCode !== 206) {
      response.body.destroy()
      throw new DownloadError(
        `Download server returned HTTP ${response.statusCode}`,
        'HTTP_ERROR',
        response.statusCode,
      )
    }

    const contentLength = response.headers['content-length']
      ? Number(response.headers['content-length'])
      : null

    if (contentLength !== null && contentLength > config.maxFileSize) {
      response.body.destroy()
      throw new DownloadError(
        `File exceeds maximum allowed size`,
        'FILE_TOO_LARGE',
        { totalSize: contentLength, maxSize: config.maxFileSize },
      )
    }

    const progressStream = new ProgressTransform(contentLength, onProgress)

    response.body.on('error', (err) => {
      if (!progressStream.destroyed) {
        progressStream.destroy(err)
      }
    })

    progressStream.on('error', () => {
      if (!response.body.destroyed) {
        response.body.destroy()
      }
    })

    response.body.pipe(progressStream)

    return { stream: progressStream, contentLength }
  }

  async downloadWithRetry(url, filename, onProgress, signal) {
    let lastError = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (signal?.aborted) {
          throw new DownloadError('Download cancelled by user', 'CANCELLED')
        }
        return await this.createDownloadStream(url, filename, signal, onProgress)
      } catch (error) {
        lastError = error

        if (
          error.code === 'CANCELLED' ||
          error.code === 'FILE_TOO_LARGE'
        ) {
          throw error
        }

        const log = getLogger()
        log.warn(
          { attempt, maxRetries: MAX_RETRIES, error: error.message },
          'Download attempt failed, retrying',
        )

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt)
        }
      }
    }

    throw lastError
  }
}

export { DownloaderService, DownloadError, DownloadController }
