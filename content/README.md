# Filesystem content migration

The site now builds from checked-in content, not the Notion API. The first Playwright crawl captured **52 public pages** and downloaded **25 assets** from the root page and its same-site links. This is a first migration pass, not a claim that every Notion block or attachment has been reproduced perfectly.

## Run the static site

```sh
npm ci
npm run build
npm start
```

`next build` exports the entire site to `out/`. Deploy that directory to any static host. `npm start` previews it on localhost:3000 (`PORT` overrides the port). No Notion access is needed for builds or page requests. Articles use `getStaticProps`, enumerated `getStaticPaths`, and `fallback: false`; there is no ISR.

## Edit content

- `pages/{slug}.html`: editable semantic article body (no Notion markup); still the source used to render the website.
- `pages/{slug}.md`: generated Markdown counterpart with YAML frontmatter (title, ID, slug, source URL, extraction time and cover), a page heading, local asset links, and preserved block anchors. These are preparatory copies for a future MDX migration, not active routes.
- `pages/{slug}.json`: title/source metadata, block count and conversion warnings.
- `manifest.json`: page IDs, route slugs, titles and crawl/asset failures. Update the title here when changing a page title; the manifest is authoritative for routing and displayed titles.
- `../public/content-assets/`: downloaded images/attachments used by the HTML.
- `notion-source/{id}.json.gz`: compressed original browser DOM blocks and visible text, retained for recovery and comparison.
- `notion-source/crawl.json`: original crawl inventory and failures.

To add a page, add its HTML and JSON files and an entry in `manifest.json`. Only manifest-owned slugs can be loaded. Treat HTML as trusted repository source: the importer emits an allowlisted semantic subset, but manual edits are not automatically sanitized. Do not paste untrusted scripts/HTML.

The **30 active articles** under `../blog-drafts/` are now published alongside the 52 migrated Notion pages (**82 total pages**). Editorial/support files and `blog-drafts/archive/` are not published.

## Publish or refresh the engineering articles

```sh
npm run content:publish-drafts
npm run build
```

The publisher reads top-level article `.md` files from `blog-drafts/`, renders and sanitizes HTML, preserves heading jump targets, and creates published HTML/JSON/Markdown copies in `content/pages/`. It adds a visible **Engineering articles** section to the homepage in the README's editorial ranking order and registers each route in the manifest and sitemap.

Original drafts remain intact, including their historical `status: draft` frontmatter. Published copies have `status: published`, description/tags, and a `sourceFile` reference. Edit the originals and rerun the publishing command to refresh them; generated publication copies will be overwritten. Builds do not automatically republish source drafts. `npm run content:convert` republishes these articles after reconverting Notion so they are not lost from the manifest.

## Generate Markdown copies

```sh
npm run content:markdown
```

This works offline, converting every manifest page's existing HTML and metadata to a sibling `.md` file. Standard headings, emphasis, links, lists, fenced code and supported tables become Markdown. Collapsible sections and tables without a suitable header remain raw HTML to avoid losing content. Block anchors are kept as HTML anchors so existing fragment links can still resolve. Existing source migration gaps also remain in the Markdown; conversion does not recover missing Notion content.

**HTML remains authoritative for rendering.** No MDX tooling or rendering has been added. Builds do not regenerate these files; run this command after editing HTML. Regeneration overwrites `.md` files, so keep any Markdown-only editorial changes backed up. `npm run content:convert` also regenerates Markdown after converting the browser archive.

## Repeat the browser migration

```sh
npx playwright install chromium
npm run content:import
npm run content:convert
npm run test:unit
npm run build
```

These launch a visible Chromium browser. The importer navigates public pages, scrolls through Notion's virtualized content, opens rendered toggle blocks, and follows same-site page links. The converter reads the captured DOM and uses the browser request context to download media; it does not use the Notion API. External embeds become links rather than runtime embeds.

`TARGET_URL` overrides the public root URL for import (or the origin used to resolve relative links for conversion). `OUTPUT` overrides the import directory; `INPUT` overrides the converter input directory. Defaults use `content/notion-source/`. Review the git diff after importing: **conversion overwrites local page bodies and metadata**, so do not run it over editorial changes without a backup. Stale pages/assets are not automatically deleted.

## Known follow-up work

- Standalone database URL `4801d99fd24e4a75b053c2eac9bbb4ce` did not expose a normal page. Its visible inline rows were captured as a local HTML table within **MongoDB Optimization**, but standalone database pages and other views were not exported.
- Five conversion warnings remain across **MongoDB Optimization**, **MongoDB Official Documentation**, and **Making CRDTs Byzantine Fault Tolerant**. File/PDF/smart-embed blocks may only have text or a link back to the source. Inspect each page's JSON `warnings` and the original DOM archive before considering these complete.
- Downloaded image failures are recorded in `manifest.json` (`assetFailures` is currently empty). Alt text is preserved where the source provided it; many source images had empty alt text.
- Original Notion IDs, UUIDs and slug-plus-ID routes are generated as compatibility pages. Canonical tags point to clean local routes. Arbitrary historical title slugs are not automatically inferred.
- Old server API handlers are retained under `../legacy/api/` for reference, outside Next.js routing. Search, deployment webhooks and Notion's interactive widgets are not active in the static reader. Sitemap and robots files are generated locally before builds.
- Original Notion components/dependencies are retained for now, including existing uncommitted UI work; the homepage/article routes no longer use them. The new reader prioritizes content preservation over visual parity.

## Checks

`tests/markdown-content.test.mjs` checks Markdown metadata, formatting, anchors, local links/images, safe code fences, lists, retained tables/disclosures, and generated-file freshness for every page.

`tests/publish-drafts.test.mjs` checks active-draft coverage, homepage links, source preservation, heading targets, safe HTML conversion, archive/support-file exclusion and repeatable publication.

`tests/local-content.test.mjs` checks archive coverage, local routes and compatibility identifiers, unknown-page handling, local image files, internal links, unsafe imported markup, and visible warning markers. Browser smoke tests should also cover long code-heavy articles, mobile overflow and a network-blocked visit to the exported site.
