/**
 * Site-wide app configuration.
 *
 * Values come from the root "site.config.js" and can be selectively overridden
 * through the `NEXT_PUBLIC_SITE_CONFIG` environment variable.
 */

// The explicit extension keeps this module importable both by the bundler and
// by `node --experimental-strip-types`, which the config tests run under.
import { getSiteConfig } from './get-config-value.ts'

// general site info
export const name: string = getSiteConfig('name')
export const author: string = getSiteConfig('author')
export const domain: string = getSiteConfig('domain')
export const description: string = getSiteConfig('description', '')

// social accounts (optional)
export const twitter: string | null = getSiteConfig('twitter', null)
export const github: string | null = getSiteConfig('github', null)
export const linkedin: string | null = getSiteConfig('linkedin', null)

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

// Fathom analytics is production-only so local browsing isn't tracked.
export const fathomId = isDev ? null : process.env.NEXT_PUBLIC_FATHOM_ID

export const fathomConfig = fathomId
  ? {
      excludedDomains: ['localhost', 'localhost:3000']
    }
  : undefined
