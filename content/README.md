# MDX content

Every page has one editable source: its `index.mdx`. The initial collection contains **82 pages** (30 engineering posts and 52 recovered Notion pages, including the homepage).

```text
content/
  home/index.mdx
  posts/<topic>/<article>/index.mdx
  notes/<topic>/<page>/index.mdx
  notes/<topic>/<page>/<child>/index.mdx
```

Folders organize editing, not public URLs. Move a folder without changing its `slug` or `id` to retain its routes. Internal page links use public URLs (`/a-new-article#section`), not filesystem-relative `.mdx` paths.

## Edit or add a page

Edit the appropriate `index.mdx`. To add a page, create a folder and file; **do not update a manifest**.

```mdx
---
title: A new article
slug: a-new-article
description: A concise summary for search engines and sharing.
type: post
tags: [architecture, react]
order: 100
---

## First section

Write Markdown, fenced code, GFM tables, and MDX-compatible JSX here.
```

Required frontmatter: nonempty `title`, URL-safe `slug`, `description`, `type` (`home`, `post`, or `note`), string-array `tags`, and numeric `order`. Exactly one page must have `type: home`. Keep existing IDs unchanged; new pages can omit `id` and receive a stable slug-derived ID. Optional appearance/provenance fields include `id`, `sourceUrl`, `cover`, `icon`, and `coverPosition` (0–1). Migrated files retain their original IDs, source URLs, and local assets.

Keep each page self-contained: Markdown, GFM, native JSX elements, and inline JSX expressions are supported. Do not use top-level MDX `import` statements for page content. Interactive examples use registered component tags below; ordinary MDX still renders to static HTML.

Prefer native Markdown for headings, paragraphs, lists, emphasis, links, images, and tables with a real header row. The layout owns the page title: do not repeat it as an H1 in the body.

Pin a stable, readable heading permalink with a trailing `{#slug}` marker:

```mdx
## Technical deep dive {#technical-deep-dive}
```

This build-time Markdown extension sets the heading's canonical HTML ID and table-of-contents link. Prefer lowercase, hyphen-separated words. The marker must be the last heading content, outside links, emphasis, or inline code. Code examples and escaped markers are left literal. Headings without markers receive deterministic text-based slugs during compilation, with numeric suffixes for duplicates; explicit IDs and compatibility aliases are reserved first. Pin the generated name before publishing a permalink that must survive later text edits.

Paragraphs also accept trailing `{#id}` markers. Keep the marker outside links, emphasis, and inline code:

```md
A paragraph with a stable deep link. {#stable-deep-link}
```

Use ordinary contiguous Markdown lists for related items. Pin an individual item with a **leading** marker after its bullet or number:

```md
- {#first-resource} First resource
- {#second-resource} Second resource

1. {#first-step} First step
2. {#second-step} Second step
```

The prefix belongs at the beginning of the item's first paragraph and sets the real `<li>` ID without adding an anchor or paragraph wrapper. A trailing `{#id}` still addresses its paragraph independently. Do not put `{/* */}` between items merely to preserve historical single-item list containers: that splits numbering and adds list margins. Keep genuine section boundaries, nested ownership and multi-paragraph items intact.

Do not add standalone anchors. During compilation, actual content blocks receive deterministic readable IDs directly: headings, paragraphs, code blocks, lists, quotes, callouts, and other supported block elements. Authored IDs win; collisions receive deterministic numeric suffixes. No empty compatibility `<a>` elements are emitted.

`fragment-aliases.json` stores original Notion IDs, former `local-heading-N` names, and previously published standalone-anchor slugs outside editable page sources, keyed by stable page ID and canonical slug. Multiple old fragments can resolve to the same actual block. The build sends only the current page's flattened alias map to the browser. On load, hash changes, and client-side navigation, the reader resolves an old fragment, scrolls to its canonical target, and replaces the URL fragment without adding a history entry. Saved reading positions use the same mapping.

Canonical readable links work natively without JavaScript. **Legacy fragments require JavaScript**; the page still loads without it, but old fragments cannot scroll to a removed anchor. Pinned IDs survive text edits and file moves. Automatically derived names can change when their source text or duplicate ordering changes; use explicit readable markers for published links that must remain stable. Keep alias entries intact and pointed at real targets. To deliberately rename a published slug, move its aliases to the new slug and add the former readable slug to that alias list.

Use callout directives instead of id-only `<section>` wrappers:

```md
> :::callout{#database-architecture-callout}
>
> Callout content, including **Markdown** formatting.
>
> :::
```

A callout compiles to a `<section>` and retains its ID and children. For nested callouts, make the outer colon fence longer than the inner fence (`::::` around `:::`). Callout container directives accept an optional `{#slug}` and no label or extra attributes. Omitting the marker generates an ID from content at build time. Directives occupy standalone block lines; inline colons retain ordinary Markdown behavior. Literal examples belong in code fences or inline code.

Use `![Alt text](/content-assets/image.png)` for ordinary images. Standalone Markdown images render as lazy-loaded figures, preserving the reader's existing image spacing. Inline images remain inline; native `<img />` remains available for special attributes.

Keep native HTML/JSX only where Markdown cannot faithfully express the structure or attributes: disclosures (`<details>`/`<summary>`), sections with additional semantic attributes, headerless or merged-cell tables, and special inline formatting. HTML must remain JSX-compatible (`className`, self-closing void elements, object-valued `style`, escaped literal braces). Keep local asset paths unchanged.

Retained native HTML headings, inline elements, and list items are normalized to avoid extra Markdown paragraph wrappers. An addressed implicit paragraph inside these native hosts keeps its target on a `<span>` instead of losing the ID during unwrapping. Use explicit `<p>` tags for intentionally multi-paragraph HTML list items; ordinary Markdown paragraphs and lists are unchanged.

MDX is excluded from stock Prettier; use the schema-aware formatter below instead. It formats safe ordinary Markdown while preserving frontmatter, code examples, JSX/JSON props, stable-ID markers, hard breaks and custom directives. Complex blocks are deliberately left unchanged rather than risk changing content. Historical archives are never formatted. EditorConfig also preserves meaningful MDX trailing spaces.

The slugs `index`, `404`, and `500` are reserved for the static export and cannot be used for content.

The homepage engineering list, full page index, search/navigation, related reading, routes, and sitemap derive from MDX metadata. `order` controls index order, with slug as the deterministic tie-breaker. Only one `home` is allowed; duplicate IDs, slugs, and conflicting compatibility routes fail validation.

## React components in Markdown

Place approved component tags on their own lines between Markdown paragraphs. No MDX import statement is required:

```mdx
Some Markdown above.

<Counter id='my-counter' initialCount={3} />

<Diagram id='my-diagram' active={1} />

More Markdown below.
```

`Counter` accepts an optional finite numeric `initialCount`; `Diagram` accepts an optional `active` stage index (0–2). Both are interactive, isolated client islands. `id` pins the static container's permalink and is not passed as a component prop. Omit it for an automatically generated ID. Quoted JSX attributes and strict JSON expressions are supported when the registered prop schema permits them. Inside `{...}`, use double-quoted strings and object keys (for example, `label={"hello"}` or `options={{"enabled": true}}` when those props are registered). Single-quoted JavaScript strings, unquoted object keys, comments, trailing commas, non-finite numbers, and unsafe property names are rejected. Duplicate JSON keys follow standard JSON parsing: the last value wins. Arbitrary expressions, callbacks, spreads, children, unknown props, and inline component tags within prose are also rejected with source diagnostics. Use native HTML for static layout and prose.

The explicit public registry in `lib/live-components.mjs` controls component names, approved module paths, and prop validation. `components/live/widgets.ts` holds the matching literal lazy imports; a test checks that both registrations agree. Add a component implementation under `components/live/`, register its name and supported props, add its lazy import, then use its tag in MDX. Components are trusted application code; registry changes must be reviewed like other code changes. Each usage becomes a component-plus-props descriptor. Repeated counters share their component code but keep independent state. There is no generated widget registry or handwritten page manifest.

Example: [registered components](/react-live-components).

### Adding an interactive example

Implement the example as a default-exported React component under `components/live/`, then register its module and supported literal props in `lib/live-components.mjs` and its lazy import in `components/live/widgets.ts`. Next.js bundles and type-checks these components as normal application code. All code fences are displayed examples, never executable modules; the former `live` fence marker is rejected with a migration diagnostic.

The optional `id` is a lowercase readable identifier (letters, digits, hyphens; starts with a letter; at most 80 characters) and becomes the container's permalink. Omit it for a source-derived ID; pin it before publishing a link that must survive edits. IDs must not collide with other addressed content on the page. Identical unnamed tags receive numeric suffixes and have independent state.

`npm run dev` watches content edits, additions, and deletions and updates an independent refresh token in ignored `.generated/content-revision.ts`, so Next.js refreshes filesystem-backed static props. `npm run build` and `npm run test:types` create this token automatically; `npm run content:generate-revision` updates it manually. This small tool only hashes content; it does not discover widgets, compile MDX, or generate imports. MDX compilation validates tags and props and reports the originating MDX file and line. Components are trusted application code, not sandboxed user submissions; review them accordingly and never put secrets in browser code.

Each instance loads near the viewport and renders through a React portal into its static container. React owns widget mounting and cleanup; portals inherit the surrounding application's context and React event bubbling. Ordinary articles do not load the controller, registry, or component chunks. State resets on page navigation or article HTML changes, not reader preference changes. Each instance has isolated loading/error handling. **View source** shows the authored component tag even without JavaScript. The static container retains its deep link before loading. Widgets are client-mounted, not server-rendered; interactive results are unavailable to no-JavaScript readers and search crawlers.

Examples: [registered components](/react-live-components), [counter](/react-live-counter), and [interactive pipeline diagram](/react-live-pipeline-diagram), all under `content/notes/react/`.

## Formatting and live preview

Format a specific file, or check the active collection without changing it:

```sh
npm run content:format -- content/notes/react/live-components/index.mdx
npm run content:format:check
# Bulk formatting is opt-in; review the diff afterward:
npm run content:format -- --all
```

The formatter parses the same GFM, callout and `{#id}` syntax as the site, never executes MDX, and leaves unsupported/unsafe-to-reformat blocks verbatim. It preserves ordinary prose line wrapping, removes insignificant trailing whitespace from ordinary blocks, and collapses redundant blank lines between complete top-level blocks to one empty line. Extra document-edge blank lines are removed while keeping the existing final-newline convention. Indentation, hard breaks and whitespace inside protected blocks remain untouched. Every proposed change must preserve the complete parsed document; regression tests also verify identical rendered HTML, aliases and live-component descriptors. Existing content is not bulk-reformatted by setup or the normal test suite. A check may report existing style differences until you deliberately format those files.

For browser preview, run:

```sh
npm run content:preview -- content/notes/react/live-components/index.mdx
# If another app uses port 3000:
npm run content:preview -- content/notes/react/live-components/index.mdx --port 3100
```

This starts the Next.js development server if needed, opens the page's actual frontmatter route, and refreshes on save. Stop a server started by this command with Ctrl+C. `--print` only prints the URL without starting a server or opening a browser; `--no-open` starts/reuses the server without opening a browser. `npm run dev` remains available for manually managed development sessions; `npm start` below serves a static export and does **not** provide live updates.

### VS Code

```sh
npm run content:install-editor
```

This packages and installs the workspace-local **Blog MDX: Format and Preview** extension using the `code` CLI. Packaging downloads the official pinned VS Code packaging tool on first use; it does not add runtime dependencies. If the CLI is unavailable, run `npm run content:package-editor` and use **Extensions: Install from VSIX…** with `.generated/mdx-content-tools.vsix`. Reload the editor after installing.

Workspace settings enable **Format Document** and MDX format-on-save with the safe formatter. Install the recommended MDX language extension (`unifiedjs.vscode-mdx`) for highlighting and language diagnostics. With a content page open, run **Blog MDX: Preview Current Page in VS Code** for a side-by-side embedded view, or **Blog MDX: Preview Current Page in Browser**. Both run the real site—including callouts and interactive components—and update when you save. Set `blogMdx.previewPort` if port 3000 is occupied. Reopen the preview after changing a slug. Unsaved typing is not previewed.

The MDX language server uses `tsconfig.json`'s `mdx.plugins` for YAML frontmatter, GFM, callouts and `{#id}` markers. `content/**/*.mdx` must also remain in `include`; otherwise the editor uses an inferred project that does not know our syntax. Real JSX/expression syntax errors remain enabled. If valid markers still show “Could not parse expression with acorn”, run **Developer: Reload Window** after installing dependencies. The formatter extension does not suppress language-server diagnostics.

The extension only runs in trusted local workspaces. VS Code tasks also provide formatting, checks, and browser preview without installing the extension. The **MDX authoring extension (development)** launch configuration runs an isolated Extension Development Host for testing. See [`tools/mdx-editor/README.md`](../tools/mdx-editor/README.md) for details.

## Build and static preview

```sh
npm ci
npm run test:unit
npm run build
npm start
```

The Pages Router recursively discovers `index.mdx` files and compiles them **at build time** to static article HTML. The existing article layout and table of contents are reused; no client-side MDX compiler, Notion API, manual manifest, or App Router is involved. `next build` exports to `out/`; deploy that directory to a static host. `npm start` previews it on port 3000 (`PORT` overrides it).

MDX is **trusted executable repository code**, not sanitized user input. Review content contributions like code. Do not compile untrusted MDX. Original ID, hyphenated UUID, and slug-plus-ID compatibility routes are retained alongside clean canonical URLs; the homepage remains `/`.

## Historical evidence

`../legacy/content/` retains original HTML, generated Markdown, metadata, appearance data, manifest, and compressed Notion snapshots. `../legacy/blog-drafts/` retains original engineering drafts and editorial/support material. They are archival evidence **outside the active content tree**, not build inputs. Do not edit them to change the website. The former import/conversion/publication commands have been retired; there is no second editable publication copy.

The migration preserves pre-existing source gaps: five conversion warnings across MongoDB Optimization, MongoDB Official Documentation, and Making CRDTs Byzantine Fault Tolerant; some file/PDF/embed blocks expose only recovered text or source links. The unavailable standalone Notion database was captured as an inline table, not an extra page. Archive metadata retains crawl failures and warnings; MDX retains visible warning markers. This migration does not claim to recover missing original Notion material.

## Validation

`npm run test:unit` checks recursive discovery, frontmatter, aliases, addition/moves without manifest edits, current internal links/fragments, assets, Markdown-native headings/images, block-ID/callout syntax, deterministic fragment naming, and compatibility aliases. These checks allow normal editorial edits and new pages; HTML-only attributes and complex image structures remain supported.

Completed source migrations are isolated under `scripts/migrations/`, with their tests under `tests/migration/tooling/`; they are not part of normal rendering or the unit suite. See `scripts/migrations/README.md` for historical commands and verification. Production content must address real blocks directly and keep former fragments in `fragment-aliases.json`, not standalone compatibility anchors.

`npm run content:verify-migration` runs the separate, frozen historical comparison in `tests/migration/`: original 82-page coverage, legacy fragments resolving through the alias map to actual blocks, prose, links, exact code, tables/disclosures, visual wrappers, artwork, and provenance. Run it when auditing this migration, not after intentional editorial changes (which naturally differ from the archive). Historical files are never read by the active pipeline or normal unit suite. Browser/export checks compare representative engineering articles, nested notes, and the homepage with the pre-migration export.
