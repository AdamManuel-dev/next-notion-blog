import type { LiveBlockInstance } from './live-block-types'

export type LiveBlockTarget = {
  container: HTMLElement
  mount: HTMLElement
  instance: LiveBlockInstance
}

export type LiveBlockObserver = {
  observe: (element: Element) => void
  unobserve: (element: Element) => void
  disconnect: () => void
}

export type CreateLiveBlockObserver = (
  activate: (element: Element) => void
) => LiveBlockObserver

/** Match descriptors without interpolating author-supplied IDs into selectors. */
export function discoverLiveBlockTargets(
  article: HTMLElement,
  instances: readonly LiveBlockInstance[]
): LiveBlockTarget[] {
  const byId = new Map(instances.map((instance) => [instance.id, instance]))
  const targets: LiveBlockTarget[] = []
  for (const container of article.querySelectorAll<HTMLElement>(
    '.live-block[data-live-block]'
  )) {
    const id = container.getAttribute('data-live-block') || ''
    const instance = byId.get(id)
    const mount = Array.from(container.children).find((child) =>
      child.hasAttribute('data-live-mount')
    ) as HTMLElement | undefined
    if (!instance || !mount) continue
    targets.push({ container, mount, instance })
    byId.delete(id)
  }
  return targets
}

/** Visibility only: React owns all rendering and teardown inside each mount. */
export function observeLiveBlockTargets({
  article,
  targets,
  activate,
  createObserver
}: {
  article: HTMLElement
  targets: readonly LiveBlockTarget[]
  activate: (target: LiveBlockTarget) => void
  createObserver?: CreateLiveBlockObserver
}): () => void {
  let cancelled = false
  let observer: LiveBlockObserver | undefined
  const pending = new Map(targets.map((target) => [target.container, target]))
  const reveal = (container: Element) => {
    const target = pending.get(container as HTMLElement)
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
