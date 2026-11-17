import rawSiteConfig from '../site.config.ts'

if (!rawSiteConfig) {
  throw new Error(`Config error: invalid site.config.ts`)
}

// A deployment may override site.config.ts with a JSON object.
let siteConfigOverrides: Record<string, unknown> = {}

try {
  if (process.env.NEXT_PUBLIC_SITE_CONFIG) {
    const parsed: unknown = JSON.parse(process.env.NEXT_PUBLIC_SITE_CONFIG)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Site config overrides must be a JSON object')
    siteConfigOverrides = { ...parsed }
  }
} catch (err) {
  console.error('Invalid config "NEXT_PUBLIC_SITE_CONFIG" failed to parse')
  throw err
}

const siteConfig: Record<string, unknown> = {
  ...rawSiteConfig,
  ...siteConfigOverrides
}

export function getSiteConfig<T extends string | null = string>(
  key: string,
  defaultValue?: T
): string | T {
  const value = siteConfig[key]

  if (value !== undefined) {
    if (typeof value === 'string') return value
    if (value === null && defaultValue === null) return defaultValue
    throw new Error(`Config error: site config value "${key}" must be a string`)
  }

  if (defaultValue !== undefined) {
    return defaultValue
  }

  throw new Error(`Config error: missing required site config value "${key}"`)
}
