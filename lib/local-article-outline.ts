export type LocalOutlineEntry = {
  id: string
  href: string
  text: string
  indentLevel: number
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

function headingText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(
      /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (entity, code: string) => {
        if (!code.startsWith('#')) return entities[code.toLowerCase()] ?? entity
        const point =
          code[1].toLowerCase() === 'x'
            ? parseInt(code.slice(2), 16)
            : Number(code.slice(1))
        return point > 0 &&
          point <= 0x10ffff &&
          !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : entity
      }
    )
    .replace(/\s+/g, ' ')
    .trim()
}

/** Adds stable anchor targets to the migration's already-sanitized HTML. */
export function prepareLocalArticle(html: string): {
  html: string
  entries: LocalOutlineEntry[]
} {
  const entries: LocalOutlineEntry[] = []
  const usedIds = new Set(
    [...html.matchAll(/\s+id\s*=\s*["']([^"']+)["']/gi)].map(
      (match) => match[1]
    )
  )
  const levels = [{ actual: 0, effective: -1 }]
  let sequence = 0
  const anchoredHtml = html.replace(
    /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi,
    (heading, level: string, attributes: string, content: string) => {
      const text = headingText(content)
      if (!text) return heading
      const existingId = attributes.match(/\s+id\s*=\s*["']([^"']+)["']/i)?.[1]
      let id = existingId
      if (!id) {
        do {
          id = `local-heading-${++sequence}`
        } while (usedIds.has(id))
        usedIds.add(id)
      }
      const actual = Number(level)
      while (levels.length > 1 && actual < levels[levels.length - 1].actual)
        levels.pop()
      const previous = levels[levels.length - 1]
      const indentLevel =
        actual === previous.actual ? previous.effective : previous.effective + 1
      if (actual > previous.actual)
        levels.push({ actual, effective: indentLevel })
      entries.push({
        id,
        href: `#${encodeURIComponent(id)}`,
        text,
        indentLevel
      })
      return existingId
        ? heading
        : `<h${level}${attributes} id="${id}">${content}</h${level}>`
    }
  )
  return { html: anchoredHtml, entries: entries.length >= 3 ? entries : [] }
}
