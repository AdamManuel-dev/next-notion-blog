/* eslint-disable @typescript-eslint/no-require-imports -- VS Code loads a CommonJS entry point. */
const vscode = require('vscode')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function workspaceFor(document) {
  if (!vscode.workspace.isTrusted || document.uri.scheme !== 'file')
    throw new Error('Blog MDX tools require a trusted local workspace')
  const workspace = vscode.workspace.getWorkspaceFolder(document.uri)
  if (!workspace) throw new Error('Open the blog repository as a workspace')
  const root = workspace.uri.fsPath
  const directory = fs.realpathSync(path.join(root, 'content'))
  const file = fs.realpathSync(document.uri.fsPath)
  if (!file.startsWith(directory + path.sep) || !file.endsWith('.mdx'))
    throw new Error('Blog MDX tools only edit active content/*.mdx files')
  return root
}

function loadTool(root, name) {
  return import(pathToFileURL(path.join(root, 'lib', name)).href)
}

function activate(context) {
  const terminals = new Map()
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      { scheme: 'file', pattern: '**/content/**/*.mdx' },
      {
        async provideDocumentFormattingEdits(document, _options, token) {
          try {
            const root = workspaceFor(document)
            const version = document.version
            const source = document.getText()
            const { formatMdx } = await loadTool(root, 'mdx-format.mjs')
            const formatted = await formatMdx(source, {
              file: document.uri.fsPath
            })
            if (
              token.isCancellationRequested ||
              document.version !== version ||
              formatted === source
            )
              return []
            return [
              vscode.TextEdit.replace(
                new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(source.length)
                ),
                formatted
              )
            ]
          } catch (error) {
            vscode.window.showErrorMessage(`MDX formatting: ${error.message}`)
            return []
          }
        }
      }
    )
  )

  async function preview(where) {
    try {
      const editor = vscode.window.activeTextEditor
      if (!editor) throw new Error('Open an MDX content page first')
      const document = editor.document
      const root = workspaceFor(document)
      if (document.isDirty && !(await document.save()))
        throw new Error('Save the page before previewing')
      const { getContentPreview, probeContentPreview, waitForContentPreview } =
        await loadTool(root, 'content-preview.mjs')
      const port = vscode.workspace
        .getConfiguration('blogMdx', document.uri)
        .get('previewPort', 3000)
      const target = getContentPreview(document.uri.fsPath, { root, port })
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Starting MDX live preview…'
        },
        async () => {
          const state = await probeContentPreview(target)
          if (state === 'occupied')
            throw new Error(
              `Port ${port} belongs to another app or a failed build. Change Blog MDX: Preview Port or check the dev terminal.`
            )
          if (state === 'offline') {
            const key = `${root}:${port}`
            let terminal = terminals.get(key)
            if (!terminal || terminal.exitStatus !== undefined) {
              terminal = vscode.window.createTerminal({
                name: `MDX preview :${port}`,
                cwd: root
              })
              terminals.set(key, terminal)
              terminal.sendText(
                `npm run dev -- --hostname 127.0.0.1 --port ${target.port}`
              )
            }
            terminal.show(true)
          }
          await waitForContentPreview(target)
        }
      )
      if (where === 'editor')
        await vscode.commands.executeCommand('simpleBrowser.show', target.url, {
          viewColumn: vscode.ViewColumn.Beside,
          preserveFocus: true
        })
      else await vscode.env.openExternal(vscode.Uri.parse(target.url))
    } catch (error) {
      vscode.window.showErrorMessage(`MDX preview: ${error.message}`)
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('blogMdx.previewEditor', () =>
      preview('editor')
    ),
    vscode.commands.registerCommand('blogMdx.previewBrowser', () =>
      preview('browser')
    ),
    {
      dispose: () => {
        for (const terminal of terminals.values()) terminal.dispose()
      }
    }
  )
}

module.exports = { activate }
