import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { createProcessor } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { readContentIndex } from '../lib/mdx-content.mjs'
import remarkHeadingIds from '../lib/remark-heading-ids.mjs'

const processor = createProcessor({
  remarkPlugins: [remarkGfm, remarkHeadingIds]
})

function contentTrees() {
  return readContentIndex().pages.map((entry) => {
    const source = fs.readFileSync(entry.file, 'utf8')
    const header = source.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)[0]
    return {
      file: path.relative(process.cwd(), entry.file),
      headerLines: header.split('\n').length - 1,
      tree: processor.parse(source.slice(header.length))
    }
  })
}

function visit(node, callback) {
  callback(node)
  for (const child of node.children ?? []) visit(child, callback)
}

function isJsx(node, name) {
  return (
    (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
    node.name === name
  )
}

function plainChildren(node) {
  return (node.children ?? [])
    .flatMap((child) =>
      child.type === 'paragraph' ? plainChildren(child) : [child]
    )
    .filter((child) => child.type !== 'text' || child.value.trim())
}

test('editable headings use Markdown when no HTML-only attributes are needed', () => {
  const remaining = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (!/^h[1-6]$/.test(node.name ?? '') || !isJsx(node, node.name)) return
      const representable = (node.attributes ?? []).every(
        (attribute) =>
          attribute.type === 'mdxJsxAttribute' &&
          attribute.name === 'id' &&
          typeof attribute.value === 'string'
      )
      if (representable)
        remaining.push(`${file}:${headerLines + node.position.start.line}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Use a Markdown heading with a trailing {#stable-id} when needed'
  )
})

test('heading IDs use trailing attributes instead of separate empty anchors', () => {
  const remaining = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (parent) => {
      const children = parent.children ?? []
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
          remaining.push(`${file}:${headerLines + heading.position.start.line}`)
      }
    })
  }
  assert.deepEqual(remaining, [], 'Put the stable ID on the heading as {#id}')
})

test('simple inline code and whole-code emphasis use Markdown syntax', () => {
  const remaining = []
  const oneLineText = (nodes) =>
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
        !only.attributes?.length
      if (
        oneLineText(children) ||
        (emphasis && oneLineText(plainChildren(only)))
      )
        remaining.push(`${file}:${headerLines + node.position.start.line}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Use backticks, optionally surrounded by Markdown emphasis'
  )
})

test('simple local figures use Markdown image syntax instead of HTML image wrappers', () => {
  const remaining = []
  for (const { file, headerLines, tree } of contentTrees()) {
    visit(tree, (node) => {
      if (!isJsx(node, 'figure') || node.attributes?.length) return
      const children = plainChildren(node)
      if (children.length !== 1 || !isJsx(children[0], 'img')) return
      const attributes = children[0].attributes ?? []
      const representable = attributes.every(
        (attribute) =>
          attribute.type === 'mdxJsxAttribute' &&
          ['src', 'alt', 'title', 'loading'].includes(attribute.name) &&
          typeof attribute.value === 'string' &&
          (attribute.name !== 'loading' || attribute.value === 'lazy')
      )
      if (representable)
        remaining.push(`${file}:${headerLines + node.position.start.line}`)
    })
  }
  assert.deepEqual(
    remaining,
    [],
    'Standalone Markdown images already render as lazy-loaded figures'
  )
})
