import { TERABOX_DOMAINS, SHARE_PATH_PATTERNS } from '../constants/index.js'

const URL_REGEX = /^https?:\/\/[^\s/$.?#][^\s]*$/i

function isValidShareUrl(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'emptyMessage' }
  }

  const trimmed = text.trim()

  if (trimmed.length === 0) {
    return { valid: false, reason: 'emptyMessage' }
  }

  if (!URL_REGEX.test(trimmed)) {
    return { valid: false, reason: 'invalidUrl' }
  }

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return { valid: false, reason: 'invalidUrl' }
  }

  const hostname = url.hostname.toLowerCase()

  const isTeraboxDomain = TERABOX_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith('.' + domain),
  )

  if (!isTeraboxDomain) {
    return { valid: false, reason: 'unsupportedDomain' }
  }

  const pathname = url.pathname

  const hasSharePath = SHARE_PATH_PATTERNS.some((pattern) =>
    pathname.startsWith(pattern) || pathname.includes(pattern),
  )

  if (!hasSharePath) {
    return { valid: false, reason: 'privateLink' }
  }

  return { valid: true }
}

function extractShareId(url) {
  try {
    const parsed = new URL(url)
    const params = parsed.searchParams
    if (params.has('s')) {
      return params.get('s')
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const sIndex = pathParts.indexOf('s')
    if (sIndex !== -1 && sIndex + 1 < pathParts.length) {
      return pathParts[sIndex + 1]
    }
    const linkIndex = pathParts.indexOf('link')
    if (linkIndex !== -1 && linkIndex + 1 < pathParts.length) {
      return pathParts[linkIndex + 1]
    }
    const shareIndex = pathParts.indexOf('share')
    if (shareIndex !== -1 && shareIndex + 1 < pathParts.length) {
      return pathParts[shareIndex + 1]
    }
    return null
  } catch {
    return null
  }
}

export { isValidShareUrl, extractShareId }
