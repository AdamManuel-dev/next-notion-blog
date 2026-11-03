# Blog MDX: Format and Preview

Workspace-local authoring tools for [next-notion-blog](https://github.com/AdamManuel-dev/next-notion-blog). This is not a general-purpose MDX formatter.

## Install

From the repository root, with Node.js 22+ and dependencies installed:

```sh
npm run content:install-editor
```

This opt-in command downloads the official pinned `@vscode/vsce` packaging tool, creates `.generated/mdx-content-tools.vsix`, and installs it using the `code` CLI. If `code` is unavailable, run `npm run content:package-editor`, then use **Extensions: Install from VSIX…**. Reload VS Code after installation. The extension is local, not published to the Marketplace.

Alternatively, select **MDX authoring extension (development)** in Run and Debug and press F5. Use the new Extension Development Host window to test the tools without installing them.

## Format

Open a `content/**/*.mdx` file and use **Format Document**, or save it. Workspace settings select this extension as the MDX formatter. Install the recommended MDX language extension (`unifiedjs.vscode-mdx`) for syntax highlighting and language diagnostics.

Formatting uses the repository's parser and `lib/mdx-format.mjs`. It formats safe ordinary Markdown blocks, not every construct. Code examples, frontmatter, JSX, strict JSON props, stable-ID markers, hard breaks, directives and complex containers are preserved verbatim. It removes insignificant trailing whitespace in ordinary blocks and redundant blank lines between complete top-level blocks, keeping one empty separator line. It also removes surplus document-edge blank lines without adding a final newline where none existed. Indentation and whitespace inside protected blocks are untouched. Candidates that would change the parsed document are left unchanged. It does not compile or execute MDX; rendered-output invariants are verified separately in regression tests.

## Language diagnostics

Formatting and diagnostics are separate: this extension formats documents; `unifiedjs.vscode-mdx` provides language diagnostics. The repository's `tsconfig.json` configures its remark plugins for YAML frontmatter, GFM, callouts and pinned `{#id}` markers. Keep `content/**/*.mdx` in `include` so the language server selects that configuration instead of an inferred project. Real malformed JSX and expressions still produce errors; diagnostics are not disabled.

After installing dependencies or updating this configuration, run **Developer: Reload Window** if old acorn errors remain on valid markers.

## Preview

With a saved content `index.mdx` open, choose:

- **Blog MDX: Preview Current Page in VS Code** — opens the actual site alongside the source using VS Code's built-in Simple Browser.
- **Blog MDX: Preview Current Page in Browser** — opens the same route in your system browser.

The commands start a local Next.js development terminal if needed, resolve the route from frontmatter, and reuse an existing server only when its homepage belongs to this content tree. Both previews update when files are saved, using the site's existing content watcher and hot reload. Unsaved typing is not previewed. Callouts, aliases, styles and interactive components use the real application renderer.

Set **Blog MDX: Preview Port** (`blogMdx.previewPort`, default `3000`) if another app uses that port. Close the managed terminal to stop the server. The extension does not stop independently started servers.

## Trust and limitations

The extension only operates on local active content in a trusted workspace. It loads tools from that workspace; review repository code before trusting it. It requires the repository dependencies and layout. Preview compilation treats MDX as executable repository code, exactly like `npm run dev`. Do not preview untrusted MDX.

If the embedded browser is unavailable, enable VS Code's built-in **Simple Browser** extension or use the external browser command. Renaming a page's slug requires reopening its preview route.
