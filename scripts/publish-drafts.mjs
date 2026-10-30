import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Marked } from 'marked'
import { parse } from 'yaml'
import sanitizeHtml from 'sanitize-html'

export function renderDraft(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) throw new Error('Draft is missing YAML frontmatter')
  const metadata = parse(match[1])
  if (typeof metadata?.title !== 'string' || !metadata.title.trim()) {
    throw new Error('Draft must have a title')
  }
  const headings = new Map()
  const markdown = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }) {
        const body = this.parser.parseInline(tokens)
        const base =
          text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-') || 'section'
        const count = headings.get(base) || 0
        headings.set(base, count + 1)
        const id = count ? `${base}-${count}` : base
        return `<h${depth} id="${id}">${body}</h${depth}>\n`
      }
    }
  })
  const tokens = markdown.lexer(source.slice(match[0].length))
  // The reader renders the title itself; avoid a second H1 in the article body.
  const first = tokens.findIndex((token) => token.type !== 'space')
  if (tokens[first]?.type === 'heading' && tokens[first].depth === 1)
    tokens.splice(first, 1)
  const html = sanitizeHtml(markdown.parser(tokens), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'details',
      'summary'
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['id'],
      code: ['class'],
      img: ['src', 'alt', 'title', 'loading'],
      details: ['open'],
      ol: ['start']
    }
  })
  return { metadata, html: html.trim() + '\n' }
}

export function publishDrafts(root = process.cwd()) {
  const directory = path.join(root, 'blog-drafts')
  const manifestPath = path.join(root, 'content/manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const ranking = [
    ...fs
      .readFileSync(path.join(directory, 'README.md'), 'utf8')
      .matchAll(/^\|\s*\d+\s*\|\s*\[[^\]]+\]\(([^)]+\.md)\)/gm)
  ].map((match) => match[1])
  const filenames = fs
    .readdirSync(directory)
    .filter(
      (name) =>
        name.endsWith('.md') &&
        !['README.md', 'EDITORIAL-NOTES.md'].includes(name)
    )
    .sort((a, b) => {
      const rank = (name) =>
        ranking.includes(name) ? ranking.indexOf(name) : Infinity
      return rank(a) - rank(b) || a.localeCompare(b)
    })
  const existing = manifest.pages.filter(
    (entry) => entry.source !== 'blog-draft'
  )
  const slugs = new Set(existing.map((entry) => entry.slug))
  const ids = new Set(existing.map((entry) => entry.id))
  // Prepare and validate everything before changing the published collection.
  const articles = filenames.map((filename) => {
    const slug = path.basename(filename, '.md')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) {
      throw new Error(`Invalid or conflicting draft slug: ${slug}`)
    }
    const sourceFile = `blog-drafts/${filename}`
    const id = crypto
      .createHash('sha256')
      .update(sourceFile)
      .digest('hex')
      .slice(0, 32)
    if (ids.has(id)) throw new Error(`Conflicting draft ID: ${id}`)
    slugs.add(slug)
    ids.add(id)
    const { metadata, html } = renderDraft(
      fs.readFileSync(path.join(directory, filename), 'utf8')
    )
    const entry = { id, slug, title: metadata.title, source: 'blog-draft' }
    return {
      entry,
      html,
      metadata: {
        ...entry,
        description: metadata.description || '',
        tags: metadata.tags || [],
        status: 'published',
        sourceFile,
        sourceUrl: null,
        cover: null,
        warnings: []
      }
    }
  })
  const homepage = existing.find((entry) => entry.id === manifest.rootId)
  if (!homepage) throw new Error('Homepage is missing from the manifest')
  const homepagePath = path.join(root, 'content/pages', `${homepage.slug}.html`)
  const home = fs.readFileSync(homepagePath, 'utf8')
  const escape = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  const section =
    '<!-- published-drafts:start -->\n<section id="engineering-articles"><h2>Engineering articles</h2>\n<ul>\n' +
    articles
      .map(
        ({ entry }) =>
          `<li><a href="/${entry.slug}">${escape(entry.title)}</a></li>`
      )
      .join('\n') +
    '\n</ul></section>\n<!-- published-drafts:end -->\n'
  const updatedHome = home.includes('<!-- published-drafts:start -->')
    ? home.replace(
        /<!-- published-drafts:start -->[\s\S]*?<!-- published-drafts:end -->\n?/,
        section
      )
    : section + home
  for (const article of articles) {
    const filename = path.join(root, 'content/pages', article.entry.slug)
    fs.writeFileSync(`${filename}.html`, article.html)
    fs.writeFileSync(
      `${filename}.json`,
      JSON.stringify(article.metadata, null, 2) + '\n'
    )
  }
  manifest.pages = [...existing, ...articles.map(({ entry }) => entry)]
  fs.writeFileSync(homepagePath, updatedHome)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return articles.length
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.log(`Published ${publishDrafts()} draft articles`)
}
