import { request } from 'undici'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logger/index.js'
import { extractShareId } from '../utils/validation.js'

const API_BASE = 'https://www.terabox.com'
const SHORT_URL_INFO_PATH = '/api/shorturlinfo'
const LIST_PATH = '/share/list'

function buildHeaders() {
  const config = getConfig()
  return {
    'User-Agent': config.teraboxUserAgent,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.terabox.com/',
    Origin: 'https://www.terabox.com',
  }
}

function buildCookie() {
  const browserId = `browser_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  return `lang=en; browserid=${browserId}`
}

async function fetchShortUrlInfo(shortUrl) {
  const log = getLogger()
  const url = `${API_BASE}${SHORT_URL_INFO_PATH}?app_id=250528&web=1&channel=dubox&clienttype=0`
  const headers = buildHeaders()
  headers['Content-Type'] = 'application/x-www-form-urlencoded'
  headers.Cookie = buildCookie()
  headers['X-Requested-With'] = 'XMLHttpRequest'

  const body = new URLSearchParams({ shorturl: shortUrl }).toString()

  log.debug({ shortUrl }, 'Fetching short URL info from TeraBox API')

  const response = await request(url, {
    method: 'POST',
    headers,
    body,
    headersTimeout: 15000,
    bodyTimeout: 15000,
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `TeraBox API returned status ${response.statusCode} for short URL info`,
    )
  }

  const data = await response.body.json()

  if (data.errno !== 0 && data.errno !== undefined) {
    throw new Error(
      `TeraBox API error: ${data.errmsg || 'Unknown error'} (errno: ${data.errno})`,
    )
  }

  return data
}

async function fetchShareList(shortUrl, shareId, uk, sign, timestamp) {
  const log = getLogger()
  const url = `${API_BASE}${LIST_PATH}?app_id=250528&shorturl=${shortUrl}&root=1`
  const headers = buildHeaders()
  headers.Cookie = buildCookie()

  if (shareId && uk) {
    const params = new URLSearchParams({
      app_id: '250528',
      shorturl: shortUrl,
      root: '1',
      shareid: String(shareId),
      uk: String(uk),
      sign: sign || '',
      timestamp: String(timestamp || ''),
    })
    const fullUrl = `${API_BASE}${LIST_PATH}?${params.toString()}`
    log.debug({ fullUrl: fullUrl.replace(/sign=[^&]+/, 'sign=REDACTED') }, 'Fetching share list')

    const response = await request(fullUrl, {
      method: 'GET',
      headers,
      headersTimeout: 15000,
      bodyTimeout: 15000,
    })

    if (response.statusCode === 200) {
      const data = await response.body.json()
      if (data.errno === 0 && data.list) {
        return data
      }
    }
  }

  log.debug({ url }, 'Fetching share list with basic params')
  const response = await request(url, {
    method: 'GET',
    headers,
    headersTimeout: 15000,
    bodyTimeout: 15000,
  })

  if (response.statusCode !== 200) {
    throw new Error(
      `TeraBox list API returned status ${response.statusCode}`,
    )
  }

  const data = await response.body.json()
  return data
}

function extractFileInfo(item) {
  return {
    fsId: item.fs_id,
    filename: item.filename || item.server_filename || 'Unknown',
    size: item.size || 0,
    extension: item.filename
      ? item.filename.includes('.')
        ? item.filename.split('.').pop().toLowerCase()
        : ''
      : '',
    thumbnail: item.thumbs_url || item.icon || null,
    downloadUrl: item.dlink || item.download_link || null,
    category: item.category || null,
  }
}

class TeraBoxError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'TeraBoxError'
    this.code = code
    this.details = details
  }
}

class TeraBoxService {
  async extract(url) {
    const log = getLogger()
    log.info({ url: url.replace(/[?#&].*/, '...') }, 'Extracting TeraBox file info')

    const shortUrl = extractShareId(url)
    if (!shortUrl) {
      throw new TeraBoxError(
        'Could not extract share ID from URL',
        'INVALID_SHARE_ID',
      )
    }

    log.debug({ shortUrl }, 'Extracted share ID')

    let data
    try {
      data = await fetchShortUrlInfo(shortUrl)
    } catch (error) {
      log.warn({ error: error.message, shortUrl }, 'Short URL info API failed, trying list API')

      try {
        data = await fetchShareList(shortUrl)
      } catch (listError) {
        throw new TeraBoxError(
          `Failed to fetch TeraBox file information: ${listError.message}`,
          'API_FAILURE',
          { originalError: error.message, listError: listError.message },
        )
      }
    }

    const fileList = data.list || []

    if (fileList.length === 0) {
      throw new TeraBoxError(
        'No files found in the shared link',
        'EMPTY_LINK',
      )
    }

    const files = fileList.map(extractFileInfo)

    const hasDirectUrls = files.some((f) => f.downloadUrl)

    if (!hasDirectUrls && data.shareid && data.uk) {
      log.debug('No direct download URLs in initial response, fetching with share params')

      try {
        const listData = await fetchShareList(
          shortUrl,
          data.shareid,
          data.uk,
          data.sign,
          data.timestamp,
        )

        if (listData.list) {
          const updatedFiles = listData.list.map(extractFileInfo)
          if (updatedFiles.some((f) => f.downloadUrl)) {
            return { files: updatedFiles }
          }
        }
      } catch (error) {
        log.warn({ error: error.message }, 'Share list API fallback also failed')
      }
    }

    return { files }
  }
}

export { TeraBoxService, TeraBoxError }
