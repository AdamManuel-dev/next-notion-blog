# Adam Manuel’s Dev Blog

A statically exported Next.js blog. All 82 migrated pages are edited as topic-organized MDX files; Notion is not a runtime dependency or content service.

## Development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

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

The optional frozen migration comparison checks the initial MDX content against historical sources:

```sh
npm run content:verify-migration
```

That comparison is intentionally separate from ordinary authoring tests: editorial changes should not require changing the historical archive.

## Build and deploy

```sh
npm run build
npm start
```

Deploy `out/` to a static host. `npm start` previews the export on port 3000; `PORT` overrides it. There are no server API routes, ISR, or Notion/Firebase credentials to configure.

`site.config.js` contains site information and social accounts. Optional Fathom analytics uses `NEXT_PUBLIC_FATHOM_ID` in production; see `.env.example`. Page content and appearance belong in MDX frontmatter, not the site configuration.

## Project layout

- `pages/`: Pages Router entrypoints and static path/props generation.
- `lib/mdx-content.mjs`: shared discovery, validation, indexing, and MDX compilation.
- `components/`: article layout, reader controls, search, outline, and error pages.
- `styles/`: shared theme and reader presentation.
- `public/content-assets/`: preserved local images and attachments.
- `scripts/`: static sitemap/robots generation and local export preview.
- `tests/`: active behavior and integrity tests; `tests/migration/` contains frozen migration checks.
- `legacy/content/` and `legacy/blog-drafts/`: historical evidence, never active build inputs.

## License and attribution

MIT. Originally based on [Travis Fischer’s Next.js Notion Starter Kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit); see [license](license). The current MDX/static content pipeline replaces its live Notion integration.
