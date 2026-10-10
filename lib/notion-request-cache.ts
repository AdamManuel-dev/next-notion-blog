// Coordinate upstream requests and preserve readable pages during rate limits.
export function isTemporaryNotionError(error: any): boolean {
  const status = error?.response?.status || error?.statusCode || error?.status
  return (
    status === 429 ||
    status === 408 ||
    status >= 500 ||
    (!status && error?.name === 'FetchError')
  )
}

export class NotionRateLimitError extends Error {
  statusCode = 429
  constructor() {
    super('Notion is temporarily rate limiting requests')
  }
}

export class NotionRequestCache<T> {
  private pages = new Map<string, { value: T; updated: number }>()
  private pending = new Map<string, Promise<T>>()
  private queue: Promise<unknown> = Promise.resolve()
  private nextRequest = 0
  private cooldown = 0

  private now: () => number
  private sleep: (ms: number) => Promise<void>
  private interval: number
  private freshFor: number
  private staleFor: number

  constructor(
    now = Date.now,
    sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
    interval = 750,
    freshFor = 5 * 60000,
    staleFor = 24 * 60 * 60000
  ) {
    this.now = now
    this.sleep = sleep
    this.interval = interval
    this.freshFor = freshFor
    this.staleFor = staleFor
  }

  request<Result>(load: () => Promise<Result>): Promise<Result> {
    const result = this.queue.then(async () => {
      if (this.now() < this.cooldown) throw new NotionRateLimitError()
      const delay = this.nextRequest - this.now()
      if (delay > 0) await this.sleep(delay)
      try {
        return await load()
      } catch (error) {
        if ((error.response?.status || error.statusCode) === 429) {
          const header = error.response?.headers?.get('retry-after')
          const seconds = Number(header)
          const suggested =
            header && Number.isFinite(seconds)
              ? seconds * 1000
              : Date.parse(header) - this.now()
          this.cooldown = this.now() + Math.max(60000, suggested || 0)
        }
        throw error
      } finally {
        this.nextRequest = this.now() + this.interval
      }
    })
    this.queue = result.catch(() => {})
    return result
  }

  get(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.pages.get(key)
    if (cached && this.now() - cached.updated < this.freshFor) {
      return Promise.resolve(cached.value)
    }
    const pending = this.pending.get(key)
    if (pending) return pending
    const promise = Promise.resolve()
      .then(load)
      .then(
        (value) => {
          this.pages.delete(key)
          this.pages.set(key, { value, updated: this.now() })
          if (this.pages.size > 100)
            this.pages.delete(this.pages.keys().next().value)
          return value
        },
        (error) => {
          if (
            cached &&
            isTemporaryNotionError(error) &&
            this.now() - cached.updated < this.staleFor
          ) {
            return cached.value
          }
          if (!isTemporaryNotionError(error)) this.pages.delete(key)
          throw error
        }
      )
      .finally(() => this.pending.delete(key))
    this.pending.set(key, promise)
    return promise
  }
}
