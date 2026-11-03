/** Shared deterministic, bounded names for build-time and migrated fragments. */
export function slugifyFragment(text) {
  const words = String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
  return words.join('-').slice(0, 80).replace(/-+$/, '') || 'block'
}

/** Reserve authored names before generating suffixes, so they always win. */
export function createFragmentSlugger(reserved = []) {
  const used = new Set(reserved)
  return (text) => {
    const base = slugifyFragment(text)
    let name = base
    let suffix = 2
    while (used.has(name)) name = `${base}-${suffix++}`
    used.add(name)
    return name
  }
}
