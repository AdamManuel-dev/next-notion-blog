import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'
import Module, { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { readContentIndex } from '../lib/mdx-content.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const require = createRequire(import.meta.url)
const extensionFile = path.join(root, 'tools/mdx-editor/dist/extension.cjs')

interface Document {
  uri: { scheme: string; fsPath: string }
  version: number
  isDirty: boolean
  getText: () => string
  positionAt: (offset: number) => number
  save: () => Promise<boolean>
}
interface Edit {
  range: { start: number; end: number }
  newText: string
}
interface Formatter {
  provideDocumentFormattingEdits: (
    document: Document,
    options: object,
    token: { isCancellationRequested: boolean }
  ) => Promise<Edit[]>
}
interface Subscription {
  dispose: () => void
}
// A narrow port models the editor boundary without pretending fixtures are full VS Code objects.
interface Extension {
  activate: (context: { subscriptions: Subscription[] }) => void
}
function isExtension(value: unknown): value is Extension {
  return (
    typeof value === 'object' &&
    value !== null &&
    'activate' in value &&
    typeof value.activate === 'function'
  )
}
function harness(t: test.TestContext) {
  const commands = new Map<string, () => Promise<void>>()
  const opened: unknown[][] = []
  const errors: string[] = []
  const document: Document = {
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
  let provider: Formatter | undefined
  let port: number | undefined
  const vscode = {
    workspace: {
      isTrusted: true,
      getWorkspaceFolder: () => ({ uri: { fsPath: root } }),
      getConfiguration: () => ({ get: () => port })
    },
    languages: {
      registerDocumentFormattingEditProvider: (
        _selector: unknown,
        value: Formatter
      ) => {
        provider = value
        return { dispose() {} }
      }
    },
    window: {
      activeTextEditor: { document },
      showErrorMessage: (message: string) => errors.push(message),
      withProgress: (_options: unknown, work: () => Promise<unknown>) => work(),
      createTerminal: () => {
        throw new Error('An existing server should be reused')
      }
    },
    commands: {
      registerCommand: (name: string, run: () => Promise<void>) => {
        commands.set(name, run)
        return { dispose() {} }
      },
      executeCommand: async (...args: unknown[]) => opened.push(args)
    },
    env: {
      openExternal: async (url: string) => opened.push(['external', url])
    },
    Uri: { parse: (url: string) => url },
    ProgressLocation: { Notification: 15 },
    ViewColumn: { Beside: 2 },
    Range: class {
      constructor(public start: number, public end: number) {
        this.start = start
        this.end = end
      }
    },
    TextEdit: {
      replace: (range: Edit['range'], newText: string) => ({ range, newText })
    }
  }
  assert.ok('_load' in Module && typeof Module._load === 'function')
  const original = Module._load
  let extension: unknown
  try {
    Module._load = function (name: string, ...args: unknown[]) {
      return name === 'vscode' ? vscode : original.call(this, name, ...args)
    }
    delete require.cache[extensionFile]
    extension = require(extensionFile)
  } finally {
    Module._load = original
  }
  assert.ok(isExtension(extension))
  const context: { subscriptions: Subscription[] } = { subscriptions: [] }
  extension.activate(context)
  assert.ok(provider)
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
    setPort: (value: number) => {
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
  assert.match(
    errors.pop() ?? assert.fail('expected editor error'),
    /trusted local workspace/
  )
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
  assert.match(
    errors.pop() ?? assert.fail('expected editor error'),
    /only edit active content/
  )
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
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      })
  )
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const port = address.port
  setPort(port)
  await (
    commands.get('blogMdx.previewEditor') ??
    assert.fail('command not registered')
  )()
  await (
    commands.get('blogMdx.previewBrowser') ??
    assert.fail('command not registered')
  )()
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
  await (
    commands.get('blogMdx.previewEditor') ??
    assert.fail('command not registered')
  )()
  assert.deepEqual(opened, [])
  assert.match(errors[0], /Save the page/)
})
