import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

const configUrl = new URL('../lib/config.ts', import.meta.url).href

/**
 * `lib/config.ts` runs on every page render, so it is loaded in a child
 * process here: each case needs its own environment, and module state is
 * cached per process.
 */
const loadConfig = (
  env: Record<string, string | undefined> | undefined
): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        '--no-warnings',
        '--input-type=module',
        '-e',
        `const config = await import(${JSON.stringify(configUrl)})
         process.stdout.write(JSON.stringify({ ...config }))`
      ],
      {
        env: { ...process.env, ...env },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  )
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed))
  return { ...parsed }
}

const obsoleteNotionAndFirebaseEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_FATHOM_ID: 'FATHOM123',
  GOOGLE_APPLICATION_CREDENTIALS: 'not-base64-json',
  GCLOUD_PROJECT: '',
  FIREBASE_COLLECTION_IMAGES: ''
}

test('config loads from leftover Notion/Firebase environments without failing', () => {
  const config = loadConfig(obsoleteNotionAndFirebaseEnv)

  // Everything the footer and document head read is still present.
  assert.equal(config.name, "Adam Manuel's Blog")
  assert.equal(config.author, 'Adam Manuel')
  assert.equal(config.domain, 'blog.manuel.dev')
  assert.equal(config.github, 'adammanuel-dev')
  assert.equal(config.linkedin, 'adam-manuel')
  assert.equal(config.twitter, null)
  assert.ok(config.description)

  // No Notion page ids or Firebase credentials are required or exposed.
  for (const key of [
    'rootNotionPageId',
    'rootNotionSpaceId',
    'pageUrlOverrides',
    'inversePageUrlOverrides',
    'imageCDNHost',
    'isPreviewImageSupportEnabled',
    'googleProjectId',
    'googleApplicationCredentials',
    'firebaseCollectionImages',
    'api'
  ])
    assert.equal(config[key], undefined, `config should not export "${key}"`)
})

test('fathom analytics stays production-only', () => {
  const production = loadConfig(obsoleteNotionAndFirebaseEnv)
  assert.equal(production.fathomId, 'FATHOM123')
  assert.deepEqual(production.fathomConfig, {
    excludedDomains: ['localhost', 'localhost:3000']
  })

  const development = loadConfig({
    NODE_ENV: 'development',
    NEXT_PUBLIC_FATHOM_ID: 'FATHOM123'
  })
  assert.equal(development.fathomId, null)
  assert.equal(development.fathomConfig, undefined)
})

test('NEXT_PUBLIC_SITE_CONFIG overrides site.config.ts values', () => {
  const config = loadConfig({
    NEXT_PUBLIC_SITE_CONFIG: JSON.stringify({ name: 'Staging Blog' })
  })
  assert.equal(config.name, 'Staging Blog')
  assert.equal(config.author, 'Adam Manuel')
})

test('site config overrides reject non-object JSON', () => {
  for (const value of [null, [], 'not an object'])
    assert.throws(
      () => loadConfig({ NEXT_PUBLIC_SITE_CONFIG: JSON.stringify(value) }),
      /Site config overrides must be a JSON object/
    )
})

test('site config overrides reject non-string required metadata', () => {
  for (const name of [42, null])
    assert.throws(
      () => loadConfig({ NEXT_PUBLIC_SITE_CONFIG: JSON.stringify({ name }) }),
      /site config value "name" must be a string/
    )
})

test('site.config.ts only declares static site metadata', () => {
  const siteConfig = readFileSync(
    new URL('../site.config.ts', import.meta.url),
    'utf8'
  )
  for (const field of [
    'rootNotionPageId',
    'rootNotionSpaceId',
    'pageUrlOverrides',
    'imageCDNHost',
    'utterancesGitHubRepo',
    'isPreviewImageSupportEnabled',
    'socialImageTitle',
    'defaultPageIcon'
  ])
    assert.ok(
      !siteConfig.includes(field),
      `site.config.ts should no longer declare "${field}"`
    )
})

test('the 404 page gives a generic message and a way home', () => {
  const page404 = readFileSync(
    new URL('../components/Page404.tsx', import.meta.url),
    'utf8'
  )
  assert.ok(!/notion/i.test(page404), '404 copy should not mention Notion')
  assert.ok(page404.includes("href='/'"), '404 page should link home')
})
