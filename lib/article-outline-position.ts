export type OutlineHeadingPosition = {
  id: string
  top: number
}

/** The last heading above the reading line owns the section currently in view. */
export function getActiveOutlineId(
  positions: readonly OutlineHeadingPosition[],
  marker = 96,
  atEnd = false
): string | null {
  if (!positions.length) return null
  if (atEnd) return positions[positions.length - 1].id

  let active = positions[0].id
  for (const heading of positions) {
    if (heading.top > marker) break
    active = heading.id
  }
  return active
}
