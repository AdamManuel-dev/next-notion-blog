import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { createProcessor, evaluate } from '@mdx-js/mdx'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as runtime from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'

import {
  extractLiveBlocks,
  parseLiveLiteral,
  remarkLiveBlocks
} from '../lib/live-blocks.mjs'
import { matchesLiveProp } from '../lib/live-components.mjs'

const options = { pageId: 'page', file: 'content/example/index.mdx' }
const component =
  'export default function Example() { return <button>Run</button> }'
const fence = (code = component, meta = 'live', lang = 'tsx') =>
  `\`\`\`${lang} ${meta}\n${code}\n\`\`\``
const descriptor = ({ id, moduleId, props }) => ({ id, moduleId, props })
const extract = (source) => extractLiveBlocks(source, options)

function transform(source, extra = {}) {
  const tree = createProcessor({ remarkPlugins: [remarkGfm] }).parse(source)
  const file = { data: {}, value: source }
  remarkLiveBlocks({ ...options, ...extra })(tree, file)
  return { tree, file }
}

test('discovery understands article markers and nested registered tags', () => {
  const source =
    '## Heading {#heading}\n\n:::callout{#example}\n\n<Counter />\n\n:::'
  assert.equal(extract(source)[0].moduleId, 'Counter')
})

test('MDX parsing errors retain the original file and line', () => {
  assert.throws(() => extract('## Broken {'), /index\.mdx:1: Invalid MDX/)
})

test('ordinary fences remain static, including fence-like text and live substrings', () => {
  const source = [
    fence('not valid JS', 'title=live'),
    fence('plain', '', 'text'),
    fence(component, 'live-example'),
    `~~~~text\n${fence()}\n~~~~`
  ].join('\n\n')
  assert.deepEqual(
    transform(source).tree,
    createProcessor({ remarkPlugins: [remarkGfm] }).parse(source)
  )
  assert.deepEqual(extract(source), [])
})

for (const lang of ['jsx', 'tsx', 'js', 'python']) {
  test(`formerly executable ${lang} fences report a migration diagnostic`, () => {
    const source = fence(
      "throw new Error('never execute')",
      'live id=demo',
      lang
    )
    assert.throws(
      () => extract(source),
      /index\.mdx:1: Executable live fences.*registered component.*static code example/
    )
    assert.throws(
      () => transform(source, { lineOffset: 3 }),
      /index\.mdx:4: Executable live fences/
    )
    const quoted = source
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    assert.throws(
      () => extract(`Intro\n\n${quoted}`),
      /index\.mdx:3: Executable live fences/
    )
  })
}

test('remark emits an addressed mount, fallback and escaped original tag source', async () => {
  const source = '<Counter id="demo" initialCount={3} />'
  const { tree, file } = transform(source)
  const wrapper = tree.children[0]
  assert.deepEqual(
    wrapper.attributes.map(({ name, value }) => [name, value]),
    [
      ['id', 'demo'],
      ['className', 'live-block'],
      ['data-live-block', 'demo']
    ]
  )
  assert.equal(wrapper.children[0].attributes[0].name, 'data-live-mount')
  assert.deepEqual(wrapper.children[0].children, [])
  assert.equal(wrapper.children[1].attributes[0].name, 'data-live-fallback')
  assert.equal(wrapper.children[2].children[1].value, source)
  assert.deepEqual(file.data.liveBlocks, extract(source).map(descriptor))
  const result = await evaluate(source, {
    ...runtime,
    remarkPlugins: [[remarkLiveBlocks, options]]
  })
  const html = renderToStaticMarkup(createElement(result.default))
  assert.match(html, /Interactive example\. Enable JavaScript to run it\./)
  assert.match(html, /View source/)
  assert.match(html, /&lt;Counter/)
  assert.doesNotMatch(html, /<button/)
})

test('registered flow JSX shares ordered static island discovery', () => {
  const source = `Before.\n\n<Counter initialCount={3} />\n\n<Diagram id="steps" active={1} />\n\nAfter.`
  const records = extract(source)
  assert.equal(records.length, 2)
  assert.equal(records[0].source, '<Counter initialCount={3} />')
  assert.equal(records[0].lang, 'tsx')
  assert.equal(records[0].moduleId, 'Counter')
  assert.equal(records[0].props.initialCount, 3)
  assert.equal(records[1].moduleId, 'Diagram')
  assert.equal(Object.hasOwn(records[1].props, 'id'), false)
  assert.equal(records[1].id, 'steps')
  assert.deepEqual(
    transform(source).file.data.liveBlocks,
    records.map(descriptor)
  )
  assert.deepEqual(extract(source), records)
  const transformed = transform(source).tree
  const original = createProcessor({ remarkPlugins: [remarkGfm] }).parse(source)
  assert.deepEqual(
    transformed.children[1].position,
    original.children[1].position
  )
})

test('registered IDs pin containers while props change independently of modules', () => {
  const before = extract('<Counter id="counter" initialCount={3} />')[0]
  const after = extract('<Counter id="counter" initialCount={4} />')[0]
  assert.equal(before.id, after.id)
  assert.equal(before.moduleId, after.moduleId)
  assert.notDeepEqual(before.props, after.props)
  assert.equal(Object.hasOwn(before, 'key'), false)
  assert.equal(
    extract('<Counter />\n\n<Counter />')[1].id,
    `${extract('<Counter />')[0].id}-2`
  )
  assert.throws(
    () => extract('<Counter id="same" />\n\n<Diagram id="same" />'),
    /Duplicate live id/
  )
})

test('registered extraction agrees with rendering through frontmatter and blockquotes', () => {
  const body = '\n> <Counter initialCount={-3} />'
  const records = extract(`---\ntitle: Example\n---\n${body}`)
  assert.equal(records[0].line, 5)
  assert.deepEqual(
    transform(body, { lineOffset: 3 }).file.data.liveBlocks,
    records.map(descriptor)
  )
})

test('registered prop schemas support serializable data types without coercion', () => {
  for (const [value, type] of [
    ['value', 'string'],
    [true, 'boolean'],
    [3, 'number'],
    [null, 'null'],
    [[1, 'two'], 'array'],
    [{ label: 'value' }, 'object']
  ]) {
    assert.equal(matchesLiveProp(value, { type }), true)
    assert.equal(matchesLiveProp(value, { type: 'different' }), false)
  }
  assert.equal(matchesLiveProp('3', { type: 'number' }), false)
  assert.equal(matchesLiveProp(Infinity, { type: 'number' }), false)
  assert.equal(matchesLiveProp(1.5, { type: 'number', integer: true }), false)
  assert.equal(matchesLiveProp(3, { type: 'number', min: 0, max: 2 }), false)
})

test('literal parser accepts nested finite JSON without executing code', () => {
  const value = parseLiveLiteral(
    '{"text": "hello", "enabled": true, "values": [-3, 2, null, false, {"nested": []}]}'
  )
  assert.deepEqual(JSON.parse(JSON.stringify(value)), {
    text: 'hello',
    enabled: true,
    values: [-3, 2, null, false, { nested: [] }]
  })
  for (const expression of [
    'undefined',
    'NaN',
    'Infinity',
    '1e999',
    'run()',
    'window.value',
    'import("x")',
    '() => 1',
    '{value}',
    '{...value}',
    '{["x"]: 1}',
    '{__proto__: {}}',
    '{constructor: 1}',
    '{prototype: 1}',
    '{"__proto__": {}}',
    '{"nested": {"constructor": 1}}',
    '[{"prototype": 1}]',
    '{"overflow": [1e999]}',
    '{"x": 1,}',
    '{"x": 1 /* comment */}',
    "'hello'",
    '+2',
    '(3)',
    '[,1]',
    '[...values]',
    '3 as number',
    '`hello`'
  ]) {
    assert.throws(() => parseLiveLiteral(expression), /static finite JSON/)
  }
  // JSON.parse's standard duplicate-key behavior is last-value-wins.
  assert.deepEqual(parseLiveLiteral('{"x": 1, "x": 2}'), { x: 2 })
})

for (const [source, message] of [
  ['<Missing />', /Unknown live component.*Counter.*Diagram/],
  ['Text <Counter /> text.', /own line/],
  ['<Counter>\nchildren\n</Counter>', /does not support children/],
  ['<Counter {...props} />', /Spread props/],
  ['<Counter initialCount={run()} />', /static finite JSON/],
  ['<Counter initialCount={window.count} />', /static finite JSON/],
  ['<Counter initialCount={() => 3} />', /static finite JSON/],
  ['<Counter initialCount={import("x")} />', /static finite JSON/],
  ['<Counter initialCount="3" />', /Invalid prop/],
  ['<Counter initialCount />', /Invalid prop/],
  ['<Counter initialCount={null} />', /Invalid prop/],
  ['<Counter initialCount={[]} />', /Invalid prop/],
  ['<Counter initialCount={{"count": 3}} />', /Invalid prop/],
  ['<Counter initialCount={{count: 3}} />', /static finite JSON/],
  ["<Counter initialCount={'3'} />", /static finite JSON/],
  ['<Counter initialCount={1} initialCount={2} />', /Duplicate live prop/],
  ['<Counter label="value" />', /Unknown prop/],
  ['<Counter key="x" />', /Reserved live prop/],
  ['<Counter ref={null} />', /Reserved live prop/],
  ['<Counter dangerouslySetInnerHTML={{__html: "x"}} />', /Reserved live prop/],
  ['<Counter constructor="x" />', /Reserved live prop/],
  ['<Counter id="Invalid" />', /Invalid live id/],
  ['<Counter id={3} />', /Invalid live id/],
  ['<Counter id="a" id="b" />', /Duplicate live prop/],
  ['<Diagram active={3} />', /integer from 0 to 2/],
  ['<Diagram active={1.5} />', /integer from 0 to 2/]
]) {
  test(`registered JSX rejects unsupported input: ${source}`, () => {
    assert.throws(() => extract(source), message)
    assert.throws(() => transform(source), message)
  })
}

test('native HTML is unchanged', () => {
  const source = '<div className="example">Native HTML</div>'
  assert.deepEqual(extract(source), [])
  assert.deepEqual(
    transform(source).tree,
    createProcessor({ remarkPlugins: [remarkGfm] }).parse(source)
  )
})

test('automatic IDs are deterministic, occurrence-aware and collision-checked', () => {
  const source = '<Counter />'
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 12)
  const records = extract(`${source}\n\n${source}`)
  assert.equal(records[0].id, `live-${digest}`)
  assert.equal(records[1].id, `live-${digest}-2`)
  assert.deepEqual(extract(`${source}\n\n${source}`), records)
  assert.throws(
    () => extract(`${source}\n\n<Diagram id="${records[0].id}" />`),
    /Duplicate live id/
  )
})
