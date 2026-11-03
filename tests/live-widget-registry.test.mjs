import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import ts from 'typescript'

import { liveComponents } from '../lib/live-components.mjs'

test('static lazy widgets match the build-time component registrations', () => {
  const filename = new URL('../components/live/widgets.ts', import.meta.url)
  const source = ts.createSourceFile(
    filename.pathname,
    fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  )
  assert.equal(source.parseDiagnostics.length, 0)

  const registrations = []
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 'widgets'
    ) {
      assert.ok(ts.isObjectLiteralExpression(node.initializer))
      for (const property of node.initializer.properties) {
        assert.ok(ts.isPropertyAssignment(property))
        assert.ok(
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
        )
        const name = property.name.text
        const lazy = property.initializer
        assert.ok(ts.isCallExpression(lazy))
        assert.ok(ts.isPropertyAccessExpression(lazy.expression))
        assert.equal(lazy.expression.name.text, 'lazy')
        assert.equal(lazy.arguments.length, 1)
        const loader = lazy.arguments[0]
        assert.ok(ts.isArrowFunction(loader))
        const imports = []
        function collectImports(child) {
          if (
            ts.isCallExpression(child) &&
            child.expression.kind === ts.SyntaxKind.ImportKeyword
          ) {
            assert.equal(child.arguments.length, 1)
            assert.ok(ts.isStringLiteral(child.arguments[0]))
            imports.push(child.arguments[0].text)
          }
          ts.forEachChild(child, collectImports)
        }
        collectImports(loader)
        assert.equal(
          imports.length,
          1,
          `${name} needs one literal widget import`
        )
        registrations.push([name, imports[0]])
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  assert.equal(registrations.length, Object.keys(liveComponents).length)
  assert.deepEqual(
    Object.fromEntries(registrations),
    Object.fromEntries(
      Object.entries(liveComponents).map(([name, component]) => [
        name,
        component.module
      ])
    )
  )
})
