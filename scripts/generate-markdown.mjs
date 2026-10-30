import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

export function pageToMarkdown(metadata, html) {
  const converter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*'
  })
  converter.use(gfm)
  // Markdown supports raw HTML. Keep complex structures rather than flattening
  // their content or losing native disclosure/table behavior.
  converter.keep(['details', 'summary', 'table', 'figcaption'])
  converter.addRule('blockAnchors', {
    filter: (node) => node.nodeName === 'SECTION' && !!node.getAttribute('id'),
    replacement: (content, node) => {
      const id = node.getAttribute('id').replace(/[&"<>]/g, '')
      return `\n\n<a id="${id}"></a>\n\n${content.trim()}\n\n`
    }
  })
  converter.addRule('safeCodeFences', {
    filter: (node) =>
      node.nodeName === 'PRE' && node.firstElementChild?.nodeName === 'CODE',
    replacement: (_content, node) => {
      const code = node.firstElementChild.textContent
      const runs = Array.from(
        code.matchAll(/`{3,}/g),
        (match) => match[0].length
      )
      const fence = '`'.repeat(Math.max(3, ...runs.map((length) => length + 1)))
      const language =
        node.firstElementChild.className.match(
          /(?:^|\s)language-([\w-]+)/
        )?.[1] || ''
      return `\n\n${fence}${language}\n${code}${
        code.endsWith('\n') ? '' : '\n'
      }${fence}\n\n`
    }
  })
  converter.addRule('cleanEmphasis', {
    filter: ['strong', 'b'],
    replacement: (content, node) => {
      const parent = node.parentNode.closest(
        'strong, b, h1, h2, h3, h4, h5, h6'
      )
      return parent ? content : `**${content}**`
    }
  })
  converter.addRule('orderedListStarts', {
    filter: 'li',
    replacement: (content, node) => {
      const parent = node.parentNode
      const siblings = Array.from(parent.children).filter(
        (child) => child.nodeName === 'LI'
      )
      const start = Number.parseInt(parent.getAttribute('start') || '1', 10)
      const marker =
        parent.nodeName === 'OL'
          ? `${(Number.isFinite(start) ? start : 1) + siblings.indexOf(node)}. `
          : '- '
      const body = content.replace(/^\n+|\n+$/g, '')
      const indent = ' '.repeat(marker.length)
      return `${marker}${body.replace(/\n/g, `\n${indent}`)}\n`
    }
  })
  const fields = {
    title: metadata.title,
    id: metadata.id,
    slug: metadata.slug,
    source_url: metadata.sourceUrl,
    extracted_at: metadata.extractedAt,
    description: metadata.description,
    tags: metadata.tags,
    status: metadata.status,
    source_file: metadata.sourceFile,
    cover: metadata.cover ?? null
  }
  // JSON-quoted scalars are valid YAML and safely preserve punctuation/newlines.
  const frontmatter = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n')
  const title = converter.turndown(`<h1>${escapeHtml(metadata.title)}</h1>`)
  return `---\n${frontmatter}\n---\n\n${title}\n\n${converter
    .turndown(html)
    .trim()}\n`
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function generateMarkdown(root = process.cwd()) {
  const directory = path.join(root, 'content')
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')
  )
  for (const entry of manifest.pages) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) {
      throw new Error(`Invalid content slug: ${entry.slug}`)
    }
    const filename = path.join(directory, 'pages', entry.slug)
    const metadata = JSON.parse(fs.readFileSync(`${filename}.json`, 'utf8'))
    const html = fs.readFileSync(`${filename}.html`, 'utf8')
    fs.writeFileSync(
      `${filename}.md`,
      pageToMarkdown({ ...metadata, ...entry }, html)
    )
  }
  return manifest.pages.length
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.log(`Generated Markdown for ${generateMarkdown()} pages`)
}
