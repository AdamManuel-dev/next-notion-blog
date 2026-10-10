import { memoizeAsync } from './memoize-async'
import { getAllPagesInSpace } from 'notion-utils'

import * as types from './types'
import { includeNotionIdInUrls } from './config'
import { getNotionPage } from './notion'
import { getCanonicalPageId } from './get-canonical-page-id'

const uuid = !!includeNotionIdInUrls

export const getAllPages = memoizeAsync(getAllPagesImpl, 60000 * 5)

export async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId: string
): Promise<Partial<types.SiteMap>> {
  let transientError: unknown
  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    async (pageId) => {
      if (transientError) throw transientError
      // Pace discovery so a large site does not burst requests at Notion.
      await new Promise((resolve) => setTimeout(resolve, 1000))
      try {
        return await getNotionPage(pageId)
      } catch (error) {
        const status = error.response?.status || error.statusCode
        if (
          status !== 400 &&
          status !== 404 &&
          !error.message?.startsWith('Notion page not found')
        ) {
          transientError = error
        }
        throw error
      }
    },
    { concurrency: 1 }
  )
  if (transientError) throw transientError
  if (!Object.values(pageMap).some(Boolean)) {
    throw new Error('Unable to load the blog page index')
  }

  const canonicalPageMap = Object.keys(pageMap).reduce(
    (map, pageId: string) => {
      const recordMap = pageMap[pageId]
      if (!recordMap) {
        return map
      }

      const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
        uuid
      })

      if (map[canonicalPageId]) {
        console.error(
          'error duplicate canonical page id',
          canonicalPageId,
          pageId,
          map[canonicalPageId]
        )

        return map
      } else {
        return {
          ...map,
          [canonicalPageId]: pageId
        }
      }
    },
    {}
  )

  return {
    pageMap,
    canonicalPageMap
  }
}
