# Historical content evidence — not a build input

The active, editable pages are `../../content/**/index.mdx`.

This archive preserves the pre-MDX migration sources unchanged:

- `pages/`: 82 HTML bodies, generated Markdown copies, and JSON metadata.
- `manifest.json`: original IDs, stable public slugs, crawl failures, and asset failures.
- `appearance.json`: recovered original covers, icons, and crop positions.
- `notion-source/`: 52 compressed browser snapshots and the crawl inventory.
- `../blog-drafts/`: original 30 engineering articles, editorial material, and previously excluded drafts.

Do not edit these files to change the website. The import, HTML conversion, Markdown generation, and draft-publication scripts have been retired. There is no manifest or HTML-generation step in the active build.

## Migration gate

Before archiving these sources:

- All 82 MDX files compiled and all existing route aliases exported.
- The 11 frozen migration tests passed: IDs, slugs, provenance, text, link destinations, headings/block anchors, code, tables, disclosures, image/callout/table wrappers, inline emphasis, and recovered artwork.
- The 63 current unit tests, lint, type checks, formatting, and production export passed.
- Visible Chromium checked all 82 canonical URLs and compatibility aliases, plus desktop/mobile rendering, search navigation, anchors, disclosures, and loaded images.
- Six visual representatives included the homepage, Business Rules, MongoDB Indexes, MongoDB Optimization, Express Architecture, and its nested setup guide. Setup-guide captures were pixel-identical; minor rendering-height differences remain on MongoDB Optimization (approximately -18px desktop / +9px mobile), without missing content or broken layout. The homepage post-list expansion is intentional and metadata-driven.

Temporary browser evidence is under `/tmp/next-notion-blog-mdx-baseline/` and `/tmp/next-notion-blog-mdx-after/` for this session. These are local evidence paths, not published site assets.

To repeat the frozen comparison before making intentional editorial changes:

```sh
npm run content:verify-migration
```

Normal authoring uses `npm run test:unit` and `npm run build`; those do not read this archive. See `../../content/README.md` for the supported MDX workflow and known original Notion extraction gaps.
