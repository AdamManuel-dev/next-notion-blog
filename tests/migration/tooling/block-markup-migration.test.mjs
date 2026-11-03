import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cleanBlockMarkup } from '../../../scripts/migrations/clean-block-markup.mjs'

test('block cleanup moves a root anchor to its paragraph and preserves other targets', () => {
  const source = [
    '<a id="paragraph"></a>',
    '',
    'A **paragraph** with a [link](/page).',
    '',
    "<a id='alternate'></a>",
    '',
    '## Heading {#heading}',
    '',
    '<a id="image"></a>',
    '',
    '![Image](/image.png)',
    ''
  ].join('\n')
  const result = cleanBlockMarkup(source)
  assert.equal(result.anchors, 3)
  assert.equal(result.paragraphs, 1)
  assert.equal(
    result.source,
    [
      'A **paragraph** with a [link](/page). {#paragraph}',
      '',
      '::anchor{#alternate}',
      '',
      '## Heading {#heading}',
      '',
      '::anchor{#image}',
      '',
      '![Image](/image.png)',
      ''
    ].join('\n')
  )
  assert.equal(cleanBlockMarkup(result.source).source, result.source)
})

test('block cleanup preserves frontmatter, fenced examples, and meaningful HTML', () => {
  const source = [
    '---',
    'title: "<a id=\'metadata\'></a>"',
    '---',
    '````md',
    '<a id="example"></a>',
    '<section id="code">',
    '```',
    '</section>',
    '````',
    '',
    '`<a id="inline-code"></a>`',
    '',
    'Text <a id="inline"></a> after.',
    '',
    '<a id="link" href="/page"></a>',
    '',
    '<section id="semantic" className="special">',
    '',
    'Content',
    '',
    '</section>',
    ''
  ].join('\n')
  assert.equal(cleanBlockMarkup(source).source, source)
})

test('block cleanup retains quote/list prefixes and uses longer outer callout fences', () => {
  const source = [
    '> <section id="outer">',
    '>',
    '> <section id="inner">',
    '>',
    '> Text',
    '>',
    '> </section>',
    '>',
    '> </section>',
    '',
    '- <a id="item"></a>',
    '',
    '  Item text',
    ''
  ].join('\n')
  const result = cleanBlockMarkup(source)
  assert.equal(result.callouts, 2)
  assert.equal(
    result.source,
    [
      '> ::::callout{#outer}',
      '>',
      '> :::callout{#inner}',
      '>',
      '> Text',
      '>',
      '> :::',
      '>',
      '> ::::',
      '',
      '- ::anchor{#item}',
      '',
      '  Item text',
      ''
    ].join('\n')
  )
  assert.equal(cleanBlockMarkup(result.source).source, result.source)
})
