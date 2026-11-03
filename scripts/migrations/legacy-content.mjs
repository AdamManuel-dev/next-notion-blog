/** Historical compilation adapter. Production never imports migration tooling. */
import fs from 'node:fs'
import path from 'node:path'
import { readContentIndex, renderMdx } from '../../lib/mdx-content.mjs'
import { validateFragmentAliases } from '../../lib/rehype-fragment-aliases.mjs'
import blockIds from './remark-legacy-block-ids.mjs'
import fragments from './rehype-legacy-fragments.mjs'

export async function getLegacyPage(identifier, options) {
  const index = readContentIndex(options)
  const page = identifier ? index.aliases.get(identifier) : index.home
  if (!page) return null
  let aliases = {}
  try {
    const data = validateFragmentAliases(
      JSON.parse(
        fs.readFileSync(
          path.join(index.contentDir, 'fragment-aliases.json'),
          'utf8'
        )
      )
    )
    aliases = data.pages[page.id] ?? {}
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw new Error(
        `fragment-aliases.json: failed to read fragment aliases: ${error.message}`
      )
  }
  return {
    ...page,
    ...(await renderMdx(page.file, aliases, page.id, { blockIds, fragments }))
  }
}
