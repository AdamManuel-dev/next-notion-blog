// Global stylesheets, ordered by increasing specificity of intent. Each later
// sheet is allowed to win over the ones above it.

// base element styles shared across the entire site
import 'styles/global.css'

// used for code syntax highlighting (Prism's Coy theme)
import 'prismjs/themes/prism-coy.css'

// owned overrides for the Prism theme above
import 'styles/prism-theme.css'

// playful accents layered on the base
import 'styles/whimsy.css'

// shared colour tokens, code-block presentation and contrast-tested palette
import 'styles/theme.css'

// isolated Details.so-inspired interactions (must win over theme.css)
import 'styles/details.css'

// scoped chrome for the static local reader (must win over details.css)
import 'styles/local-reader.css'

// Importing prismjs registers its DOMContentLoaded `highlightAll()` pass, which
// is what actually tokenises `<pre><code class="language-*">` fences in the
// browser. The language imports below declare the grammars we support.
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'

import React from 'react'
import { useRouter } from 'next/router'
import { bootstrap } from 'lib/bootstrap-client'
import { fathomId, fathomConfig } from 'lib/config'
import * as Fathom from 'fathom-client'
import { NavigationLoading } from 'components/NavigationLoading'

if (typeof window !== 'undefined') {
  bootstrap()
}

export default function App({ Component, pageProps }) {
  const router = useRouter()

  React.useEffect(() => {
    // DOMContentLoaded only covers hard loads; Next links replace article HTML
    // without loading a new document, so tokenise the new code blocks too.
    Prism.highlightAll()
  }, [router.asPath])

  React.useEffect(() => {
    if (fathomId) {
      Fathom.load(fathomId, fathomConfig)

      function onRouteChangeComplete() {
        Fathom.trackPageview()
      }

      router.events.on('routeChangeComplete', onRouteChangeComplete)

      return () => {
        router.events.off('routeChangeComplete', onRouteChangeComplete)
      }
    }
  }, [router.events])

  return (
    <>
      <NavigationLoading />
      <Component {...pageProps} />
    </>
  )
}
