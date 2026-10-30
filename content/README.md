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

Keep each page self-contained: Markdown, GFM, native JSX elements, and inline JSX expressions are supported. This pipeline does not bundle imported JSX/TSX components or watch imported helper modules; do not use MDX `import` statements for page content. Component imports would require a separate bundling/dependency-invalidation design.

The layout owns the page title: do not repeat it as an H1 in the body. Preserve explicit heading and block IDs when editing, as existing fragment links depend on them. Raw HTML must be JSX-compatible (`className`, self-closing `<img />`, object-valued `style`, escaped literal braces). Native `<details><summary>…</summary>…</details>` and tables are supported. Keep asset paths under `/content-assets/` initially.

The slugs `index`, `404`, and `500` are reserved for the static export and cannot be used for content.

The homepage engineering list, full page index, search/navigation, related reading, routes, and sitemap derive from MDX metadata. `order` controls index order, with slug as the deterministic tie-breaker. Only one `home` is allowed; duplicate IDs, slugs, and conflicting compatibility routes fail validation.

## Build and preview

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

`npm run test:unit` checks recursive discovery, frontmatter, aliases, addition/moves without manifest edits, current internal links/fragments, and assets. These checks allow normal editorial edits and new pages.

`npm run content:verify-migration` runs the separate, frozen historical comparison in `tests/migration/`: original 82-page coverage, heading/block anchors, prose, links, exact code, tables/disclosures, visual wrappers, artwork, and provenance. Run it when auditing this migration, not after intentional editorial changes (which naturally differ from the archive). Historical files are never read by the active pipeline or normal unit suite. Browser/export checks compare representative engineering articles, nested notes, and the homepage with the pre-migration export.
