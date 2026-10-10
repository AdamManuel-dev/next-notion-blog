export type RelatedPage = { id: string; title: string; href: string }
const words = (title: string) =>
  new Set(
    title
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(
        (word) =>
          word.length > 2 &&
          !['the', 'and', 'for', 'with', 'how', 'your', 'from'].includes(word)
      ) || []
  )
export function selectRelatedPages(
  current: { id: string; title: string },
  candidates: RelatedPage[]
): RelatedPage[] {
  const terms = words(current.title)
  const unique = new Map<string, RelatedPage>()
  for (const page of candidates) {
    if (
      page.id.replace(/-/g, '') !== current.id.replace(/-/g, '') &&
      page.title.trim() &&
      page.href.startsWith('/') &&
      !page.href.startsWith('//')
    )
      unique.set(page.id.replace(/-/g, ''), page)
  }
  return [...unique.values()]
    .map((page) => ({
      page,
      score: [...words(page.title)].filter((word) => terms.has(word)).length
    }))
    .sort(
      (a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title)
    )
    .slice(0, 3)
    .map(({ page }) => page)
}
