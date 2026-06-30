import pino from 'pino'
import { getConfig } from '../config/index.js'

let loggerInstance = null

function buildLogger() {
  const config = getConfig()
  const isProduction = process.env.NODE_ENV === 'production'

  const transport = isProduction
    ? undefined
    : {
        target: 'pino/file',
        options: { destination: 1 },
      }

  return pino({
    level: config.logLevel,
    transport,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'botToken'],
      censor: '[REDACTED]',
    },
    serializers: {
      error: pino.stdSerializers.err,
      err: pino.stdSerializers.err,
    },
    ...(isProduction
      ? {}
      : {
          formatters: {
            level(label) {
              return { level: label.toUpperCase() }
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
        }),
  })
}

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = buildLogger()
  }
  return loggerInstance
}

export { getLogger }
