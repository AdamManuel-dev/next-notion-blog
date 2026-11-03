import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const directory = path.join(root, '.generated')
fs.mkdirSync(directory, { recursive: true })
const file = path.join(directory, 'mdx-content-tools.vsix')
// Packaging is opt-in; the extension itself has no bundled runtime dependencies.
execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  [
    'exec',
    '--yes',
    '--package=@vscode/vsce@3.6.0',
    '--',
    'vsce',
    'package',
    '--no-dependencies',
    '--out',
    file
  ],
  {
    cwd: path.join(root, 'tools/mdx-editor'),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  }
)
console.log(`Editor extension: ${file}`)
if (process.argv.includes('--install'))
  execFileSync(
    process.platform === 'win32' ? 'code.cmd' : 'code',
    ['--install-extension', file, '--force'],
    { stdio: 'inherit', shell: process.platform === 'win32' }
  )
