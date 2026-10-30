import fs from 'node:fs'
import path from 'node:path'

export interface LocalPageSummary {
  id: string
  slug: string
  title: string
}

export interface LocalPageContent extends LocalPageSummary {
  html: string
  cover: string | null
  icon: string | null
  coverPosition: number
  sourceUrl: string
}

interface ContentManifest {
  rootId: string
  pages: LocalPageSummary[]
}

const contentDirectory = path.join(process.cwd(), 'content')

function getManifest(): ContentManifest {
  return JSON.parse(
    fs.readFileSync(path.join(contentDirectory, 'manifest.json'), 'utf8')
  )
}

export function getLocalPages(): LocalPageSummary[] {
  return getManifest().pages
}

export function getLocalPaths(): string[] {
  const { rootId, pages } = getManifest()
  return pages.flatMap((page) => {
    const uuid = page.id.replace(
      /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/,
      '$1-$2-$3-$4-$5'
    )
    // Keep direct Notion IDs and the starter kit's development URLs working.
    const aliases = [page.id, uuid, `${page.slug}-${page.id}`]
    return page.id === rootId ? aliases : [page.slug, ...aliases]
  })
}

export function getLocalPage(identifier?: string): LocalPageContent | null {
  const { rootId, pages } = getManifest()
  const page = pages.find((entry) =>
    identifier
      ? entry.slug === identifier ||
        entry.id === identifier.replaceAll('-', '') ||
        `${entry.slug}-${entry.id}` === identifier
      : entry.id === rootId
  )
  if (!page) return null
  // Only manifest-owned slugs ever become filesystem paths.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) {
    throw new Error(`Invalid content slug: ${page.slug}`)
  }
  const filename = path.join(contentDirectory, 'pages', page.slug)
  const metadata = JSON.parse(fs.readFileSync(`${filename}.json`, 'utf8'))
  const appearance =
    JSON.parse(
      fs.readFileSync(path.join(contentDirectory, 'appearance.json'), 'utf8')
    ).pages[page.id] || {}
  return {
    ...page,
    html: fs.readFileSync(`${filename}.html`, 'utf8'),
    cover: metadata.cover ?? appearance.cover ?? null,
    icon: metadata.icon ?? appearance.icon ?? null,
    coverPosition: metadata.coverPosition ?? appearance.coverPosition ?? 0.5,
    sourceUrl: metadata.sourceUrl
  }
}
