import type { Nodes } from 'mdast'
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { createProcessor } from '@mdx-js/mdx'
import { remarkBlockDirectives } from '../lib/remark-block-ids.ts'
import remarkGfm from 'remark-gfm'
import { readContentIndex } from '../lib/mdx-content.ts'
import remarkHeadingIds from '../lib/remark-heading-ids.ts'

const processor = createProcessor({
  remarkPlugins: [remarkGfm, remarkBlockDirectives, remarkHeadingIds]
})

function contentTrees() {
  return readContentIndex().pages.map((entry) => {
    const source = fs.readFileSync(entry.file, 'utf8')
    const match = source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)
    assert.ok(match)
    const header = match[0]
    return {
      file: path.relative(process.cwd(), entry.file),
      headerLines: header.split('\n').length - 1,
      tree: processor.parse(source.slice(header.length))
    }
  })
}

function visit(node: Nodes, callback: (node: Nodes) => void) {
  callback(node)
  for (const child of 'children' in node ? node.children : [])
    visit(child, callback)
}
function isJsx(
  node: Nodes,
  name: string | null | undefined
): node is MdxJsxFlowElement | MdxJsxTextElement {
  return (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    node.name === name
  )
}
function plainChildren(node: Nodes): Nodes[] {
  return ('children' in node ? node.children : [])
    .flatMap((child) =>
      child.type === 'paragraph' ? plainChildren(child) : [child]
    )
    .filter((child) => child.type !== 'text' || child.value.trim())
}
function line(node: Nodes) {
  assert.ok(node.position)
  return node.position.start.line
}

test('editable fragment identities use readable pinned slugs instead of migration IDs', () => {
  const remaining: string[] = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      const id =
        node.type === 'headingId'
          ? node.id
          : node.type === 'containerDirective' ||
            node.type === 'leafDirective' ||
            node.type === 'textDirective'
          ? node.attributes?.id
          : null
      if (
        id &&
        (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
          /^[0-9a-f]{32}$/.test(id) ||
          /^local-heading-\d+$/.test(id))
      ) {
        remaining.push(`${file}:${headerLines + line(node)}: ${id}`)
      }
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Keep legacy identities in fragment-aliases.json'
  )
})

test('editable headings use Markdown when no HTML-only attributes are needed', () => {
  const remaining: string[] = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (
        !('name' in node) ||
        !isJsx(node, node.name) ||
        !/^h[1-6]$/.test(node.name ?? '')
      )
        return
      const representable = (node.attributes ?? []).every(
        (attribute) =>
          attribute.type === 'mdxJsxAttribute' &&
          attribute.name === 'id' &&
          typeof attribute.value === 'string'
      )
      if (representable) remaining.push(`${file}:${headerLines + line(node)}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Use a Markdown heading with a trailing {#stable-id} when needed'
  )
})

test('heading IDs use trailing attributes instead of separate empty anchors', () => {
  const remaining: string[] = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (parent) => {
      const children = 'children' in parent ? parent.children : []
      for (let index = 1; index < children.length; index += 1) {
        const heading = children[index]
        if (
          heading.type !== 'heading' ||
          heading.children.at(-1)?.type === 'headingId'
        )
          continue
        const previous = children[index - 1]
        const candidates =
          previous.type === 'paragraph' ? plainChildren(previous) : [previous]
        if (candidates.length !== 1) continue
        const anchor = candidates[0]
        if (!isJsx(anchor, 'a') || plainChildren(anchor).length) continue
        const attributes = anchor.attributes ?? []
        if (
          attributes.length === 1 &&
          attributes[0].type === 'mdxJsxAttribute' &&
          attributes[0].name === 'id' &&
          typeof attributes[0].value === 'string'
        )
          remaining.push(`${file}:${headerLines + line(heading)}`)
      }
    })
  }
  assert.deepEqual(remaining, [], 'Put the stable ID on the heading as {#id}')
})

test('editable content avoids standalone anchors and uses Markdown callouts', () => {
  const remaining: string[] = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (node.type === 'leafDirective' && node.name === 'anchor') {
        remaining.push(`${file}:${headerLines + line(node)}`)
        return
      }
      if (!isJsx(node, 'a') && !isJsx(node, 'section')) return
      const attributes = node.attributes ?? []
      if (
        attributes.length !== 1 ||
        attributes[0].type !== 'mdxJsxAttribute' ||
        attributes[0].name !== 'id' ||
        typeof attributes[0].value !== 'string'
      )
        return
      if (node.name === 'a' && plainChildren(node).length) return
      remaining.push(`${file}:${headerLines + line(node)}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Generate targets on content blocks; use :::callout for callouts'
  )
})

test('simple inline code and whole-code emphasis use Markdown syntax', () => {
  const remaining: string[] = []
  const oneLineText = (nodes: Nodes[]) =>
    nodes.length === 1 &&
    nodes[0].type === 'text' &&
    !/[\r\n]/.test(nodes[0].value)
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (!isJsx(node, 'code') || node.attributes?.length) return
      const children = plainChildren(node)
      const only = children.length === 1 ? children[0] : null
      const emphasis =
        only &&
        (only.type === 'strong' ||
          only.type === 'emphasis' ||
          isJsx(only, 'strong') ||
          isJsx(only, 'em')) &&
        !('attributes' in only && only.attributes?.length)
      if (
        oneLineText(children) ||
        (emphasis && oneLineText(plainChildren(only)))
      )
        remaining.push(`${file}:${headerLines + line(node)}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Use backticks, optionally surrounded by Markdown emphasis'
  )
})

test('simple local figures use Markdown image syntax instead of HTML image wrappers', () => {
  const remaining: string[] = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (!isJsx(node, 'figure') || node.attributes?.length) return
      const children = plainChildren(node)
      if (children.length !== 1 || !isJsx(children[0], 'img')) return
      const attributes = children[0].attributes ?? []
      const representable = attributes.every(
        (attribute) =>
          attribute.type === 'mdxJsxAttribute' &&
          ['src', 'alt', 'title', 'loading'].some(
            (name) => attribute.name === name
          ) &&
          typeof attribute.value === 'string' &&
          (attribute.name !== 'loading' || attribute.value === 'lazy')
      )
      if (representable) remaining.push(`${file}:${headerLines + line(node)}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Standalone Markdown images already render as lazy-loaded figures'
  )
})
