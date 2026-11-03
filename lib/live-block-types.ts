export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type LiveBlockInstance = {
  id: string
  moduleId: string
  props: Record<string, JsonValue>
}
