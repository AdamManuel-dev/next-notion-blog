export type LiveLiteral =
  | null
  | boolean
  | number
  | string
  | LiveLiteral[]
  | { [key: string]: LiveLiteral }

export interface LivePropSchema {
  type: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object'
  integer?: boolean
  min?: number
  max?: number
}

export interface LiveComponentRegistration {
  module: string
  props: Record<string, LivePropSchema>
}

// Clean Architecture: declarative registration never imports browser components at build time.
export const liveComponents: Record<string, LiveComponentRegistration> = {
  Counter: {
    module: '@live/Counter',
    props: { initialCount: { type: 'number' } }
  },
  Diagram: {
    module: '@live/InteractiveDiagram',
    props: { active: { type: 'number', integer: true, min: 0, max: 2 } }
  }
}

/** Literal parsing establishes JSON safety; schemas constrain each public prop. */
export function matchesLiveProp(value: unknown, schema: LivePropSchema) {
  const type =
    value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (type !== schema.type) return false
  return (
    typeof value !== 'number' ||
    (Number.isFinite(value) &&
      (!schema.integer || Number.isInteger(value)) &&
      (schema.min === undefined || value >= schema.min) &&
      (schema.max === undefined || value <= schema.max))
  )
}

const UNSAFE_NAMES = new Set(['__proto__', 'prototype', 'constructor'])

export function isUnsafeLiveProperty(name: string) {
  return UNSAFE_NAMES.has(name)
}
