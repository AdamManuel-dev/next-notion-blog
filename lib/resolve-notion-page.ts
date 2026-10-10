import { parsePageId, getBlockValue } from 'notion-utils'
import { ExtendedRecordMap } from 'notion-types'

import * as acl from './acl'
import * as types from './types'
import { pageUrlOverrides, pageUrlAdditions } from './config'
import { getPage, getNotionPage } from './notion'
import { getCanonicalPageId } from './get-canonical-page-id'
import { getSiteMaps } from './get-site-maps'
import { getSiteForDomain } from './get-site-for-domain'

export async function resolveNotionPage(domain: string, rawPageId?: string) {
  let site: types.Site
  let pageId: string
  let recordMap: ExtendedRecordMap

  if (rawPageId && rawPageId !== 'index') {
    pageId = parsePageId(rawPageId)

    if (!pageId) {
      // check if the site configuration provides an override of a fallback for
      // the page's URI
      const override =
        pageUrlOverrides[rawPageId] || pageUrlAdditions[rawPageId]

      if (override) {
        pageId = parsePageId(override)
      }
    }

    if (pageId) {
      const resources = await Promise.all([
        getSiteForDomain(domain),
        getPage(pageId)
      ])

      site = resources[0]
      recordMap = resources[1]
    } else {
      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      // Most articles are linked from the homepage. Resolve these without
      // crawling every article, which can trigger Notion's rate limit.
      site = await getSiteForDomain(domain)
      const rootMap = await getNotionPage(site.rootNotionPageId)
      pageId = Object.keys(rootMap.block).find((id) => {
        const block = getBlockValue(rootMap.block[id])
        return (
          block?.type === 'page' &&
          getCanonicalPageId(id, rootMap, { uuid: false }) === rawPageId
        )
      })
      if (!pageId) {
        const siteMaps = await getSiteMaps()
        pageId = siteMaps[0]?.canonicalPageMap[rawPageId]
      }

      if (pageId) {
        // TODO: we're not re-using the site from siteMaps because it is
        // cached aggressively
        // site = await getSiteForDomain(domain)
        // recordMap = siteMap.pageMap[pageId]

        const resources = await Promise.all([
          getSiteForDomain(domain),
          getPage(pageId)
        ])

        site = resources[0]
        recordMap = resources[1]
      } else {
        return {
          error: {
            message: `Not found "${rawPageId}"`,
            statusCode: 404
          }
        }
      }
    }
  } else {
    site = await getSiteForDomain(domain)
    pageId = site.rootNotionPageId

    recordMap = await getPage(pageId)
  }

  const props = { site, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}
