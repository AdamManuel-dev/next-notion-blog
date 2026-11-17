import fs from 'node:fs'
import path from 'node:path'

import { readContentIndex } from './mdx-content.ts'

/** Resolve the actual public route, never a filesystem-derived URL. */
export function getContentPreview(
  file: string,
  {
    root = process.cwd(),
    port = 3000
  }: { root?: string; port?: number | string } = {}
) {
  if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535)
    throw new Error('Preview port must be an integer from 1 to 65535')
  const index = readContentIndex({ root })
  const target = fs.realpathSync(path.resolve(root, file))
  const page = index.pages.find((page) => fs.realpathSync(page.file) === target)
  if (!page)
    throw new Error('Preview an index.mdx inside the active content tree')
  return {
    url: `http://127.0.0.1:${Number(port)}${
      page.type === 'home' ? '/' : `/${page.slug}`
    }`,
    homeId: index.home.id,
    port: Number(port)
  }
}

/** Distinguish this site's dev server from another application using its port. */
export async function probeContentPreview({
  url,
  homeId
}: {
  url: string
  homeId: string
}) {
  try {
    const response = await fetch(new URL('/', url), {
      signal: AbortSignal.timeout(2000)
    })
    const html = await response.text()
    const data = html.match(
      /<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    )?.[1]
    const next: unknown = data ? JSON.parse(data) : null
    const props = isRecord(next) && isRecord(next.props) ? next.props : null
    const pageProps =
      props && isRecord(props.pageProps) ? props.pageProps : null
    const page = pageProps && isRecord(pageProps.page) ? pageProps.page : null
    return response.ok &&
      isRecord(next) &&
      next.buildId === 'development' &&
      page?.id === homeId
      ? 'ready'
      : 'occupied'
  } catch (error) {
    if (error instanceof SyntaxError) return 'occupied'
    return 'offline'
  }
}

export async function waitForContentPreview(
  preview: ReturnType<typeof getContentPreview>,
  timeout = 30000
) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const state = await probeContentPreview(preview)
    if (state === 'ready') return
    if (state === 'occupied')
      throw new Error(
        `Port ${preview.port} is not serving this site's development homepage. Check the dev terminal for errors or choose another preview port.`
      )
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('Preview server did not become ready; check the dev terminal')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
