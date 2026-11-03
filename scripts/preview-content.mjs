import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  getContentPreview,
  probeContentPreview,
  waitForContentPreview
} from '../lib/content-preview.mjs'

export function openPreviewBrowser(url) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : ['xdg-open', [url]]
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' })
    child.once('error', reject)
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Browser opener exited ${code}`))
    )
  })
}

async function main() {
  const files = []
  let port = 3000
  let print = false
  let noOpen = false
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--port') {
      port = args[++index]
      if (port === undefined) throw new Error('--port requires a number')
    } else if (args[index] === '--print') print = true
    else if (args[index] === '--no-open') noOpen = true
    else if (args[index].startsWith('--'))
      throw new Error(
        'Usage: preview-content.mjs file [--port N] [--print|--no-open]'
      )
    else files.push(args[index])
  }
  if (files.length !== 1)
    throw new Error('Provide one content index.mdx file to preview')
  const root = fileURLToPath(new URL('..', import.meta.url))
  const preview = getContentPreview(path.resolve(files[0]), { root, port })
  console.log(preview.url)
  if (print) return
  const state = await probeContentPreview(preview)
  if (state === 'occupied')
    throw new Error(
      `Port ${preview.port} belongs to another app or a failed build; choose --port N or check the dev terminal`
    )
  let server
  if (state === 'offline') {
    server = spawn(
      process.execPath,
      [
        'scripts/dev.mjs',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(preview.port)
      ],
      { cwd: root, stdio: 'inherit' }
    )
    server.on('error', (error) => console.error(error.message))
    server.once('exit', (code, signal) => {
      process.exitCode = code ?? (signal ? 1 : 0)
    })
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.once(signal, () => server.kill(signal))
  }
  try {
    await waitForContentPreview(preview)
    if (!noOpen) {
      try {
        await openPreviewBrowser(preview.url)
      } catch (error) {
        // A headless terminal can still use the printed URL in another browser.
        console.error(`Open ${preview.url} manually (${error.message})`)
      }
    }
    if (server)
      console.log('Live preview updates on save. Press Ctrl+C to stop.')
  } catch (error) {
    server?.kill('SIGTERM')
    throw error
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
