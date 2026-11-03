import Router from 'next/router'
import * as React from 'react'
import {
  attachLegacyFragmentResolver,
  type FragmentAliases
} from 'lib/legacy-fragments'

export function useLegacyFragments(
  articleRef: React.RefObject<HTMLElement>,
  pageId: string,
  html: string,
  aliases?: FragmentAliases
) {
  React.useEffect(
    () =>
      attachLegacyFragmentResolver({
        browser: window,
        getArticle: () => articleRef.current,
        aliases,
        subscribeNavigation: (schedule) => {
          // Next uses history APIs for hash navigation, which need not emit a
          // native hashchange. Completion also runs after its scroll-to-top.
          Router.events.on('hashChangeComplete', schedule)
          Router.events.on('routeChangeComplete', schedule)
          return () => {
            Router.events.off('hashChangeComplete', schedule)
            Router.events.off('routeChangeComplete', schedule)
          }
        }
      }),
    [articleRef, pageId, html, aliases]
  )
}
