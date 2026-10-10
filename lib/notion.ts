import { NotionAPI } from 'notion-client'
import { ExtendedRecordMap, SearchParams, SearchResults } from 'notion-types'
import { getPreviewImages } from './get-preview-images'
import { mapNotionImageUrl } from './map-image-url'
import { getBlockValue, parsePageId } from 'notion-utils'
import { NotionRequestCache } from './notion-request-cache'

// Share the request budget across API routes and development hot reloads.
const globalCache = globalThis as typeof globalThis & {
  blogNotionCache?: Map<string, NotionRequestCache<ExtendedRecordMap>>
}
const caches = (globalCache.blogNotionCache ||= new Map())
const baseUrl =
  process.env.NOTION_API_BASE_URL || 'https://app.notion.com/api/v3'
if (!caches.has(baseUrl)) caches.set(baseUrl, new NotionRequestCache())
const cache = caches.get(baseUrl)

class BlogNotionAPI extends NotionAPI {
  fetch<T>(options: Parameters<NotionAPI['fetch']>[0]): Promise<T> {
    return cache.request(() => super.fetch<T>(options))
  }
}

export const notion = new BlogNotionAPI({
  apiBaseUrl: baseUrl,
  ofetchOptions: { timeout: 15000, retry: 0 }
})

export const getNotionPage = (rawPageId: string) => {
  const pageId = parsePageId(rawPageId)
  return cache.get(pageId, () => notion.getPage(pageId))
}

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  const recordMap = await getNotionPage(pageId)
  const blockIds = Object.keys(recordMap.block)

  const imageUrls: string[] = blockIds
    .map((blockId) => {
      const block = getBlockValue(recordMap.block[blockId])

      if (block) {
        if (block.type === 'image') {
          const source = block.properties?.source?.[0]?.[0]

          if (source) {
            return {
              block,
              url: source
            }
          }
        }

        if ((block.format as any)?.page_cover) {
          const source = (block.format as any).page_cover

          return {
            block,
            url: source
          }
        }
      }

      return null
    })
    .filter(Boolean)
    .map(({ block, url }) => mapNotionImageUrl(url, block))
    .filter(Boolean)

  const urls = Array.from(new Set(imageUrls))
  const previewImageMap = await getPreviewImages(urls)
  ;(recordMap as any).preview_images = previewImageMap

  return recordMap
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params)
}
