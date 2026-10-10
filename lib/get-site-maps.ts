import { getAllPages } from './get-all-pages'
import { getSites } from './get-sites'
import * as types from './types'

export async function getSiteMaps(): Promise<types.SiteMap[]> {
  const sites = await getSites()
  return Promise.all(
    sites.map(
      async (site) =>
        ({
          site,
          ...(await getAllPages(site.rootNotionPageId, site.rootNotionSpaceId))
        } as types.SiteMap)
    )
  )
}
