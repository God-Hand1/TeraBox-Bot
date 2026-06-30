import { extname } from 'node:path'

const INVALID_CHARS = /[<>:"/\\|?*\x00-\x1f]/g
const DANGEROUS_PATTERNS = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i
const MAX_FILENAME_LENGTH = 200
const TRAVERSAL_GLOBAL = /\.\.(\/|\\)/g

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return `download_${Date.now()}`
  }

  let sanitized = filename.trim()

  sanitized = sanitized.replace(TRAVERSAL_GLOBAL, '')

  sanitized = sanitized.replace(/^\.\.+/g, '')

  sanitized = sanitized.replace(INVALID_CHARS, '_')

  sanitized = sanitized.replace(/\s+/g, '_')

  sanitized = sanitized.replace(/_{2,}/g, '_')

  sanitized = sanitized.replace(/^[._]+/, '')

  if (DANGEROUS_PATTERNS.test(sanitized)) {
    sanitized = `file_${sanitized}`
  }

  if (sanitized.length === 0) {
    return `download_${Date.now()}`
  }

  const ext = extname(sanitized)
  const nameWithoutExt = sanitized.slice(0, -ext.length)

  if (nameWithoutExt.length > MAX_FILENAME_LENGTH) {
    sanitized = nameWithoutExt.slice(0, MAX_FILENAME_LENGTH) + ext
  }

  return sanitized
}

export { sanitizeFilename }
