import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '..', '.env')

if (existsSync(envPath)) {
  config({ path: envPath })
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function optionalEnv(name, defaultValue) {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    return defaultValue
  }
  return value.trim()
}

function parseInteger(value, name, min, max) {
  const num = Number.parseInt(value, 10)
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new Error(
      `Environment variable ${name} must be an integer between ${min} and ${max}, got: ${value}`,
    )
  }
  return num
}

const configCache = {}

function buildConfig() {
  const botToken = requireEnv('BOT_TOKEN')
  const adminId = optionalEnv('ADMIN_ID', null)

  const maxConcurrentDownloads = parseInteger(
    optionalEnv('MAX_CONCURRENT_DOWNLOADS', '2'),
    'MAX_CONCURRENT_DOWNLOADS',
    1,
    10,
  )

  const maxFileSize = parseInteger(
    optionalEnv('MAX_FILE_SIZE', '2097152000'),
    'MAX_FILE_SIZE',
    1048576,
    10737418240,
  )

  const downloadTimeout = parseInteger(
    optionalEnv('DOWNLOAD_TIMEOUT', '600000'),
    'DOWNLOAD_TIMEOUT',
    30000,
    3600000,
  )

  const queueConcurrency = parseInteger(
    optionalEnv('QUEUE_CONCURRENCY', '1'),
    'QUEUE_CONCURRENCY',
    1,
    5,
  )

  const queueMaxSize = parseInteger(
    optionalEnv('QUEUE_MAX_SIZE', '10'),
    'QUEUE_MAX_SIZE',
    1,
    50,
  )

  const downloadDirectory = optionalEnv('DOWNLOAD_DIRECTORY', '/tmp/terabox-downloads')

  const logLevel = optionalEnv('LOG_LEVEL', 'info')

  const port = parseInteger(
    optionalEnv('PORT', '7860'),
    'PORT',
    1024,
    65535,
  )

  const teraboxUserAgent = optionalEnv(
    'TERABOX_USER_AGENT',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )

  return Object.freeze({
    botToken,
    adminId,
    maxConcurrentDownloads,
    maxFileSize,
    downloadTimeout,
    queueConcurrency,
    queueMaxSize,
    downloadDirectory,
    logLevel,
    port,
    teraboxUserAgent,
  })
}

function getConfig() {
  if (!configCache.instance) {
    configCache.instance = buildConfig()
  }
  return configCache.instance
}

export { getConfig }
