/** Pin readable fragment names while preserving the old IDs outside editable MDX. */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import prettier from 'prettier'
import { remarkBlockDirectives } from './remark-legacy-block-ids.mjs'
import remarkHeadingIds from '../../lib/remark-heading-ids.mjs'
import { createFragmentSlugger } from '../../lib/fragment-slugs.mjs'
import { readContentIndex } from '../../lib/mdx-content.mjs'

const parser = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})
const legacyId = (id) =>
  /^[0-9a-f]{32}$/.test(id) || /^local-heading-\d+$/.test(id)

function textOf(node) {
  if (!node || node.type === 'headingId' || node.type === 'code') return ''
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(textOf).join(' ')
}

function readableText(node) {
  return textOf(node)
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/https?:\/\/(?:www\.)?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Return source edits selected by the Markdown AST, never by global ID replacement. */
export function migrateFragmentSlugs(source, existingAliases = {}) {
  const header =
    source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] ?? ''
  const body = source.slice(header.length)
  const tree = parser.parse(body)
  const records = []
  function visit(parent, context = '') {
    const children = parent.children ?? []
    let heading = context
    for (let index = 0; index < children.length; index++) {
      const node = children[index]
      if (node.type === 'heading') heading = readableText(node)
      const marker =
        ['heading', 'paragraph'].includes(node.type) &&
        node.children.at(-1)?.type === 'headingId'
          ? node.children.at(-1)
          : null
      const directive =
        node.type === 'leafDirective' || node.type === 'containerDirective'
      const id = marker?.id ?? (directive ? node.attributes?.id : null)
      if (id) {
        let start
        if (marker) {
          start = marker.position.start.offset + 2
        } else {
          const opening = body
            .slice(node.position.start.offset, node.position.end.offset)
            .split(/\r?\n/, 1)[0]
          const offset = opening.indexOf(`{#${id}}`)
          if (offset === -1)
            throw new Error(`Unsupported directive ID spelling: ${id}`)
          start = node.position.start.offset + offset + 2
        }
        let label = readableText(node)
        if (directive && node.name === 'callout')
          label = heading ? `${heading} callout` : `${label} callout`
        if (directive && node.name === 'anchor') {
          let next = children
            .slice(index + 1)
            .find((child) => child.type !== 'leafDirective')
          if (next?.type === 'blockquote' && next.children.length === 1)
            next = next.children[0]
          if (next?.type === 'code') {
            const previous = children[index - 1]
            label = `${
              previous?.type === 'paragraph'
                ? readableText(previous)
                : heading || 'example'
            } code`
          } else if (next?.type === 'heading') {
            label = `${readableText(next)} start`
          } else if (
            next?.type === 'containerDirective' &&
            next.name === 'callout'
          ) {
            label = `${heading || readableText(next)} callout start`
          } else if (next?.type === 'thematicBreak') {
            label = `${heading || 'section'} divider`
          } else {
            label = `${readableText(next) || heading || 'section'} start`
          }
        }
        records.push({
          id,
          start,
          end: start + id.length,
          label: label || heading || 'section',
          type: node.type
        })
      }
      visit(node, heading)
    }
  }
  visit(tree)
  const oldIds = new Set()
  for (const record of records) {
    if (oldIds.has(record.id))
      throw new Error(`Duplicate fragment ID: ${record.id}`)
    oldIds.add(record.id)
  }
  const reserved = records
    .filter((record) => !legacyId(record.id))
    .map((record) => record.id)
  for (const ids of Object.values(existingAliases)) reserved.push(...ids)
  const allocate = createFragmentSlugger(reserved)
  // Headings receive the shortest names before nearby compatibility targets.
  const prioritized = [...records].sort(
    (a, b) =>
      Number(b.type === 'heading') - Number(a.type === 'heading') ||
      a.start - b.start
  )
  const replacements = new Map()
  const aliases = structuredClone(existingAliases)
  for (const record of prioritized) {
    if (!legacyId(record.id)) continue
    const canonical = allocate(record.label)
    replacements.set(record.id, canonical)
    aliases[canonical] = [
      ...new Set([...(aliases[canonical] ?? []), record.id])
    ]
  }
  let output = body
  for (const record of [...records].sort((a, b) => b.start - a.start)) {
    const replacement = replacements.get(record.id)
    if (replacement)
      output =
        output.slice(0, record.start) + replacement + output.slice(record.end)
  }
  return { source: header + output, aliases, replacements }
}

/** Rewrite authored internal Markdown links, leaving code and external URLs alone. */
export function migrateFragmentLinks(source, page, routes, migrations) {
  const header =
    source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)?.[0] ?? ''
  const body = source.slice(header.length)
  const edits = []
  function visit(node) {
    if (node.type === 'link' || node.type === 'definition') {
      const url = node.url
      if (
        url &&
        (url.startsWith('#') || (url.startsWith('/') && !url.startsWith('//')))
      ) {
        const parsed = new URL(url, `https://content.invalid/${page.slug}`)
        const target = url.startsWith('#')
          ? page
          : routes.get(parsed.pathname.replace(/^\/|\/$/g, ''))
        const canonical =
          target &&
          migrations
            .get(target.id)
            ?.replacements.get(decodeURIComponent(parsed.hash.slice(1)))
        if (canonical) {
          const raw = body.slice(
            node.position.start.offset,
            node.position.end.offset
          )
          const labelEnd = node.children?.at(-1)?.position.end.offset
          const destinationStart =
            node.type === 'definition'
              ? raw.indexOf(']:') + 2
              : (labelEnd ?? node.position.start.offset + 1) -
                node.position.start.offset
          const offset = raw.indexOf(url, destinationStart)
          if (offset < 0)
            throw new Error(`Cannot locate internal fragment URL: ${url}`)
          const start = node.position.start.offset + offset
          edits.push({
            start,
            end: start + url.length,
            value: url.slice(0, url.indexOf('#') + 1) + canonical
          })
        }
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(parser.parse(body))
  let output = body
  for (const edit of edits.sort((a, b) => b.start - a.start))
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.end)
  return header + output
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const write = process.argv.includes('--write')
  const index = readContentIndex()
  const file = path.join(index.contentDir, 'fragment-aliases.json')
  const mapping = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, 'utf8'))
    : { version: 1, pages: {} }
  if (mapping.version !== 1 || !mapping.pages)
    throw new Error('Invalid fragment alias map')
  const migrations = new Map()
  for (const page of index.pages) {
    migrations.set(
      page.id,
      migrateFragmentSlugs(
        fs.readFileSync(page.file, 'utf8'),
        mapping.pages[page.id]
      )
    )
  }
  let files = 0
  let fragments = 0
  for (const page of index.pages) {
    const result = migrations.get(page.id)
    const source = migrateFragmentLinks(
      result.source,
      page,
      index.aliases,
      migrations
    )
    if (Object.keys(result.aliases).length)
      mapping.pages[page.id] = result.aliases
    if (source !== fs.readFileSync(page.file, 'utf8')) {
      files++
      if (write) fs.writeFileSync(page.file, source)
    }
    fragments += result.replacements.size
  }
  if (write) {
    fs.writeFileSync(
      file,
      prettier.format(JSON.stringify(mapping), { parser: 'json' })
    )
  }
  console.log(
    `${
      write ? 'Migrated' : 'Would migrate'
    } ${fragments} fragments across ${files} files; legacy aliases retained in ${path.relative(
      process.cwd(),
      file
    )}`
  )
}
