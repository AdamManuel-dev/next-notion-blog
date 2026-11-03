import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { readContentIndex } from '../lib/mdx-content.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const extensionFile = path.join(root, 'tools/mdx-editor/extension.cjs')

function harness(t) {
  const commands = new Map()
  const opened = []
  const errors = []
  const document = {
    uri: {
      scheme: 'file',
      fsPath: path.join(root, 'content/notes/react/live-components/index.mdx')
    },
    version: 1,
    isDirty: false,
    getText: () => '---\ntitle: Example\n---\n\n-   First\n-   Second\n',
    positionAt: (offset) => offset,
    save: async () => true
  }
  let provider
  let port
  const vscode = {
    workspace: {
      isTrusted: true,
      getWorkspaceFolder: () => ({ uri: { fsPath: root } }),
      getConfiguration: () => ({ get: () => port })
    },
    languages: {
      registerDocumentFormattingEditProvider: (_selector, value) => {
        provider = value
        return { dispose() {} }
      }
    },
    window: {
      activeTextEditor: { document },
      showErrorMessage: (message) => errors.push(message),
      withProgress: (_options, work) => work(),
      createTerminal: () => {
        throw new Error('An existing server should be reused')
      }
    },
    commands: {
      registerCommand: (name, run) => {
        commands.set(name, run)
        return { dispose() {} }
      },
      executeCommand: async (...args) => opened.push(args)
    },
    env: { openExternal: async (url) => opened.push(['external', url]) },
    Uri: { parse: (url) => url },
    ProgressLocation: { Notification: 15 },
    ViewColumn: { Beside: 2 },
    Range: class {
      constructor(start, end) {
        this.start = start
        this.end = end
      }
    },
    TextEdit: { replace: (range, newText) => ({ range, newText }) }
  }
  const original = Module._load
  let extension
  try {
    Module._load = function (name, ...args) {
      return name === 'vscode' ? vscode : original.call(this, name, ...args)
    }
    delete require.cache[extensionFile]
    extension = require(extensionFile)
  } finally {
    Module._load = original
  }
  const context = { subscriptions: [] }
  extension.activate(context)
  t.after(() => {
    for (const subscription of context.subscriptions) subscription.dispose()
    delete require.cache[extensionFile]
  })
  return {
    commands,
    opened,
    errors,
    document,
    provider,
    vscode,
    setPort: (value) => {
      port = value
    }
  }
}

test('editor formatter uses the shared safe engine and returns a full-document edit', async (t) => {
  const { document, provider, errors } = harness(t)
  const edits = await provider.provideDocumentFormattingEdits(
    document,
    {},
    { isCancellationRequested: false }
  )
  assert.equal(edits.length, 1)
  assert.notEqual(edits[0].newText, document.getText())
  assert.ok(edits[0].newText.startsWith('---\ntitle: Example\n---\n'))
  assert.equal(edits[0].range.end, document.getText().length)
  assert.deepEqual(errors, [])
})

test('editor formatter never overwrites cancelled or newer document versions', async (t) => {
  const { document, provider } = harness(t)
  assert.deepEqual(
    await provider.provideDocumentFormattingEdits(
      document,
      {},
      { isCancellationRequested: true }
    ),
    []
  )
  const pending = provider.provideDocumentFormattingEdits(
    document,
    {},
    { isCancellationRequested: false }
  )
  document.version++
  assert.deepEqual(await pending, [])
})

test('editor refuses untrusted workspaces and files outside active content', async (t) => {
  const { document, provider, vscode, errors } = harness(t)
  vscode.workspace.isTrusted = false
  assert.deepEqual(
    await provider.provideDocumentFormattingEdits(
      document,
      {},
      { isCancellationRequested: false }
    ),
    []
  )
  assert.match(errors.pop(), /trusted local workspace/)
  vscode.workspace.isTrusted = true
  document.uri.fsPath = path.join(root, 'package.json')
  assert.deepEqual(
    await provider.provideDocumentFormattingEdits(
      document,
      {},
      { isCancellationRequested: false }
    ),
    []
  )
  assert.match(errors.pop(), /only edit active content/)
})

test('embedded and external previews share the real route and reuse a matching server', async (t) => {
  const { commands, opened, errors, setPort } = harness(t)
  const homeId = readContentIndex({ root }).home.id
  const server = http.createServer((_request, response) =>
    response.end(
      `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        buildId: 'development',
        props: { pageProps: { page: { id: homeId } } }
      })}</script>`
    )
  )
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections()
        server.close(resolve)
      })
  )
  const port = server.address().port
  setPort(port)
  await commands.get('blogMdx.previewEditor')()
  await commands.get('blogMdx.previewBrowser')()
  const url = `http://127.0.0.1:${port}/react-live-components`
  assert.deepEqual(opened, [
    ['simpleBrowser.show', url, { viewColumn: 2, preserveFocus: true }],
    ['external', url]
  ])
  assert.deepEqual(errors, [])
})

test('preview does not start or open if a dirty document cannot be saved', async (t) => {
  const { commands, opened, document, errors } = harness(t)
  document.isDirty = true
  document.save = async () => false
  await commands.get('blogMdx.previewEditor')()
  assert.deepEqual(opened, [])
  assert.match(errors[0], /Save the page/)
})
