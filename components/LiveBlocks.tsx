import * as React from 'react'
import type { LiveBlockInstance } from '../lib/live-block-types'
import { LiveBlockBoundary } from './LiveBlockBoundary'

export type LiveBlocksProps = {
  articleRef: React.RefObject<HTMLElement>
  pageId: string
  bodyHtml: string
  blocks: readonly LiveBlockInstance[]
}

const Controller = React.lazy(() => import('./LiveBlockPortals'))

/** Ordinary articles never request the controller, registry, or widget chunks. */
export function LiveBlocks(props: LiveBlocksProps) {
  if (!props.blocks.length) return null
  return (
    <LiveBlockBoundary key={props.pageId + '\u0000' + props.bodyHtml}>
      <React.Suspense fallback={null}>
        <Controller {...props} />
      </React.Suspense>
    </LiveBlockBoundary>
  )
}
