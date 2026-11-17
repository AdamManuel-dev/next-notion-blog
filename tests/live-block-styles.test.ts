import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

const readerStyles = readFileSync(
  new URL('../styles/local-reader.css', import.meta.url),
  'utf8'
)

test('reader code blocks suppress both Prism Coy paper decorations', () => {
  const decorationRule = readerStyles.match(
    /\.local-reader pre\[class\*='language-'\]::before,\s*\.local-reader pre\[class\*='language-'\]::after\s*\{([^}]+)\}/
  )

  assert.ok(decorationRule, 'scope both pseudo-elements to reader code blocks')
  assert.match(decorationRule[1], /content:\s*none\s*;/)
  assert.match(decorationRule[1], /display:\s*none\s*;/)
})
