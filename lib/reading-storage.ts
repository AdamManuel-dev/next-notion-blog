export type ReadingPreferences = { size: number; spacing: number }
export type ReadingPosition = {
  y: number
  anchor: string
  offset: number
  updated: number
}
export const defaultReadingPreferences: ReadingPreferences = {
  size: 16,
  spacing: 1.65
}

export function parseReadingPreferences(
  raw: string | null
): ReadingPreferences {
  try {
    const value = JSON.parse(raw || 'null')
    return {
      size: [16, 18, 20].includes(value?.size) ? value.size : 16,
      spacing: [1.5, 1.65, 1.85].includes(value?.spacing) ? value.spacing : 1.65
    }
  } catch {
    return defaultReadingPreferences
  }
}

export function parseReadingPosition(
  raw: string | null,
  now = Date.now()
): ReadingPosition | null {
  try {
    const value = JSON.parse(raw || 'null')
    if (
      !value ||
      !Number.isFinite(value.y) ||
      value.y < 200 ||
      !Number.isFinite(value.offset) ||
      typeof value.anchor !== 'string' ||
      !/^(notion-block-[a-f0-9]{32})?$/.test(value.anchor) ||
      !Number.isFinite(value.updated) ||
      value.updated > now ||
      now - value.updated > 30 * 86400000
    )
      return null
    return value
  } catch {
    return null
  }
}
