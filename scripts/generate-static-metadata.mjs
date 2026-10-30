import fs from 'node:fs'
import config from '../site.config.js'

const { rootId, pages } = JSON.parse(
  fs.readFileSync('content/manifest.json', 'utf8')
)
const origin = `https://${config.domain}`
const escapeXml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
const urls = pages.map(({ id, slug }) =>
  escapeXml(`${origin}${id === rootId ? '/' : `/${slug}`}`)
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
