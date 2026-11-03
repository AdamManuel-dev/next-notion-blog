import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** Notify Next about filesystem-only content edits, independently of widget loading. */
export function generateContentRevision({
  root = process.cwd(),
  contentDir = 'content',
  outputFile = '.generated/content-revision.ts'
} = {}) {
  const directory = path.resolve(root, contentDir)
  const hash = createHash('sha256')
  function visit(currentDirectory) {
    const entries = fs
      .readdirSync(currentDirectory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const file = path.join(currentDirectory, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules')
          visit(file)
      } else if (
        entry.isFile() &&
        (entry.name === 'index.mdx' ||
          file === path.join(directory, 'fragment-aliases.json'))
      ) {
        hash
          .update(path.relative(directory, file))
          .update('\0')
          .update(fs.readFileSync(file))
          .update('\0')
      }
    }
  }
  visit(directory)
  const revision = hash.digest('hex')
  const content = `// Generated content refresh token; not a widget registry.\nexport const contentRevision = '${revision}'\n`
  const file = path.resolve(root, outputFile)
  try {
    if (fs.readFileSync(file, 'utf8') === content)
      return { revision, written: false }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx' })
    fs.renameSync(temporary, file)
  } finally {
    fs.rmSync(temporary, { force: true })
  }
  return { revision, written: true }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    generateContentRevision()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
