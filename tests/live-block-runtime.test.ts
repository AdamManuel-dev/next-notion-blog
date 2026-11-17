import assert from 'node:assert/strict'
import test from 'node:test'
import {
  discoverLiveBlockTargets,
  observeLiveBlockTargets
} from '../lib/live-block-runtime.ts'

class Element {
  attributes: Record<string, string>
  children: Element[]
  isConnected: boolean
  constructor(
    attributes: Record<string, string> = {},
    children: Element[] = []
  ) {
    this.attributes = attributes
    this.children = children
    this.isConnected = true
  }

  hasAttribute(key: string) {
    return key in this.attributes
  }

  getAttribute(key: string) {
    return this.attributes[key]
  }

  contains(element: Element): boolean {
    return this.children.some(
      (child) => child === element || child.contains(element)
    )
  }

  querySelectorAll() {
    return this.children.filter((child) =>
      child.hasAttribute('data-live-block')
    )
  }
}

function fixture(ids = ['first']) {
  const instances = ids.map((id) => ({
    id,
    moduleId: 'shared-counter',
    props: { initial: 4, label: id }
  }))
  const mounts: Element[] = []
  const fallbacks: Element[] = []
  const sources: Element[] = []
  const containers = ids.map((id) => {
    const mount = new Element({ 'data-live-mount': '' })
    const fallback = new Element({ 'data-live-fallback': '' })
    const source = new Element({ 'data-live-source': '' })
    mounts.push(mount)
    fallbacks.push(fallback)
    sources.push(source)
    return new Element({ 'data-live-block': id }, [mount, fallback, source])
  })
  const article = new Element({}, containers)
  const observed: Element[] = []
  const unobserved: Element[] = []
  let activate: (element: Element) => void = () =>
    assert.fail('observer not created')
  let disconnected = 0
  const createObserver = (callback: (element: Element) => void) => {
    activate = callback
    return {
      observe: (element: Element) => observed.push(element),
      unobserve: (element: Element) => unobserved.push(element),
      disconnect: () => disconnected++
    }
  }
  return {
    article,
    instances,
    mounts,
    fallbacks,
    sources,
    containers,
    observed,
    unobserved,
    createObserver,
    get activate() {
      const callback = activate
      return (index = 0) => callback(containers[index])
    },
    disconnected: () => disconnected
  }
}

test('discovery associates canonical IDs with independent hosts and descriptor props', () => {
  const f = fixture(['first', 'readable:id[second]'])
  const targets = discoverLiveBlockTargets(f.article, f.instances)
  assert.equal(targets.length, 2)
  for (const [index, target] of targets.entries()) {
    assert.equal(target.mount, f.mounts[index])
    assert.equal(target.container, f.containers[index])
    assert.equal(target.instance, f.instances[index])
    assert.equal(target.instance.moduleId, 'shared-counter')
    assert.equal(target.instance.props.label, f.instances[index].id)
    assert.deepEqual(target.mount.children, [], 'mounts remain empty')
    assert.deepEqual(target.container.children, [
      f.mounts[index],
      f.fallbacks[index],
      f.sources[index]
    ])
  }
})

test('unknown, duplicate, and malformed hosts are ignored without selector interpolation', () => {
  const f = fixture(['first', 'missing-mount', 'unknown'])
  f.containers[1].children = [f.sources[1]]
  f.article.children.push(f.containers[0])
  const targets = discoverLiveBlockTargets(f.article, f.instances.slice(0, 2))
  assert.equal(targets.length, 1)
  assert.equal(targets[0].instance.id, 'first')
})

test('viewport activation reveals each host once and never mutates static markup', () => {
  const f = fixture(['first', 'second'])
  const targets = discoverLiveBlockTargets(f.article, f.instances)
  const revealed: import('../lib/live-block-runtime.ts').LiveBlockTarget<Element>[] =
    []
  const stop = observeLiveBlockTargets({
    article: f.article,
    targets,
    activate: (target) => revealed.push(target),
    createObserver: f.createObserver
  })
  assert.deepEqual(f.observed, f.containers)
  assert.deepEqual(revealed, [])
  f.activate(1)
  f.activate(1)
  f.activate(0)
  assert.deepEqual(revealed, [targets[1], targets[0]])
  assert.deepEqual(f.unobserved, [f.containers[1], f.containers[0]])
  stop()
  stop()
  assert.equal(f.disconnected(), 1)
  assert.deepEqual(
    f.mounts.map((mount) => mount.children),
    [[], []]
  )
  assert.equal(f.containers[0].children[1], f.fallbacks[0])
  assert.equal(f.containers[0].children[2], f.sources[0])
})

test('without IntersectionObserver all connected targets activate immediately', () => {
  const f = fixture(['first', 'second'])
  const targets = discoverLiveBlockTargets(f.article, f.instances)
  const revealed: import('../lib/live-block-runtime.ts').LiveBlockTarget<Element>[] =
    []
  const stop = observeLiveBlockTargets({
    article: f.article,
    targets,
    activate: (target) => revealed.push(target)
  })
  assert.deepEqual(revealed, targets)
  stop()
})

test('navigation cleanup cancels even already queued observer notifications', () => {
  const f = fixture()
  let activations = 0
  const stop = observeLiveBlockTargets({
    article: f.article,
    targets: discoverLiveBlockTargets(f.article, f.instances),
    activate: () => activations++,
    createObserver: f.createObserver
  })
  stop()
  f.activate()
  assert.equal(activations, 0)
  assert.equal(f.disconnected(), 1)
})

test('disconnected or replaced hosts cannot activate from stale observer notifications', () => {
  for (const remove of [
    (f: ReturnType<typeof fixture>) => (f.mounts[0].isConnected = false),
    (f: ReturnType<typeof fixture>) => (f.article.children = [])
  ]) {
    const f = fixture()
    let activations = 0
    const stop = observeLiveBlockTargets({
      article: f.article,
      targets: discoverLiveBlockTargets(f.article, f.instances),
      activate: () => activations++,
      createObserver: f.createObserver
    })
    remove(f)
    f.activate()
    assert.equal(activations, 0)
    stop()
  }
})

test('StrictMode effect replay rediscovers targets without retirement queues or DOM writes', () => {
  const f = fixture()
  const revealed: Element[] = []
  const attach = () =>
    observeLiveBlockTargets({
      article: f.article,
      targets: discoverLiveBlockTargets(f.article, f.instances),
      activate: (target) => revealed.push(target.mount),
      createObserver: f.createObserver
    })
  const first = attach()
  const staleNotification = f.activate
  first()
  const second = attach()
  // A fresh observer is independent of the retired subscription.
  f.activate()
  staleNotification()
  assert.deepEqual(revealed, [f.mounts[0]])
  assert.equal(f.disconnected(), 1)
  second()
  assert.equal(f.disconnected(), 2)
  assert.deepEqual(f.mounts[0].children, [])
})
