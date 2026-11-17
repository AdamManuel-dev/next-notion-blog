import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'

import { generateContentRevision } from './generate-content-revision.ts'

const require = createRequire(import.meta.url)
let timer: ReturnType<typeof setTimeout> | undefined
let stopped = false

function regenerate(): void {
  if (stopped) return
  try {
    generateContentRevision()
  } catch (error) {
    // Keep Next running so fixing a filesystem error can recover without a restart.
    console.error(
      `Content refresh: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

// Watch before hashing so edits arriving during the initial scan are not lost.
const watcher = fs.watch('content', { recursive: true }, () => {
  clearTimeout(timer)
  timer = setTimeout(regenerate, 100)
})

try {
  generateContentRevision()
} catch (error) {
  watcher.close()
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const child = spawn(
  process.execPath,
  [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)],
  { stdio: 'inherit' }
)

function stop() {
  stopped = true
  clearTimeout(timer)
  watcher.close()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    stop()
    child.kill(signal)
  })
}
child.once('error', (error) => {
  stop()
  console.error(error.message)
  process.exitCode = 1
})
child.once('exit', (code, signal) => {
  stop()
  process.exitCode = code ?? (signal ? 1 : 0)
})
