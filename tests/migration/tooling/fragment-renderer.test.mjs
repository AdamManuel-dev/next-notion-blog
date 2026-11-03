import assert from 'node:assert/strict'
import test from 'node:test'

import { getLocalPage, readContentIndex } from '../../../lib/mdx-content.mjs'
import { getLegacyPage } from '../../../scripts/migrations/legacy-content.mjs'

test('single-pass fragment allocation preserves migrated HTML and every alias destination', async () => {
  for (const entry of readContentIndex().pages) {
    const current = await getLocalPage(entry.slug)
    const historical = await getLegacyPage(entry.slug)
    assert.equal(current.html, historical.html, `${entry.slug}: rendered HTML`)
    assert.deepEqual(
      current.fragmentAliases,
      historical.fragmentAliases,
      `${entry.slug}: legacy fragment destinations`
    )
  }
})
