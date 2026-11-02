import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const script = path.resolve('scripts/serve-static.mjs')
const indexHtml = '<!doctype html><title>Preview</title><h1>Ready</h1>'
const custom404 = '<!doctype html><title>Missing</title><h1>Custom 404</h1>'

async function preview(t, notFound) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'static-preview-'))
  const out = path.join(root, 'out')
  await fs.mkdir(out)
  await fs.writeFile(path.join(out, 'index.html'), indexHtml)
  if (notFound) await fs.writeFile(path.join(out, '404.html'), notFound)

  const probe = net.createServer().listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  const exited = once(child, 'exit')
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await exited
    await fs.rm(root, { recursive: true, force: true })
  })
  await Promise.race([
    once(child.stdout, 'data'),
    exited.then(() => {
      throw new Error(`Preview exited before listening: ${stderr}`)
    })
  ])
  const request = (pathname, options = {}) =>
    fetch(`http://127.0.0.1:${port}${pathname}`, {
      signal: AbortSignal.timeout(3000),
      ...options
    })
  return { out, request }
}

test('static preview serves the exported 404 page for GET and HEAD', async (t) => {
  const { request } = await preview(t, custom404)
  const missing = await request('/missing')
  assert.equal(missing.status, 404)
  assert.match(missing.headers.get('content-type'), /^text\/html/)
  assert.equal(await missing.text(), custom404)
  const head = await request('/missing', { method: 'HEAD' })
  assert.equal(head.status, 404)
  assert.equal(await head.text(), '')
  assert.equal(await (await request('/')).text(), indexHtml)
})

test('a missing 404 export cannot crash the preview or leave requests hanging', async (t) => {
  const { out, request } = await preview(t)
  const missing = await request('/missing')
  assert.equal(missing.status, 404)
  assert.match(await missing.text(), /404.*Not Found/i)
  assert.equal(await (await request('/')).text(), indexHtml)

  await fs.writeFile(path.join(out, '404.html'), custom404)
  assert.equal(await (await request('/still-missing')).text(), custom404)
  await fs.rm(path.join(out, '404.html'))
  const malformed = await request('/%E0%A4%A')
  assert.equal(malformed.status, 404)
  assert.match(await malformed.text(), /404.*Not Found/i)
  assert.equal(await (await request('/')).text(), indexHtml)
})
