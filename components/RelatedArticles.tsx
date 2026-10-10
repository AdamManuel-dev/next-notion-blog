import * as React from 'react'
import Link from 'next/link'
import { RelatedPage } from 'lib/related-pages'

export function RelatedArticles({ pages }: { pages: RelatedPage[] }) {
  if (!pages?.length) return null
  return (
    <nav className='related-articles' aria-labelledby='related-articles-title'>
      <h2 id='related-articles-title'>Keep your curiosity going</h2>
      <p>More from the blog, with similar topics first.</p>
      <div className='related-grid'>
        {pages.map((page) => (
          <Link key={page.id} href={page.href} prefetch={false}>
            <span>{page.title}</span>
            <span aria-hidden='true'>↗</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
