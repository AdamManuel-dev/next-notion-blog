import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript.js'
import 'prismjs/components/prism-bash.js'

test('reader code languages still produce syntax highlighting tokens', () => {
  for (const [language, code] of [
    ['javascript', 'const answer = 42'],
    ['typescript', 'const answer: number = 42'],
    ['bash', 'echo "$HOME"'],
    ['markup', '<p>Hello</p>']
  ]) {
    const html = Prism.highlight(code, Prism.languages[language], language)
    assert.match(html, /class="token /, language)
  }
})

test('the app highlights code on hard loads and client-side navigation', () => {
  // The core import covers DOMContentLoaded; route effects cover Next links.
  const app = fs.readFileSync('pages/_app.tsx', 'utf8')
  assert.match(app, /import Prism from 'prismjs'/)
  assert.match(app, /Prism\.highlightAll\(\)/)
  assert.match(app, /\[router\.asPath\]/)
  assert.match(app, /import 'prismjs\/components\/prism-typescript'/)
  assert.match(app, /import 'prismjs\/components\/prism-bash'/)
  assert.match(app, /import 'prismjs\/themes\/prism-coy\.css'/)
  assert.match(app, /import 'styles\/prism-theme\.css'/)
})
