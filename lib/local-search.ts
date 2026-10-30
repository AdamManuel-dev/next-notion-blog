export type LocalSearchPage = { id: string; slug: string; title: string }
export type LocalSearchResult = { id: string; title: string; href: string }

const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/** Searches the exported page index without requiring an API or Notion. */
export function searchLocalPages(
  query: string,
  pages: LocalSearchPage[],
  rootPageId?: string
): LocalSearchResult[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const phrase = terms.join(' ')
  const seen = new Set<string>()
  return pages
    .flatMap((page) => {
      const id = page.id.replace(/-/g, '')
      if (
        seen.has(id) ||
        !page.title.trim() ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)
      )
        return []
      seen.add(id)
      const title = normalize(page.title)
      if (!terms.every((term) => title.includes(term))) return []
      const isHome = rootPageId
        ? id === rootPageId.replace(/-/g, '')
        : page.slug === 'adam-manuel-s-dev-blog'
      return [
        {
          id: page.id,
          title: page.title,
          href: isHome ? '/' : `/${page.slug}`,
          rank: title === phrase ? 0 : title.startsWith(phrase) ? 1 : 2
        }
      ]
    })
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 20)
    .map(({ id, title, href }) => ({ id, title, href }))
}
