import type { LiveBlockInstance } from './live-block-types'

/** Structural DOM ports keep visibility logic independent of browser implementations. */
export interface LiveBlockElement {
  readonly children: ArrayLike<LiveBlockElement>
  readonly isConnected: boolean
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null | undefined
}

export type LiveBlockTarget<ElementType extends LiveBlockElement = Element> = {
  container: ElementType
  mount: ElementType
  instance: LiveBlockInstance
}

export type LiveBlockObserver<ElementType = Element> = {
  observe: (element: ElementType) => void
  unobserve: (element: ElementType) => void
  disconnect: () => void
}

export type CreateLiveBlockObserver<ElementType = Element> = (
  activate: (element: ElementType) => void
) => LiveBlockObserver<ElementType>

/** Match descriptors without interpolating author-supplied IDs into selectors. */
export function discoverLiveBlockTargets<
  ElementType extends LiveBlockElement & {
    readonly children: ArrayLike<ElementType>
  }
>(
  article: { querySelectorAll(selector: string): Iterable<ElementType> },
  instances: readonly LiveBlockInstance[]
): LiveBlockTarget<ElementType>[] {
  const byId = new Map(instances.map((instance) => [instance.id, instance]))
  const targets: LiveBlockTarget<ElementType>[] = []
  for (const container of article.querySelectorAll(
    '.live-block[data-live-block]'
  )) {
    const id = container.getAttribute('data-live-block') || ''
    const instance = byId.get(id)
    const mount = Array.from(container.children).find((child) =>
      child.hasAttribute('data-live-mount')
    )
    if (!instance || !mount) continue
    targets.push({ container, mount, instance })
    byId.delete(id)
  }
  return targets
}

/** Visibility only: React owns all rendering and teardown inside each mount. */
export function observeLiveBlockTargets<ElementType extends LiveBlockElement>({
  article,
  targets,
  activate,
  createObserver
}: {
  article: { contains(element: NoInfer<ElementType>): boolean }
  targets: readonly LiveBlockTarget<ElementType>[]
  activate: (target: LiveBlockTarget<NoInfer<ElementType>>) => void
  createObserver?: CreateLiveBlockObserver<NoInfer<ElementType>>
}): () => void {
  let cancelled = false
  let observer: LiveBlockObserver<ElementType> | undefined
  const pending = new Map(targets.map((target) => [target.container, target]))
  const reveal = (container: ElementType) => {
    const target = pending.get(container)
    if (
      cancelled ||
      !target ||
      !target.mount.isConnected ||
      !article.contains(target.mount)
    ) {
      return
    }
    pending.delete(target.container)
    observer?.unobserve(target.container)
    activate(target)
  }

  if (createObserver) {
    observer = createObserver(reveal)
    for (const target of targets) observer.observe(target.container)
  } else {
    for (const target of targets) reveal(target.container)
  }

  return () => {
    if (cancelled) return
    cancelled = true
    observer?.disconnect()
    pending.clear()
  }
}
