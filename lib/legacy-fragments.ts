export type FragmentAliases = Readonly<Record<string, string>>

/** Structural browser ports keep fragment resolution usable without a full DOM. */
export interface FragmentAncestor {
  readonly tagName: string
  readonly parentElement: FragmentAncestor | null
  setAttribute(name: string, value: string): void
}
export interface FragmentTarget {
  readonly id: string
  readonly parentElement?: FragmentAncestor | null
  scrollIntoView(): void
}
export interface FragmentArticle<
  Target extends FragmentTarget = FragmentTarget
> {
  readonly parentElement?: FragmentAncestor | null
  readonly isConnected: boolean
  querySelectorAll(selector: string): Iterable<Target>
}

/** Shared by URL fragments and saved reading positions; never follows prototypes. */
export function resolveFragmentId(
  id: string,
  aliases?: FragmentAliases
): string {
  if (!aliases) return id
  if (Object.prototype.hasOwnProperty.call(aliases, id)) return aliases[id]
  // Historical reading positions stored a Notion CSS class, not just its ID.
  const legacy = /^notion-block-([a-f0-9]{32})$/.exec(id)?.[1]
  return legacy && Object.prototype.hasOwnProperty.call(aliases, legacy)
    ? aliases[legacy]
    : id
}

export function findArticleFragment<Target extends { readonly id: string }>(
  article: { querySelectorAll(selector: string): Iterable<Target> },
  id: string,
  aliases?: FragmentAliases
): Target | null {
  const canonical = resolveFragmentId(id, aliases)
  if (!canonical) return null
  // Compare IDs directly: arbitrary fragments must never become CSS selectors.
  for (const block of article.querySelectorAll('[id]')) {
    if (block.id === canonical) return block
  }
  return null
}

/** Hidden blocks must be revealed before either hash scrolling or resume measurement. */
export function revealFragmentAncestors(
  target: Pick<FragmentTarget, 'parentElement'>,
  article: Pick<FragmentArticle, 'parentElement'>
): void {
  for (
    let parent = target.parentElement;
    parent && parent !== article;
    parent = parent.parentElement
  ) {
    if (parent.tagName === 'DETAILS') parent.setAttribute('open', '')
  }
}

export type FragmentBrowser = {
  location: Pick<Location, 'hash' | 'pathname' | 'search'>
  history: Pick<History, 'state' | 'replaceState'>
  requestAnimationFrame(callback: (time: number) => void): number
  cancelAnimationFrame(id: number): void
  addEventListener(type: 'hashchange', listener: () => void): void
  removeEventListener(type: 'hashchange', listener: () => void): void
}

/** Defers until injected HTML and the router's own hash scrolling have settled. */
export function attachLegacyFragmentResolver({
  browser,
  getArticle,
  aliases,
  subscribeNavigation
}: {
  browser: FragmentBrowser
  getArticle(): FragmentArticle | null
  aliases?: FragmentAliases
  subscribeNavigation?: (schedule: () => void) => () => void
}): () => void {
  let frame: number | undefined
  const resolve = () => {
    frame = undefined
    const article = getArticle()
    const { hash, pathname, search } = browser.location
    if (!article?.isConnected || !hash) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return
    }
    // Canonical and unknown fragments remain entirely native browser links.
    const canonical = resolveFragmentId(id, aliases)
    if (canonical === id) return
    const target = findArticleFragment(article, id, aliases)
    if (!target) return
    revealFragmentAncestors(target, article)
    target.scrollIntoView()
    browser.history.replaceState(
      browser.history.state,
      '',
      `${pathname}${search}#${encodeURIComponent(canonical)}`
    )
  }
  const schedule = () => {
    if (frame !== undefined) browser.cancelAnimationFrame(frame)
    frame = browser.requestAnimationFrame(resolve)
  }
  browser.addEventListener('hashchange', schedule)
  const unsubscribe = subscribeNavigation?.(schedule)
  schedule()
  return () => {
    if (frame !== undefined) browser.cancelAnimationFrame(frame)
    browser.removeEventListener('hashchange', schedule)
    unsubscribe?.()
  }
}
