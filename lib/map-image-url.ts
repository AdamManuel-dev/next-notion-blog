import { Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'
import { imageCDNHost } from './config'

export const mapNotionImageUrl = (url: string, block: Block) => {
  if (!url) return null
  if (imageCDNHost && url.startsWith(imageCDNHost)) return url
  const mapped = defaultMapImageUrl(url, block)
  return mapped ? mapImageUrl(mapped) : null
}

export const mapImageUrl = (imageUrl: string) => {
  if (imageUrl.startsWith('data:') || !imageCDNHost) return imageUrl
  return `${imageCDNHost}/${encodeURIComponent(imageUrl)}`
}
