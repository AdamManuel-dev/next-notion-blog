import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attachLegacyFragmentResolver,
  findArticleFragment,
  resolveFragmentId
} from '../lib/legacy-fragments.ts'

// Narrow browser port keeps navigation tests independent of a DOM implementation.
interface FragmentElement {
  id: string
  parentElement?: import('../lib/legacy-fragments.ts').FragmentAncestor | null
  scrollIntoView: () => void
}
function fixture(hash = '#old', ids = ['readable-section']) {
  const scrolled: string[] = []
  const replacements: { state: unknown; title: string; url: string }[] = []
  const listeners = new Map<string, () => void>()
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  const article = {
    tagName: 'ARTICLE',
    parentElement: null,
    setAttribute() {},
    isConnected: true,
    querySelectorAll(selector: string): FragmentElement[] {
      assert.equal(selector, '[id]')
      return ids.map((id) => ({
        id,
        scrollIntoView: () => scrolled.push(id)
      }))
    }
  }
  const browser = {
    location: { hash, pathname: '/notes/example', search: '?from=search' },
    history: {
      state: { next: 'router-state' },
      replaceState(state: unknown, title: string, url: string) {
        replacements.push({ state, title, url })
        browser.location.hash = url.slice(url.indexOf('#'))
      }
    },
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame(id: number) {
      frames.delete(id)
    },
    addEventListener: (type: string, callback: () => void) =>
      listeners.set(type, callback),
    removeEventListener(type: string, callback: () => void) {
      assert.equal(listeners.get(type), callback)
      listeners.delete(type)
    }
  }
  const mount = (
    aliases: Record<string, string> = { old: 'readable-section' },
    extra: { subscribeNavigation?: (callback: () => void) => () => void } = {}
  ) =>
    attachLegacyFragmentResolver({
      browser,
      getArticle: () => article,
      aliases,
      ...extra
    })
  const flush = () => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((runFrame) => runFrame(0))
  }
  return {
    browser,
    article,
    scrolled,
    replacements,
    listeners,
    frames,
    mount,
    flush
  }
}

test('mount resolves a legacy fragment on the actual block after the animation frame', () => {
  const f = fixture()
  const cleanup = f.mount()
  assert.deepEqual(f.scrolled, [])
  f.flush()
  assert.deepEqual(f.scrolled, ['readable-section'])
  assert.deepEqual(f.replacements, [
    {
      state: f.browser.history.state,
      title: '',
      url: '/notes/example?from=search#readable-section'
    }
  ])
  cleanup()
})

test('hashchange uses the current hash, coalesces frames and preserves homepage paths', () => {
  const f = fixture('')
  f.browser.location.pathname = '/'
  const cleanup = f.mount()
  f.flush()
  f.browser.location.hash = '#old'
  ;(
    f.listeners.get('hashchange') ?? assert.fail('missing hashchange listener')
  )()
  ;(
    f.listeners.get('hashchange') ?? assert.fail('missing hashchange listener')
  )()
  assert.equal(f.frames.size, 1)
  f.flush()
  assert.deepEqual(f.scrolled, ['readable-section'])
  assert.equal(f.replacements[0].url, '/?from=search#readable-section')
  cleanup()
})

test('encoded legacy fragments decode once and canonical output is encoded', () => {
  const f = fixture('#old%20name', ['résumé'])
  const cleanup = f.mount({ 'old name': 'résumé' })
  f.flush()
  assert.deepEqual(f.scrolled, ['résumé'])
  assert.equal(
    f.replacements[0].url,
    '/notes/example?from=search#r%C3%A9sum%C3%A9'
  )
  cleanup()
})

test('malformed, missing, unknown and already canonical hashes are not hijacked', () => {
  for (const hash of [
    '',
    '#',
    '#bad%',
    '#%FF',
    '#unknown',
    '#readable-section',
    '#constructor',
    '#__proto__',
    '#toString'
  ]) {
    const f = fixture(hash)
    const cleanup = f.mount()
    f.flush()
    assert.deepEqual(f.scrolled, [], hash)
    assert.deepEqual(f.replacements, [], hash)
    cleanup()
  }
  const f = fixture()
  const cleanup = f.mount()
  f.article.isConnected = false
  f.flush()
  assert.deepEqual(f.scrolled, [])
  cleanup()
})

test('an alias without an actual article target does not scroll or replace history', () => {
  const f = fixture('#old', [])
  const cleanup = f.mount()
  f.flush()
  assert.deepEqual(f.scrolled, [])
  assert.deepEqual(f.replacements, [])
  cleanup()
})

test('page changes replace aliases and cancel stale work and navigation listeners', () => {
  const f = fixture()
  let navigate: () => void = () => assert.fail('navigation not subscribed')
  let unsubscribed = 0
  const subscribeNavigation = (callback: () => void) => {
    navigate = callback
    return () => {
      unsubscribed++
    }
  }
  const cleanup = f.mount(undefined, { subscribeNavigation })
  cleanup()
  assert.equal(f.frames.size, 0)
  assert.equal(f.listeners.size, 0)
  assert.equal(unsubscribed, 1)
  const nextCleanup = f.mount({ old: 'new-section' }, { subscribeNavigation })
  f.article.querySelectorAll = () => [
    { id: 'new-section', scrollIntoView: () => f.scrolled.push('new-section') }
  ]
  navigate()
  f.flush()
  assert.deepEqual(f.scrolled, ['new-section'])
  nextCleanup()
  assert.equal(unsubscribed, 2)
})

test('mapped blocks open all collapsed ancestor details before scrolling', () => {
  const f = fixture()
  const opened: string[][] = []
  const outer = {
    tagName: 'DETAILS',
    parentElement: f.article,
    setAttribute: (name: string, value: string) =>
      opened.push(['outer', name, value])
  }
  const inner = {
    tagName: 'DETAILS',
    parentElement: outer,
    setAttribute: (name: string, value: string) =>
      opened.push(['inner', name, value])
  }
  f.article.querySelectorAll = () => [
    {
      id: 'readable-section',
      parentElement: {
        tagName: 'DIV',
        parentElement: inner,
        setAttribute() {}
      },
      scrollIntoView() {
        assert.deepEqual(opened, [
          ['inner', 'open', ''],
          ['outer', 'open', '']
        ])
        f.scrolled.push('readable-section')
      }
    }
  ]
  const cleanup = f.mount()
  f.flush()
  assert.deepEqual(f.scrolled, ['readable-section'])
  cleanup()
})

test('saved reading anchors use the same flat map, without requiring alias elements', () => {
  const old = 'notion-block-' + 'a'.repeat(32)
  const f = fixture('', ['readable-section'])
  assert.equal(
    findArticleFragment(f.article, old, { [old]: 'readable-section' })?.id,
    'readable-section'
  )
  assert.equal(
    findArticleFragment(f.article, old, {
      ['a'.repeat(32)]: 'readable-section'
    })?.id,
    'readable-section'
  )
  assert.equal(
    findArticleFragment(
      f.article,
      old,
      Object.create({ ['a'.repeat(32)]: 'readable-section' })
    ),
    null
  )
  assert.equal(
    findArticleFragment(f.article, 'readable-section')?.id,
    'readable-section'
  )
  assert.equal(findArticleFragment(f.article, 'outside-article'), null)
  assert.equal(
    findArticleFragment(
      f.article,
      old,
      Object.create({ [old]: 'readable-section' })
    ),
    null
  )
  assert.equal(resolveFragmentId('constructor', {}), 'constructor')
  const ownPrototypeName = JSON.parse('{"__proto__":"readable-section"}')
  assert.equal(
    findArticleFragment(f.article, '__proto__', ownPrototypeName)?.id,
    'readable-section'
  )
  assert.equal(
    resolveFragmentId('old', { old: 'middle', middle: 'final' }),
    'middle'
  )
})
