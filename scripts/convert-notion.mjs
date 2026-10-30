import { chromium } from 'playwright'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { gunzipSync } from 'node:zlib'
const TARGET_URL = process.env.TARGET_URL || 'https://adams-blog.notion.site'
const ROOT = process.cwd()
const INPUT = process.env.INPUT || 'content/notion-source'
;(async () => {
  const browser = await chromium.launch({ headless: false })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const crawl = JSON.parse(fs.readFileSync(`${INPUT}/crawl.json`))
    const docs = crawl.pages.map(({ id }) =>
      JSON.parse(gunzipSync(fs.readFileSync(`${INPUT}/${id}.json.gz`)))
    )
    const slugs = new Set()
    for (const d of docs) {
      let slug = d.title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      if (slugs.has(slug)) slug += '-' + d.id
      slugs.add(slug)
      d.slug = slug
    }
    const routes = Object.fromEntries(
      docs.map((d) => [d.id, d.id === crawl.root ? '/' : '/' + d.slug])
    )
    fs.mkdirSync(`${ROOT}/content/pages`, { recursive: true })
    fs.mkdirSync(`${ROOT}/public/content-assets`, { recursive: true })
    const assets = {}
    const assetFailures = []
    for (const d of docs) {
      const urls = await page.evaluate(
        ({ blocks, base, cover }) => {
          const urls = new Set(cover ? [cover] : [])
          for (const b of blocks) {
            const doc = new DOMParser().parseFromString(b.html, 'text/html')
            for (const img of doc.querySelectorAll('.notion-image-block img')) {
              const src = img.getAttribute('src')
              if (src) urls.add(new URL(src, base).href)
            }
            for (const media of doc.querySelectorAll('video[src],source[src]'))
              urls.add(new URL(media.getAttribute('src'), base).href)
          }
          return [...urls]
        },
        { blocks: d.blocks, base: TARGET_URL, cover: d.cover }
      )
      for (const url of urls) {
        if (assets[url]) continue
        try {
          const response = await context.request.get(url, { timeout: 60000 })
          if (!response.ok()) throw Error(`HTTP ${response.status()}`)
          const type = response.headers()['content-type']?.split(';')[0]
          let ext = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'image/svg+xml': 'svg',
            'video/mp4': 'mp4'
          }[type]
          const body = await response.body()
          if (
            !ext &&
            body
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          )
            ext = 'png'
          if (!ext && body.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
            ext = 'jpg'
          if (!ext && body.subarray(0, 4).toString() === '%PDF') ext = 'pdf'
          if (!ext) throw Error(`Unsupported content-type ${type}`)
          const filename =
            crypto.createHash('sha256').update(url).digest('hex').slice(0, 20) +
            '.' +
            ext
          fs.writeFileSync(
            `${ROOT}/public/content-assets/${filename}`,
            await response.body()
          )
          assets[url] = '/content-assets/' + filename
        } catch (e) {
          assetFailures.push({ pageId: d.id, url, error: e.message })
          assets[url] = null
        }
      }
    }
    for (const d of docs) {
      const result = await page.evaluate(
        ({ blocks, routes, base, assets }) => {
          const esc = (s) =>
            String(s)
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('"', '&quot;')
          const safeUrl = (raw, image = false) => {
            try {
              const u = new URL(raw, base)
              if (!['https:', 'http:', 'mailto:', 'tel:'].includes(u.protocol))
                return ''
              if (image) return assets[u.href] || ''
              const m = u.pathname.match(
                /([a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})(?:\/|$)/i
              )
              const id = m?.[1].replaceAll('-', '')
              if (u.hostname === new URL(base).hostname && routes[id]) {
                const hash = u.hash.replaceAll('-', '')
                return routes[id] + hash
              }
              return u.href
            } catch {
              return ''
            }
          }
          function inline(node) {
            if (node.nodeType === 3) return esc(node.textContent)
            if (node.nodeType !== 1) return ''
            const tag = node.tagName.toLowerCase()
            if (['script', 'style', 'svg', 'button'].includes(tag)) return ''
            let text = [...node.childNodes].map(inline).join('')
            if (tag === 'br') return '<br>'
            if (tag === 'a') {
              const href = safeUrl(node.getAttribute('href'))
              return href ? `<a href="${esc(href)}">${text}</a>` : text
            }
            if (
              [
                'strong',
                'b',
                'em',
                'i',
                'code',
                's',
                'del',
                'sub',
                'sup'
              ].includes(tag)
            )
              return `<${tag}>${text}</${tag}>`
            if (
              node.style?.fontWeight === '600' ||
              node.style?.fontWeight === '700'
            )
              text = `<strong>${text}</strong>`
            if (node.style?.fontStyle === 'italic') text = `<em>${text}</em>`
            if (node.style?.fontFamily?.includes('monospace'))
              text = `<code>${text}</code>`
            return text
          }
          const warnings = []
          function render(e) {
            const type =
              [...e.classList].find((c) => /^notion-.*-block$/.test(c)) || ''
            const id = (e.getAttribute('data-block-id') || '').replaceAll(
              '-',
              ''
            )
            const own = (sel) =>
              [...e.querySelectorAll(sel)].filter(
                (n) => n.closest('.notion-selectable[data-block-id]') === e
              )
            const leaves = own('[data-content-editable-leaf]')
            const text = leaves.map(inline).join('<br>')
            const children = [
              ...e.querySelectorAll('.notion-selectable[data-block-id]')
            ].filter(
              (n) =>
                n.parentElement.closest('.notion-selectable[data-block-id]') ===
                e
            )
            const nested = () => children.map(render).join('\n')
            let html = ''
            if (type === 'notion-code-block')
              html =
                '<pre><code>' +
                esc(leaves.map((n) => n.textContent).join('\n')) +
                '</code></pre>'
            else if (type === 'notion-divider-block') html = '<hr>'
            else if (type === 'notion-table_of_contents-block') return ''
            else if (type === 'notion-header-block')
              html = `<h2>${text}</h2>${nested()}`
            else if (type === 'notion-sub_header-block')
              html = `<h3>${text}</h3>${nested()}`
            else if (type === 'notion-sub_sub_header-block')
              html = `<h4>${text}</h4>${nested()}`
            else if (
              type === 'notion-bulleted_list-block' ||
              type === 'notion-numbered_list-block'
            ) {
              const tag = type === 'notion-bulleted_list-block' ? 'ul' : 'ol'
              const marker = e
                .querySelector('.notion-list-item-box-left')
                ?.textContent.match(/\d+/)?.[0]
              html = `<${tag}${
                tag === 'ol' && marker ? ` start="${marker}"` : ''
              }><li>${text}${nested()}</li></${tag}>`
            } else if (type === 'notion-toggle-block')
              html = `<details open><summary>${text}</summary>${nested()}</details>`
            else if (
              type === 'notion-quote-block' ||
              type === 'notion-callout-block'
            )
              html = `<blockquote>${text}${nested()}</blockquote>`
            else if (type === 'notion-image-block') {
              html = [...e.querySelectorAll('img')]
                .map((img) => {
                  const src = safeUrl(img.getAttribute('src'), true)
                  return src
                    ? `<img src="${esc(src)}" alt="${esc(
                        img.alt || ''
                      )}" loading="lazy">`
                    : `<p>[Image unavailable in source]</p>`
                })
                .join('')
              html += text ? `<figcaption>${text}</figcaption>` : ''
              html = '<figure>' + html + '</figure>'
            } else if (type === 'notion-table-block') {
              const table = e.querySelector('table')
              html = table
                ? '<div class="table-scroll"><table>' +
                  [...table.rows]
                    .map(
                      (row) =>
                        '<tr>' +
                        [...row.cells]
                          .map((cell) => '<td>' + inline(cell) + '</td>')
                          .join('') +
                        '</tr>'
                    )
                    .join('') +
                  '</table></div>'
                : nested()
            } else if (type === 'notion-collection_view-block') {
              const headers = [
                ...e.querySelectorAll('.notion-table-view-header-cell')
              ]
              const rows = [...e.querySelectorAll('.notion-table-view-row')]
              html =
                '<div class="table-scroll"><table><thead><tr>' +
                headers
                  .map((cell) => '<th scope="col">' + inline(cell) + '</th>')
                  .join('') +
                '</tr></thead><tbody>' +
                rows
                  .map(
                    (row) =>
                      '<tr>' +
                      [...row.querySelectorAll('.notion-table-view-cell')]
                        .map((cell) => '<td>' + inline(cell) + '</td>')
                        .join('') +
                      '</tr>'
                  )
                  .join('') +
                '</tbody></table></div>'
              warnings.push({
                id,
                type,
                reason:
                  'Only browser-visible database rows are archived; standalone database navigation failed'
              })
            } else if (
              type === 'notion-column_list-block' ||
              type === 'notion-column-block'
            )
              html = nested()
            else if (
              [
                'notion-page-block',
                'notion-bookmark-block',
                'notion-video-block',
                'notion-pdf-block',
                'notion-external_object_instance-block'
              ].includes(type)
            ) {
              const links = [...e.querySelectorAll('a[href]')]
              html = links
                .map((a) => {
                  const href = safeUrl(a.getAttribute('href'))
                  return href
                    ? `<p><a href="${esc(href)}">${esc(
                        a.textContent.trim() || href
                      )}</a></p>`
                    : ''
                })
                .join('')
              if (!html) {
                const frame = e.querySelector('iframe')
                const href = frame && safeUrl(frame.getAttribute('src'))
                html = href
                  ? `<p><a href="${esc(href)}">View embedded media</a></p>`
                  : text
                  ? `<p>${text}</p>`
                  : ''
                if (!html)
                  warnings.push({
                    id,
                    type,
                    reason: 'No readable content or link in rendered block'
                  })
              }
              html += nested()
            } else {
              html = (text ? `<p>${text}</p>` : '') + nested()
              if (!text && !children.length && e.textContent.trim())
                warnings.push({ id, type, reason: 'No editable content leaf' })
            }
            if (
              !html &&
              type !== 'notion-text-block' &&
              type !== 'notion-table_of_contents-block'
            ) {
              const raw = e.textContent.trim()
              html = raw
                ? `<p class="content-fallback">${esc(raw)}</p>`
                : `<p><a href="${esc(
                    base + '/' + id
                  )}">View original embedded content on Notion</a></p>`
            }
            return html ? `<section id="${id}">${html}</section>` : ''
          }
          const html = blocks
            .map((b) => {
              const doc = new DOMParser().parseFromString(b.html, 'text/html')
              return render(doc.body.firstElementChild)
            })
            .join('\n')
          return { html, warnings }
        },
        { blocks: d.blocks, routes, base: TARGET_URL, assets }
      )
      const metadata = {
        id: d.id,
        slug: d.slug,
        title: d.title,
        sourceUrl: d.url,
        extractedAt: d.extractedAt,
        blockCount: d.blocks.length,
        cover: assets[d.cover] || null,
        warnings: result.warnings
      }
      fs.writeFileSync(
        `${ROOT}/content/pages/${d.slug}.html`,
        result.html + '\n'
      )
      fs.writeFileSync(
        `${ROOT}/content/pages/${d.slug}.json`,
        JSON.stringify(metadata, null, 2) + '\n'
      )
      console.log(`${d.slug}: ${result.warnings.length} conversion warnings`)
    }
    fs.writeFileSync(
      `${ROOT}/content/manifest.json`,
      JSON.stringify(
        {
          rootId: crawl.root,
          extractedAt: new Date().toISOString(),
          pages: docs.map((d) => ({ id: d.id, slug: d.slug, title: d.title })),
          failures: crawl.failures,
          assetFailures
        },
        null,
        2
      ) + '\n'
    )
    console.log(
      JSON.stringify({
        pages: docs.length,
        assets: Object.values(assets).filter(Boolean).length,
        assetFailures
      })
    )
  } finally {
    await browser.close()
  }
})()
