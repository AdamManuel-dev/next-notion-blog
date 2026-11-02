import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('out')
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
}
await fs.access(path.join(root, 'index.html'))
http
  .createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname
      )
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
      const candidate = path.resolve(root, relative)
      if (!candidate.startsWith(root + path.sep)) {
        response.writeHead(400).end()
        return
      }
      let bytes
      let filename = candidate
      try {
        bytes = await fs.readFile(filename)
      } catch {
        filename = candidate + '.html'
        bytes = await fs.readFile(filename)
      }
      response.writeHead(200, {
        'Content-Type':
          types[path.extname(filename)] || 'application/octet-stream'
      })
      response.end(request.method === 'HEAD' ? undefined : bytes)
    } catch {
      let notFound
      try {
        notFound = await fs.readFile(path.join(root, '404.html'))
      } catch {
        notFound =
          '<!doctype html><title>404 Not Found</title><h1>404 Not Found</h1>'
      }
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(request.method === 'HEAD' ? undefined : notFound)
    }
  })
  .listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
    console.log(`Static site: http://localhost:${process.env.PORT || 3000}`)
  })
