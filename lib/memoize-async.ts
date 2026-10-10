// Cache successful requests and share in-flight work without caching failures.
export function memoizeAsync<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  ttl: number
) {
  const cache = new Map<string, { expires: number; promise: Promise<Result> }>()
  return (...args: Args): Promise<Result> => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    if (cached && cached.expires > Date.now()) return cached.promise

    const entry = { expires: Infinity, promise: null as Promise<Result> }
    entry.promise = Promise.resolve()
      .then(() => fn(...args))
      .then(
        (value) => {
          entry.expires = Date.now() + ttl
          return value
        },
        (error) => {
          cache.delete(key)
          throw error
        }
      )
    cache.set(key, entry)
    // Expired keys need not stay in memory for the lifetime of the server.
    for (const [oldKey, oldEntry] of cache) {
      if (oldEntry.expires <= Date.now()) cache.delete(oldKey)
    }
    return entry.promise
  }
}
