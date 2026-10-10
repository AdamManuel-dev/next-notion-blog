import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

const base = readFileSync(
  new URL('../node_modules/react-notion-x/src/styles.css', import.meta.url),
  'utf8'
)
const theme = readFileSync(
  new URL('../styles/theme.css', import.meta.url),
  'utf8'
)
const variables = (css, selector) =>
  Object.fromEntries(
    [...css.match(selector)[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(
      ([, key, value]) => [key, value.trim()]
    )
  )
const light = {
  ...variables(base, /:root\s*\{([^}]+)/),
  ...variables(theme, /:root\s*\{([^}]+)/)
}
const dark = {
  ...light,
  ...variables(base, /\.dark-mode\s*\{([^}]+)/),
  ...variables(theme, /\.dark-mode\s*\{([^}]+)/)
}
const colors = [
  'red',
  'pink',
  'blue',
  'purple',
  'teal',
  'yellow',
  'orange',
  'brown',
  'gray'
]
function rgb(value, palette) {
  if (value.startsWith('var(')) return rgb(palette[value.slice(4, -1)], palette)
  if (value.startsWith('#')) {
    let hex = value.slice(1)
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('')
    return hex.match(/../g).map((c) => parseInt(c, 16))
  }
  return value
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
}
function luminance(rgb) {
  return rgb
    .map((c) => c / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
}
function check(fg, bg, palette, label, minimum = 4.5) {
  const a = luminance(rgb(fg, palette)),
    b = luminance(rgb(bg, palette))
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  assert.ok(
    ratio >= minimum,
    `${label}: ${ratio.toFixed(2)}:1 is below ${minimum}:1`
  )
}
for (const [name, palette, codeBg] of [
  ['light', light, '#f2f5ef'],
  ['dark', dark, '#111827']
]) {
  test(`${name} text, syntax, highlights and focus colors meet contrast targets`, () => {
    for (const fg of [
      '--blog-text',
      '--blog-muted',
      ...colors.map((c) => `--notion-${c}`)
    ]) {
      for (const bg of [
        '--bg-color',
        ...colors.map((c) => `--notion-${c}_background`)
      ]) {
        check(palette[fg], palette[bg], palette, `${fg} on ${bg}`)
      }
    }
    for (const token of [
      'neutral',
      'comment',
      'green',
      'purple',
      'amber',
      'blue',
      'pink'
    ]) {
      check(palette[`--code-${token}`], codeBg, palette, `code ${token}`)
    }
    for (const color of ['--blog-focus', '--blog-control-border']) {
      for (const surface of ['--blog-surface', '--blog-panel']) {
        check(
          palette[color],
          palette[surface],
          palette,
          `${color} on ${surface}`,
          3
        )
      }
    }
  })
}
// Bound the glass background over black/white so contrast does not depend on the article behind it.
test('glass search text remains readable over either backdrop extreme', () => {
  for (const [foreground, background, alpha] of [
    ['#485744', '#fafdf7', 0.96],
    ['#c2cdbb', '#1e2820', 0.97]
  ]) {
    for (const under of [0, 255]) {
      const composite = rgb(background, {}).map(
        (c) => c * alpha + under * (1 - alpha)
      )
      check(foreground, `rgb(${composite.join(',')})`, {}, 'glass search text')
    }
  }
})
