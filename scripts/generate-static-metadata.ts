/**
 * Generates sitemap, robots, Markdown pages and llms.txt from the content tree.
 * Metadata comes from the MDX frontmatter itself, so there is no manifest to
 * keep in sync.
 */

import fs from 'node:fs'

import { readContentIndex } from '../lib/mdx-content.ts'
import { generateMarkdownExports } from '../lib/markdown-export.ts'
import config from '../site.config.ts'

const { pages, home } = readContentIndex()
const origin = `https://${config.domain}`
const escapeXml = (value: string) =>
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
generateMarkdownExports({
  pages,
  origin,
  name: config.name,
  description: config.description
})
console.log(`Generated static metadata and Markdown for ${urls.length} pages`)
