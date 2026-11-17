import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'

import { remarkBlockDirectives } from './remark-block-ids.mjs'
import remarkHeadingIds from './remark-heading-ids.mjs'

const frontmatter = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/
const parser = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})
const printer = createProcessor({ remarkPlugins: [remarkGfm] }).use(
  remarkStringify,
  { fences: true, bullet: '-', emphasis: '*', rule: '-' }
)
const text = (value) => ({ type: 'text', value })
const paragraph = (children) => ({ type: 'paragraph', children })
const link = (label, url) => ({ type: 'link', url, children: [text(label)] })
const heading = (value, depth) => ({
  type: 'heading',
  depth,
  children: [text(value)]
})
const digest = (value) => createHash('sha256').update(value).digest('hex')
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const outputName = (page) =>
  page.type === 'home' ? 'index.md' : `${page.slug}.md`
const canonicalUrl = (page, origin) =>
  new URL(page.type === 'home' ? '/' : `/${page.slug}`, origin).href

function resolveUrl(value, canonical) {
  try {
    const url = new URL(value, canonical)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
      ? url.href
      : canonical
  } catch {
    return canonical
  }
}

function blocks(children) {
  const result = []
  let inline = []
  const flush = () => {
    if (inline.length) result.push(paragraph(inline))
    inline = []
  }
  for (const child of children) {
    if (
      [
        'text',
        'link',
        'image',
        'emphasis',
        'strong',
        'delete',
        'inlineCode',
        'break',
        'linkReference',
        'imageReference'
      ].includes(child.type)
    ) {
      inline.push(child)
    } else {
      flush()
      result.push(child)
    }
  }
  flush()
  return result
}

function phrasing(children) {
  return children.flatMap((child) =>
    ['paragraph', 'heading', 'blockquote'].includes(child.type)
      ? phrasing(child.children)
      : [child]
  )
}

/** Parse only: imports, expressions and JSX attribute expressions never execute. */
export function renderMarkdownPage({ source, page, origin }) {
  const canonical = canonicalUrl(page, origin)
  const tree = parser.parse(source.replace(frontmatter, ''))
  const transform = (node) => {
    if (
      [
        'mdxjsEsm',
        'mdxFlowExpression',
        'mdxTextExpression',
        'headingId'
      ].includes(node.type)
    )
      return []
    if (
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement'
    ) {
      const flow = node.type === 'mdxJsxFlowElement'
      const name = node.name || ''
      if (['script', 'style'].includes(name.toLowerCase())) return []
      const attribute = (key) =>
        node.attributes.find(
          (attr) =>
            attr.type === 'mdxJsxAttribute' &&
            attr.name === key &&
            typeof attr.value === 'string'
        )?.value
      const children = (node.children || []).flatMap(transform)
      let result
      if (name === 'img') {
        result = [
          {
            type: 'image',
            url: resolveUrl(attribute('src') || '', canonical),
            alt: attribute('alt') || '',
            title: null
          }
        ]
      } else if (name === 'a' && attribute('href')) {
        result = [
          {
            type: 'link',
            url: resolveUrl(attribute('href'), canonical),
            children: phrasing(children)
          }
        ]
      } else if (/^h[1-6]$/.test(name)) {
        result = [
          {
            type: 'heading',
            depth: Number(name[1]),
            children: phrasing(children)
          }
        ]
      } else if (['strong', 'b', 'em', 'i', 'del'].includes(name)) {
        result = [
          {
            type: ['strong', 'b'].includes(name)
              ? 'strong'
              : name === 'del'
              ? 'delete'
              : 'emphasis',
            children: phrasing(children)
          }
        ]
      } else if (name === 'br') {
        result = [{ type: 'break' }]
      } else {
        result = children
        if (name && !/^[a-z][a-z0-9-]*$/.test(name)) {
          const fallback = link(
            `${name} component (view on canonical page)`,
            canonical
          )
          result = flow
            ? [...blocks(children), paragraph([fallback])]
            : [...phrasing(children), fallback]
        }
      }
      return flow ? blocks(result) : phrasing(result)
    }
    const children = node.children?.flatMap(transform)
    if (
      ['containerDirective', 'leafDirective', 'textDirective'].includes(
        node.type
      )
    ) {
      return node.type === 'textDirective'
        ? phrasing(children || [])
        : [{ type: 'blockquote', children: blocks(children || []) }]
    }
    const result = { ...node }
    // HTML-renderer metadata and source positions are not Markdown content.
    delete result.data
    delete result.position
    if (children) result.children = children
    if (['link', 'image', 'definition'].includes(node.type))
      result.url = resolveUrl(node.url, canonical)
    return [result]
  }
  const body = transform(tree)[0]
  body.children = [
    heading(page.title, 1),
    paragraph([text('Canonical URL: '), link(canonical, canonical)]),
    paragraph([text(page.description)]),
    ...body.children
  ]
  return printer.stringify(body)
}

/** Group order and slug ordering do not depend on filesystem or locale ordering. */
export function renderLlmsTxt({
  pages,
  origin,
  name = 'Site',
  description = ''
}) {
  const children = [heading(name, 1)]
  if (description)
    children.push({
      type: 'blockquote',
      children: [paragraph([text(description)])]
    })
  for (const [type, title] of [
    ['home', 'Home'],
    ['post', 'Posts'],
    ['note', 'Notes']
  ]) {
    const group = pages
      .filter((page) => page.type === type)
      .sort((a, b) => compare(a.slug, b.slug))
    if (!group.length) continue
    children.push(heading(title, 2), {
      type: 'list',
      ordered: false,
      spread: false,
      children: group.map((page) => ({
        type: 'listItem',
        spread: false,
        children: [
          paragraph([
            link(page.title, new URL(`/${outputName(page)}`, origin).href),
            text(`: ${page.description}`)
          ])
        ]
      }))
    })
  }
  return printer.stringify({ type: 'root', children })
}

const ownedName = (name) =>
  /^(?:index|[a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.test(name) || name === 'llms.txt'

function regularFile(file) {
  try {
    const stat = fs.lstatSync(file)
    if (!stat.isFile())
      throw new Error(`Refusing non-regular export file: ${file}`)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

/** Only unchanged, manifest-owned files may be replaced or removed. */
export function generateMarkdownExports({
  root = process.cwd(),
  pages,
  origin,
  name,
  description
}) {
  const site = new URL(origin)
  if (!['http:', 'https:'].includes(site.protocol))
    throw new Error('Export origin must be HTTP(S)')
  origin = site.origin
  const publicDir = path.join(root, 'public')
  const generatedDir = path.join(root, '.generated')
  for (const directory of [publicDir, generatedDir]) {
    if (fs.existsSync(directory) && !fs.lstatSync(directory).isDirectory())
      throw new Error(`Refusing non-directory: ${directory}`)
  }
  const manifestFile = path.join(generatedDir, 'markdown-export.json')
  let previous = {}
  if (regularFile(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    if (
      manifest.version !== 1 ||
      !manifest.files ||
      Array.isArray(manifest.files) ||
      typeof manifest.files !== 'object' ||
      Object.entries(manifest.files).some(
        ([file, hash]) =>
          !ownedName(file) ||
          typeof hash !== 'string' ||
          !/^[a-f0-9]{64}$/.test(hash)
      )
    ) {
      throw new Error('Invalid Markdown export ownership manifest')
    }
    previous = manifest.files
  }
  const outputs = new Map()
  for (const page of [...pages].sort((a, b) => compare(a.slug, b.slug))) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) ||
      !['home', 'post', 'note'].includes(page.type)
    )
      throw new Error(`Invalid export page: ${page.slug}`)
    const filename = outputName(page)
    if (outputs.has(filename))
      throw new Error(`Duplicate Markdown export: ${filename}`)
    outputs.set(
      filename,
      renderMarkdownPage({
        source: fs.readFileSync(page.file, 'utf8'),
        page,
        origin
      })
    )
  }
  outputs.set('llms.txt', renderLlmsTxt({ pages, origin, name, description }))
  // Preflight every destination before writing anything. Never adopt unrelated files.
  for (const filename of outputs.keys()) {
    const target = path.join(publicDir, filename)
    if (
      regularFile(target) &&
      (!Object.hasOwn(previous, filename) ||
        digest(fs.readFileSync(target)) !== previous[filename])
    ) {
      throw new Error(
        `Refusing to overwrite unowned or modified export: ${target}`
      )
    }
  }
  fs.mkdirSync(publicDir, { recursive: true })
  fs.mkdirSync(generatedDir, { recursive: true })
  for (const [filename, content] of outputs)
    fs.writeFileSync(path.join(publicDir, filename), content)
  for (const [filename, hash] of Object.entries(previous)) {
    if (outputs.has(filename)) continue
    const target = path.join(publicDir, filename)
    if (regularFile(target) && digest(fs.readFileSync(target)) === hash)
      fs.unlinkSync(target)
  }
  const files = Object.fromEntries(
    [...outputs].map(([filename, content]) => [filename, digest(content)])
  )
  fs.writeFileSync(
    manifestFile,
    `${JSON.stringify({ version: 1, files }, null, 2)}\n`
  )
  return { files: [...outputs.keys()], manifestFile }
}
