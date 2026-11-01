import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(filename)
    return /\.[jt]sx?$/.test(entry.name) ? [filename] : []
  })
}

function referencedClasses(modulePath) {
  const classes = new Set()
  for (const filename of ['components', 'pages', 'lib'].flatMap(sourceFiles)) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    )
    const aliases = new Set()
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      )
        continue
      const specifier = statement.moduleSpecifier.text
      const target = specifier.startsWith('.')
        ? path.resolve(path.dirname(filename), specifier)
        : path.resolve(specifier)
      if (target === modulePath && statement.importClause?.name)
        aliases.add(statement.importClause.name.text)
    }
    function visit(node) {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        aliases.has(node.expression.text)
      )
        classes.add(node.name.text)
      if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        aliases.has(node.expression.text) &&
        ts.isStringLiteralLike(node.argumentExpression)
      )
        classes.add(node.argumentExpression.text)
      ts.forEachChild(node, visit)
    }
    if (aliases.size) visit(source)
  }
  return classes
}

test('shared component CSS contains every referenced class and no orphan classes or keyframes', () => {
  const filename = path.resolve('components/styles.module.css')
  const css = fs.readFileSync(filename, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const declared = new Set()
  for (const [, selector] of css.matchAll(/([^{}]+)\{/g)) {
    if (selector.trim().startsWith('@')) continue
    const localSelector = selector.replace(/:global\([^)]*\)/g, '')
    for (const [, name] of localSelector.matchAll(/\.([_a-zA-Z][\w-]*)/g))
      declared.add(name)
  }
  const referenced = referencedClasses(filename)
  assert.ok(
    referenced.size > 0,
    'the consumer scan must find actual component references'
  )
  assert.deepEqual(
    [...referenced].filter((name) => !declared.has(name)).sort(),
    [],
    'missing CSS classes'
  )
  assert.deepEqual(
    [...declared].filter((name) => !referenced.has(name)).sort(),
    [],
    'orphan CSS classes'
  )
  const animations = [
    ...css.matchAll(/\banimation(?:-name)?\s*:\s*([^;}]+)/g)
  ].map((match) => match[1])
  for (const [, name] of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
    assert.ok(
      animations.some((value) => value.split(/[\s,]+/).includes(name)),
      `orphan keyframes: ${name}`
    )
  }
})

function imageMetadata(bytes) {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (bytes.subarray(0, 8).equals(pngSignature)) {
    return {
      type: 'image/png',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20)
    }
  }
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'expected a JPEG or PNG icon')
  let offset = 2
  while (offset + 4 <= bytes.length) {
    assert.equal(bytes[offset], 0xff, 'expected a JPEG segment marker')
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9) break
    const length = bytes.readUInt16BE(offset)
    assert.ok(
      length >= 2 && offset + length <= bytes.length,
      'invalid JPEG segment length'
    )
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        type: 'image/jpeg',
        width: bytes.readUInt16BE(offset + 5),
        height: bytes.readUInt16BE(offset + 3)
      }
    }
    offset += length
  }
  assert.fail('JPEG icon has no frame dimensions')
}

test('web manifest icon MIME types and dimensions match the actual local image files', () => {
  const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'))
  assert.ok(manifest.icons.length > 0)
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('/') && !icon.src.startsWith('//'))
    const filename = path.resolve('public', icon.src.slice(1))
    assert.ok(
      filename.startsWith(path.resolve('public') + path.sep),
      'icon stays under public/'
    )
    const metadata = imageMetadata(fs.readFileSync(filename))
    assert.equal(icon.type, metadata.type, icon.src)
    assert.equal(icon.sizes, `${metadata.width}x${metadata.height}`, icon.src)
  }
})
