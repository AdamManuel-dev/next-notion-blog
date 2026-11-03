import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  discoverLiveBlockTargets,
  observeLiveBlockTargets,
  type LiveBlockTarget
} from '../lib/live-block-runtime'
import type { LiveBlocksProps } from './LiveBlocks'
import { LiveBlockBoundary } from './LiveBlockBoundary'

import { widgets } from './live/widgets'

function LiveWidget({ target }: { target: LiveBlockTarget }) {
  // Suspense can retry after a chunk resolves; never mount in a stale host.
  if (!target.mount.isConnected) return null
  const { moduleId, props } = target.instance
  if (!Object.prototype.hasOwnProperty.call(widgets, moduleId)) {
    throw new Error(`Missing live-block widget: ${moduleId}`)
  }
  const Widget = widgets[moduleId as keyof typeof widgets]
  return <Widget {...props} />
}

function LiveBlockPortal({ target }: { target: LiveBlockTarget }) {
  React.useEffect(() => {
    target.container.setAttribute('data-live-active', '')
    return () => target.container.removeAttribute('data-live-active')
  }, [target])

  return createPortal(
    <LiveBlockBoundary>
      <React.Suspense
        fallback={<p role='status'>Loading interactive example…</p>}
      >
        <LiveWidget target={target} />
      </React.Suspense>
    </LiveBlockBoundary>,
    target.mount,
    target.instance.id
  )
}

/** The parent key scopes this controller to one article HTML revision. */
export default function LiveBlockPortals({
  articleRef,
  blocks
}: LiveBlocksProps) {
  const [activeTargets, setActiveTargets] = React.useState<LiveBlockTarget[]>(
    []
  )
  // Descriptors are immutable for this keyed article revision.
  const instances = React.useRef(blocks)

  React.useEffect(() => {
    const article = articleRef.current
    if (!article) return
    const targets = discoverLiveBlockTargets(article, instances.current)
    setActiveTargets([])
    return observeLiveBlockTargets({
      article,
      targets,
      activate: (target) => {
        setActiveTargets((current) => [...current, target])
      },
      createObserver:
        typeof IntersectionObserver === 'undefined'
          ? undefined
          : (activate) =>
              new IntersectionObserver(
                (entries) => {
                  for (const entry of entries) {
                    if (entry.isIntersecting) activate(entry.target)
                  }
                },
                { rootMargin: '200px' }
              )
    })
  }, [articleRef])

  return (
    <>
      {activeTargets.map((target) =>
        target.mount.isConnected &&
        articleRef.current?.contains(target.mount) ? (
          <LiveBlockPortal key={target.instance.id} target={target} />
        ) : null
      )}
    </>
  )
}
