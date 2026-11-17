import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { load } from 'cheerio'
import { readContentIndex, renderMdx } from '../lib/mdx-content.ts'
import siteConfig from '../site.config.ts'

export interface LinkDocument {
  html: string
  source: string
}

export interface CollectedLink {
  url: string
  sources: string[]
  invalid?: string
  reason?: string
}

type LinkOutcome = 'ok' | 'warning' | 'dead'
export interface LinkResult extends CollectedLink {
  outcome: LinkOutcome
  reason: string
  attempts: number
  status?: number
  finalUrl?: string
}

export interface AuditResponse {
  status: number
  headers: Pick<Headers, 'get'>
  body?: { cancel(): Promise<unknown> } | null
}

export interface CheckOptions {
  fetch?: (url: string, options: RequestInit) => Promise<AuditResponse>
  sleep?: (ms: number) => Promise<unknown>
  timeoutMs?: number
  maxRedirects?: number
  retries?: number
}

const siteUrl = `https://${siteConfig.domain}`
const redirects = new Set([301, 302, 303, 307, 308])
const blocked = new Set([403, 406, 418, 429])

function isShareAction(url: URL) {
  const host = url.hostname.replace(/^www\./, '')
  return (
    (['twitter.com', 'x.com'].includes(host) &&
      url.pathname === '/intent/tweet') ||
    (host === 'linkedin.com' &&
      url.pathname.replace(/\/$/, '') === '/sharing/share-offsite') ||
    (host === 'facebook.com' && url.pathname === '/sharer/sharer.php')
  )
}

/** Extract rendered navigation links, not code examples, assets or metadata. */
export function collectLinks(
  documents: LinkDocument[],
  { baseUrl = siteUrl } = {}
) {
  const links = new Map<string, CollectedLink>()
  const skipped = new Map<string, CollectedLink>()
  for (const { html, source } of documents) {
    const $ = load(html)
    $('a[href], area[href]').each((_, element) => {
      const href = ($(element).attr('href') ?? '').trim()
      let url: URL | undefined
      let reason
      try {
        if (/\s/.test(href) || /%(?![\da-f]{2})/i.test(href))
          throw new Error('Invalid URL characters')
        url = new URL(href, baseUrl)
        if (url.pathname.split('/').some((part) => /^null$/i.test(part)))
          reason = 'Malformed /null URL'
        else if (/^https?:/i.test(href) && !/^https?:\/\//i.test(href))
          reason = 'Malformed HTTP URL'
      } catch {
        reason = 'Malformed URL'
      }
      const record = (
        map: Map<string, CollectedLink>,
        key: string,
        extra: Pick<CollectedLink, 'invalid' | 'reason'>
      ) => {
        const entry = map.get(key) ?? { url: key, sources: [], ...extra }
        map.set(key, entry)
        if (!entry.sources.includes(source)) entry.sources.push(source)
      }
      if (reason || !url) {
        record(links, href, { invalid: reason ?? 'Malformed URL' })
        return
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        if (href)
          record(skipped, href, { reason: 'Non-HTTP action or fragment' })
        return
      }
      if (url.origin === new URL(baseUrl).origin) return
      if (isShareAction(url)) {
        record(skipped, url.href, { reason: 'Share action endpoint' })
        return
      }
      url.hash = ''
      record(links, url.href, {})
    })
  }
  return { links: [...links.values()], skipped: [...skipped.values()] }
}

/** Compile current sources; optionally include an existing export's shared UI. */
export async function collectDocuments({
  root = process.cwd(),
  outDir
}: { root?: string; outDir?: string } = {}) {
  const documents: LinkDocument[] = []
  for (const page of readContentIndex({ root }).pages) {
    const { html } = await renderMdx(page.file, {}, page.id)
    documents.push({ source: path.relative(root, page.file), html })
  }
  if (outDir) {
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await fs.readdir(directory, {
        withFileTypes: true
      })) {
        const file = path.join(directory, entry.name)
        if (entry.isDirectory()) await walk(file)
        else if (entry.isFile() && entry.name.endsWith('.html'))
          documents.push({
            source: path.relative(root, file),
            html: await fs.readFile(file, 'utf8')
          })
      }
    }
    await walk(path.resolve(root, outDir))
  }
  return documents
}

// Hexagonal boundary: inject HTTP and waiting so audit policy stays deterministic.
export async function checkLink(
  link: CollectedLink,
  {
    fetch: request = globalThis.fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeoutMs = 10000,
    maxRedirects = 5,
    retries = 2
  }: CheckOptions = {}
): Promise<LinkResult> {
  if (link.invalid)
    return { ...link, outcome: 'dead', reason: link.invalid, attempts: 0 }
  let result: Pick<LinkResult, 'outcome' | 'reason'>
  for (let attempt = 0; attempt <= retries; attempt++) {
    let current = link.url
    let status
    try {
      for (let hop = 0; ; hop++) {
        const controller = new AbortController()
        let timer: ReturnType<typeof setTimeout> | undefined
        let response: AuditResponse
        try {
          response = await Promise.race([
            request(current, {
              method: 'GET',
              redirect: 'manual',
              signal: controller.signal,
              headers: {
                'user-agent': 'BlogLinkAudit/1.0',
                accept: 'text/html,*/*'
              }
            }),
            new Promise<never>((_resolve, reject) => {
              timer = setTimeout(() => {
                controller.abort()
                reject(new Error('Request timed out'))
              }, timeoutMs)
            })
          ])
          status = response.status
          // We only inspect headers; do not download arbitrarily large bodies.
          await response.body?.cancel()
        } finally {
          clearTimeout(timer)
        }
        if (redirects.has(status)) {
          const location = response.headers.get('location')
          if (!location) throw new Error('Redirect without Location')
          if (hop >= maxRedirects) throw new Error('Redirect limit reached')
          const target = new URL(location, current)
          if (!['http:', 'https:'].includes(target.protocol))
            throw new Error('Non-HTTP redirect')
          if (target.pathname.split('/').some((part) => /^null$/i.test(part))) {
            result = {
              outcome: 'dead',
              reason: 'Redirect to malformed /null URL'
            }
            current = target.href
            break
          }
          current = target.href
          continue
        }
        if ([404, 410].includes(status))
          result = { outcome: 'dead', reason: `HTTP ${status}` }
        else if (status >= 200 && status < 300) {
          const original = new URL(link.url)
          const final = new URL(current)
          const homepage = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/?)?$/i
          result =
            current !== link.url &&
            !homepage.test(original.pathname) &&
            homepage.test(final.pathname)
              ? { outcome: 'warning', reason: 'Article redirected to homepage' }
              : { outcome: 'ok', reason: `HTTP ${status}` }
        } else
          result = {
            outcome: 'warning',
            reason: `${
              blocked.has(status) ? 'Blocked' : 'Unconfirmed'
            } HTTP ${status}`
          }
        break
      }
    } catch {
      // Do not print raw network errors: they can contain local proxy details.
      result = {
        outcome: 'warning',
        reason: 'Network, timeout or redirect failure'
      }
    }
    const checked: LinkResult = {
      ...link,
      ...result,
      status,
      finalUrl: current,
      attempts: attempt + 1
    }
    if (checked.outcome !== 'warning' || attempt === retries) return checked
    await sleep(250 * 2 ** attempt)
  }
  throw new Error('Retries must be a nonnegative integer')
}

export async function auditLinks(
  links: CollectedLink[],
  { concurrency = 6, ...options }: CheckOptions & { concurrency?: number } = {}
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32)
    throw new Error('Concurrency must be an integer from 1 to 32')
  const results = new Array<LinkResult>(links.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, links.length) }, async () => {
      while (next < links.length) {
        const index = next++
        results[index] = await checkLink(links[index], options)
      }
    })
  )
  const summary = { ok: 0, warning: 0, dead: 0 }
  for (const result of results) summary[result.outcome]++
  return { summary, results }
}

async function main() {
  let jsonFile
  let outDir
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]
    if (!['--json', '--html-dir'].includes(flag) || !args[index + 1])
      throw new Error(
        'Usage: check-external-links.ts [--json FILE] [--html-dir DIR]'
      )
    if (flag === '--json') jsonFile = args[++index]
    else outDir = args[++index]
  }
  const documents = await collectDocuments({ outDir })
  const { links, skipped } = collectLinks(documents)
  const report = { ...(await auditLinks(links)), skipped }
  if (jsonFile)
    await fs.writeFile(jsonFile, `${JSON.stringify(report, null, 2)}\n`)
  const { ok, warning, dead } = report.summary
  console.log(
    `External links: ${ok} OK, ${warning} warnings, ${dead} dead; ${skipped.length} excluded.`
  )
  for (const result of report.results.filter((item) => item.outcome === 'dead'))
    console.log(
      `${result.reason}: ${result.url} (${result.sources.join(', ')})`
    )
  if (dead) process.exitCode = 1
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch(() => {
    console.error(
      'Link audit could not complete; check arguments and source compilation.'
    )
    process.exitCode = 2
  })
}
