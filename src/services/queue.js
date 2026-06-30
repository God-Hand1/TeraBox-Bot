import PQueue from 'p-queue'
import { getConfig } from '../config/index.js'
import { getLogger } from '../logger/index.js'

class QueueError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'QueueError'
    this.code = code
    this.details = details
  }
}

class QueueService {
  constructor() {
    const config = getConfig()
    this._queue = new PQueue({
      concurrency: config.queueConcurrency,
      autoStart: true,
      throwOnTimeout: true,
    })
    this._maxSize = config.queueMaxSize
    this._pending = new Map()
    this._completed = 0
    this._failed = 0
    this._totalAdded = 0
  }

  get size() {
    return this._queue.size
  }

  get pending() {
    return this._queue.pending
  }

  get totalAdded() {
    return this._totalAdded
  }

  get completedCount() {
    return this._completed
  }

  get failedCount() {
    return this._failed
  }

  get isFull() {
    return this._pending.size >= this._maxSize
  }

  getStats() {
    return {
      size: this.size,
      pending: this.pending,
      completed: this._completed,
      failed: this._failed,
      totalAdded: this._totalAdded,
      maxSize: this._maxSize,
      concurrency: this._queue.concurrency,
      isFull: this.isFull,
    }
  }

  add(taskId, taskFn, priority = 0) {
    const log = getLogger()

    if (this._pending.has(taskId)) {
      throw new QueueError(
        `Task ${taskId} is already queued`,
        'DUPLICATE_TASK',
      )
    }

    if (this.isFull) {
      throw new QueueError(
        'Queue is full. Please wait for current tasks to complete.',
        'QUEUE_FULL',
      )
    }

    this._totalAdded++

    const wrappedTask = async () => {
      log.debug({ taskId }, 'Queue task started')
      try {
        const result = await taskFn()
        this._completed++
        this._pending.delete(taskId)
        log.debug({ taskId }, 'Queue task completed')
        return result
      } catch (error) {
        this._failed++
        this._pending.delete(taskId)
        log.error({ taskId, error: error.message }, 'Queue task failed')
        throw error
      }
    }

    this._pending.set(taskId, wrappedTask)

    const priorityOptions = {}
    if (priority !== 0) {
      priorityOptions.priority = priority
    }

    return this._queue.add(wrappedTask, priorityOptions)
  }

  cancel(taskId) {
    this._pending.delete(taskId)
  }

  clear() {
    this._queue.clear()
    this._pending.clear()
  }

  async onIdle() {
    return this._queue.onIdle()
  }

  pause() {
    this._queue.pause()
  }

  start() {
    this._queue.start()
  }

  isPaused() {
    return this._queue.isPaused
  }
}

export { QueueService, QueueError }
