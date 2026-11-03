import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createFragmentSlugger,
  slugifyFragment
} from '../../../lib/fragment-slugs.mjs'
import {
  migrateFragmentLinks,
  migrateFragmentSlugs
} from '../../../scripts/migrations/migrate-fragment-slugs.mjs'

const oldHeading = 'local-heading-1'
const oldAnchor = '23910a0af92080fa9113f97431724437'
const oldCallout = '23910a0af9208013b11df3d09d2d7ffc'
const oldParagraph = '23910a0af92081fab41de008782ee582'

test('fragment naming normalizes text deterministically and reserves authored names', () => {
  assert.equal(
    slugifyFragment('Café: Database Architecture!'),
    'cafe-database-architecture'
  )
  const allocate = createFragmentSlugger(['database', 'database-2'])
  assert.equal(allocate('Database'), 'database-3')
  assert.equal(allocate('Database'), 'database-4')
  assert.equal(createFragmentSlugger()('Database'), 'database')
})

test('migration pins contextual names and retains every legacy target outside MDX', () => {
  const source = [
    `## 4. Database Architecture {#${oldHeading}}`,
    '',
    `::anchor{#${oldAnchor}}`,
    '',
    `> :::callout{#${oldCallout}}`,
    '>',
    '> A robust database layer.',
    '>',
    '> :::',
    '',
    `Create \`src/base.entity.ts\`: {#${oldParagraph}}`,
    ''
  ].join('\n')
  const result = migrateFragmentSlugs(source)
  assert.equal(result.replacements.get(oldHeading), 'database-architecture')
  assert.equal(
    result.replacements.get(oldAnchor),
    'database-architecture-callout-start'
  )
  assert.equal(
    result.replacements.get(oldCallout),
    'database-architecture-callout'
  )
  assert.equal(
    result.replacements.get(oldParagraph),
    'create-src-base-entity-ts'
  )
  for (const [oldId, slug] of result.replacements) {
    assert.ok(!result.source.includes(oldId))
    assert.deepEqual(result.aliases[slug], [oldId])
  }
  const again = migrateFragmentSlugs(result.source, result.aliases)
  assert.equal(again.source, result.source)
  assert.deepEqual(again.aliases, result.aliases)
  assert.equal(again.replacements.size, 0)
  const edited = result.source.replace(
    'Database Architecture',
    'New database title'
  )
  assert.equal(migrateFragmentSlugs(edited, result.aliases).source, edited)
})

test('migration preserves authored slugs, frontmatter, literal markers and code bytes', () => {
  const source = [
    '---',
    `description: "{#${oldAnchor}}"`,
    '---',
    '## Database {#database}',
    '',
    `## Database {#${oldHeading}}`,
    '',
    '```md',
    `::anchor{#${oldAnchor}}`,
    '```',
    '',
    `Literal \`{#${oldCallout}}\` and \\{#${oldParagraph}}`,
    ''
  ].join('\n')
  const result = migrateFragmentSlugs(source)
  assert.equal(result.replacements.size, 1)
  assert.equal(result.replacements.get(oldHeading), 'database-2')
  assert.ok(result.source.includes(`description: "{#${oldAnchor}}"`))
  assert.ok(result.source.includes(`\n::anchor{#${oldAnchor}}\n`))
  assert.ok(result.source.includes(`\\{#${oldParagraph}}`))
})

test('migration updates internal authored links without touching fenced or external links', () => {
  const page = { id: 'page', slug: 'page' }
  const routes = new Map([['page', page]])
  const migrations = new Map([
    ['page', { replacements: new Map([[oldHeading, 'database']]) }]
  ])
  const source = [
    `[Local](#${oldHeading})`,
    `[Page](/page#${oldHeading})`,
    `[#${oldHeading}](#${oldHeading} "#${oldHeading}")`,
    '',
    `[reference]: #${oldHeading}`,
    `[Reference][reference]`,
    `[External](https://example.com/page#${oldHeading})`,
    '',
    '```md',
    `[Example](#${oldHeading})`,
    '```'
  ].join('\n')
  const result = migrateFragmentLinks(source, page, routes, migrations)
  assert.ok(result.includes('[Local](#database)'))
  assert.ok(result.includes('[Page](/page#database)'))
  assert.ok(result.includes(`[#${oldHeading}](#database "#${oldHeading}")`))
  assert.ok(result.includes('[reference]: #database'))
  assert.ok(
    result.includes(`[External](https://example.com/page#${oldHeading})`)
  )
  assert.ok(result.includes(`\n[Example](#${oldHeading})\n`))
})
