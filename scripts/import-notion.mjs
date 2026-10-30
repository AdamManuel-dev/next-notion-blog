import { chromium } from 'playwright'
import fs from 'node:fs'
import { gzipSync } from 'node:zlib'
const TARGET_URL =
  process.env.TARGET_URL ||
  'https://adams-blog.notion.site/a044322d56d1482da8b521736d56284c'
const OUTPUT = process.env.OUTPUT || 'content/notion-source'
const idOf = (url) =>
  (
    url.match(
      /([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(?:[?#/]|$)/i
    )?.[1] || ''
  ).replaceAll('-', '')
;(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }
  })
  const page = await context.newPage()
  const queue = [TARGET_URL]
  const seen = new Set()
  const results = []
  const failures = []
  try {
    while (queue.length) {
      const url = queue.shift()
      const id = idOf(url)
      if (!id || seen.has(id)) continue
      seen.add(id)
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await page.locator('.notion-page-content').waitFor({ timeout: 45000 })
        await page.locator('.notion-page-block h1').waitFor({ timeout: 15000 })
        const blocks = new Map()
        const links = new Set()
        let previous = ''
        let stable = 0
        for (let step = 0; step < 500; step++) {
          // Expand collapsed toggle blocks while traversing the page.
          await page
            .locator(
              '.notion-toggle-block [role="button"][aria-expanded="false"]'
            )
            .evaluateAll((es) => es.forEach((e) => e.click()))
          const chunk = await page.evaluate(() => {
            const root = document.querySelector('.notion-page-content')
            const elements = [
              ...root.querySelectorAll('.notion-selectable[data-block-id]')
            ].filter(
              (e) =>
                !e.parentElement.closest('.notion-selectable[data-block-id]')
            )
            return {
              blocks: elements.map((e) => ({
                id: e.dataset.blockId,
                type: [...e.classList].find((c) => /^notion-.*-block$/.test(c)),
                html: e.outerHTML,
                text: e.innerText
              })),
              links: [...root.querySelectorAll('a[href]')].map((e) => e.href)
            }
          })
          for (const b of chunk.blocks) blocks.set(b.id, b)
          for (const l of chunk.links) links.add(l)
          const position = await page.evaluate(() => {
            const s = document.querySelector('.notion-scroller.vertical')
            s.scrollTop += 650
            return [s.scrollTop, s.scrollHeight, s.clientHeight].join(':')
          })
          stable = position === previous ? stable + 1 : 0
          previous = position
          if (stable >= 4) break
          await page.waitForTimeout(180)
          if (step === 499)
            throw Error('Scroll limit reached; page may be incomplete')
        }
        const meta = await page.evaluate(() => ({
          title:
            document.querySelector('.notion-page-block h1')?.innerText ||
            document.title,
          url: location.href,
          cover: document.querySelector('.notion-page-cover img')?.src || null
        }))
        const result = {
          id,
          ...meta,
          sourceUrl: url,
          extractedAt: new Date().toISOString(),
          blocks: [...blocks.values()],
          links: [...links]
        }
        fs.writeFileSync(
          `${OUTPUT}/${id}.json.gz`,
          gzipSync(JSON.stringify(result))
        )
        results.push({ id, title: meta.title, blocks: blocks.size })
        for (const link of links) {
          const u = new URL(link)
          if (
            u.hostname === new URL(TARGET_URL).hostname &&
            idOf(u.pathname) &&
            !seen.has(idOf(u.pathname))
          )
            queue.push(u.origin + u.pathname)
        }
        console.log(
          `Extracted ${meta.title}: ${blocks.size} blocks; ${queue.length} queued`
        )
      } catch (e) {
        failures.push({ id, url, error: e.message })
        console.log(`FAILED ${url}: ${e.message}`)
      }
    }
  } finally {
    fs.writeFileSync(
      `${OUTPUT}/crawl.json`,
      JSON.stringify(
        { root: idOf(TARGET_URL), pages: results, failures },
        null,
        2
      )
    )
    await browser.close()
  }
  console.log(JSON.stringify({ pages: results.length, failures }))
})()
