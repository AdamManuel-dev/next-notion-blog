import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { formatMdx } from '../lib/mdx-format.mjs'
import { readContentIndex } from '../lib/mdx-content.mjs'

/** Format only active MDX; validate every proposed edit before writing any file. */
export async function formatContentFiles(
  files,
  { root = process.cwd(), write = false, all = false } = {}
) {
  if (all && files.length) throw new Error('Use file paths or --all, not both')
  if (!files.length && write && !all)
    throw new Error('Provide MDX file paths, or explicitly use --all')
  const canonicalRoot = fs.realpathSync(root)
  const directory = fs.realpathSync(path.join(canonicalRoot, 'content'))
  const targets = files.length
    ? files.map((file) => fs.realpathSync(path.resolve(root, file)))
    : readContentIndex({ root }).pages.map((page) => fs.realpathSync(page.file))
  const proposals = []
  for (const file of new Set(targets)) {
    if (!file.startsWith(directory + path.sep) || !file.endsWith('.mdx'))
      throw new Error(`Refusing to format outside active MDX content: ${file}`)
    const source = fs.readFileSync(file, 'utf8')
    const formatted = await formatMdx(source, { file })
    if (source !== formatted) proposals.push({ file, source, formatted })
  }
  if (write) {
    for (const { file, source } of proposals) {
      if (fs.readFileSync(file, 'utf8') !== source)
        throw new Error(`File changed during formatting; retry: ${file}`)
    }
    for (const { file, formatted } of proposals)
      fs.writeFileSync(file, formatted)
  }
  return {
    checked: new Set(targets).size,
    changed: proposals.map(({ file }) => path.relative(canonicalRoot, file))
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const args = process.argv.slice(2)
    const flags = args.filter((arg) => arg.startsWith('--'))
    if (
      flags.some((flag) => !['--write', '--check', '--all'].includes(flag)) ||
      (flags.includes('--write') && flags.includes('--check'))
    )
      throw new Error(
        'Usage: format-content.mjs [--check|--write] [files...|--all]'
      )
    const write = flags.includes('--write')
    const result = await formatContentFiles(
      args.filter((arg) => !arg.startsWith('--')),
      { write, all: flags.includes('--all') }
    )
    for (const file of result.changed)
      console.log(`${write ? 'Formatted' : 'Would format'} ${file}`)
    console.log(
      `${result.checked} MDX files checked; ${result.changed.length} ${
        write ? 'formatted' : 'need formatting'
      }`
    )
    if (!write && result.changed.length) process.exitCode = 1
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
