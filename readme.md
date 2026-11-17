# Adam Manuel’s Dev Blog

A statically exported Next.js blog. All 82 migrated pages are edited as topic-organized MDX files; Notion is not a runtime dependency or content service.

## Development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

### TypeScript environment

All maintained application, configuration, CLI, test, browser-script, and editor-extension sources are TypeScript. The package uses ESM (`"type": "module"`); `.mjs` files are not needed to opt into ESM. `tsx` runs Node tooling/tests on Node 22+, while `tsc --noEmit` independently checks every source under `strict: true` with JavaScript disabled. Next.js compiles the application and `next.config.ts`.

`npm ci` builds the JavaScript artifacts that browsers and editor hosts still require: theme/analytics scripts in `public/`, the CommonJS VS Code extension in `tools/mdx-editor/dist/`, and bundled MDX language-server plugins and preview helpers in `.generated/`. These outputs are ignored, not additional editable sources. `npm run runtime:build` regenerates them after editing their TypeScript sources; development, tests, packaging, and production builds also prepare them automatically. The editor's MDX plugin paths deliberately point at compiled JavaScript because its embedded runtime does not inherit the CLI's TypeScript loader.

CI validates Node 22 and 24. No global loader, `NODE_OPTIONS`, or extra environment variables are needed for TypeScript execution. Use the npm commands rather than launching `.ts` files with bare `node`.

## Content

```text
content/
  home/index.mdx
  posts/<topic>/<article>/index.mdx
  notes/<topic>/<page>/index.mdx
  notes/<topic>/<page>/<child>/index.mdx
```

Edit a page’s `index.mdx`, or create a folder and file to add a page. Frontmatter supplies the title, stable public slug, description, type, tags, and ordering. No manifest updates or publishing/conversion commands are needed.

The Pages Router discovers pages recursively and compiles trusted, self-contained MDX at build time. The page index powers search, homepage listings, navigation, related articles, and the sitemap. Existing Notion ID and UUID aliases remain available.

See **[the content authoring guide](content/README.md)** for frontmatter, supported MDX, assets, anchors, and source-recovery limitations.

## Validate

```sh
npm test
```

This runs lint, formatting, type checks, unit/content-integrity tests, and a production static export.

## Build and deploy

```sh
npm run build
npm start
```

Deploy `out/` to a static host. `npm start` previews the export on port 3000; `PORT` overrides it. There are no server API routes, ISR, or Notion/Firebase credentials to configure.

### LLM-readable content

Each build also generates plain-text Markdown at `/<slug>.md`, the homepage at `/index.md`, and a categorized index at `/llms.txt`. For example, `/cli-for-humans-and-agents.md` contains the article without the site UI. MDX-only interactive examples link back to the HTML page for their interactive behavior.

These files are generated from the same content as the HTML pages; do not edit them in `public/` or `out/`. Run `npm run build` to refresh them. Vercel and the local static preview serve them as `text/plain; charset=utf-8`. Other static hosts should configure the same content type for `.md` and `.txt` files.

`site.config.ts` contains site information and social accounts. Optional Fathom analytics uses `NEXT_PUBLIC_FATHOM_ID` in production; see `.env.example`. Page content and appearance belong in MDX frontmatter, not the site configuration.

## Project layout

- `pages/`: Pages Router entrypoints and static path/props generation.
- `lib/mdx-content.ts`: shared discovery, validation, indexing, and MDX compilation.
- `components/`: article layout, reader controls, search, outline, and error pages.
- `styles/`: shared theme and reader presentation.
- `public/content-assets/`: preserved local images and attachments.
- `scripts/`: static sitemap/robots generation and local export preview.
- `tests/`: active behavior and content-integrity tests.

Historical source archives and one-time migration tooling have been retired; earlier revisions remain available in Git history. Public URL and fragment compatibility remains part of the active pipeline.

## License and attribution

MIT. Originally based on [Travis Fischer’s Next.js Notion Starter Kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit); see [license](license). The current MDX/static content pipeline replaces its live Notion integration.
