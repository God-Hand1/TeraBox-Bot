import { BYTE_UNITS } from '../constants/index.js'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unknown'
  }
  if (bytes === 0) {
    return '0 B'
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  )
  const value = bytes / 1024 ** unitIndex
  const formatted = unitIndex === 0 ? value.toString() : value.toFixed(2)
  return `${formatted} ${BYTE_UNITS[unitIndex]}`
}

function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}`
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0s'
  }
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours % 24 > 0) parts.push(`${hours % 24}h`)
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`)
  if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`)

  return parts.join(' ')
}

function formatUptime(startTime) {
  return formatDuration(Date.now() - startTime)
}

function escapeMarkdown(text) {
  if (typeof text !== 'string') {
    return ''
  }
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || ''
  }
  return text.slice(0, maxLength - 3) + '...'
}

export { formatBytes, formatSpeed, formatDuration, formatUptime, escapeMarkdown, truncateText }
