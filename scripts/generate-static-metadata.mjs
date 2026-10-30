/**
 * Generates `public/sitemap.xml` and `public/robots.txt` from the content tree.
 * Metadata comes from the MDX frontmatter itself, so there is no manifest to
 * keep in sync.
 */

import fs from 'node:fs'

import { readContentIndex } from '../lib/mdx-content.mjs'
import config from '../site.config.js'

const { pages, home } = readContentIndex()
const origin = `https://${config.domain}`
const escapeXml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
const urls = pages.map((page) =>
  escapeXml(`${origin}${page === home ? '/' : `/${page.slug}`}`)
)

fs.writeFileSync(
  'public/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n') +
    '\n</urlset>\n'
)
fs.writeFileSync(
  'public/robots.txt',
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`
)
console.log(`Generated static sitemap for ${urls.length} pages`)
