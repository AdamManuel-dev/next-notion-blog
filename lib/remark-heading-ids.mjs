/**
 * `{#id}` heading, paragraph and list-item syntax for the MDX pipeline.
 *
 * Extracted from `lib/mdx-content.mjs` so the content renderer and the source
 * guards in `tests/markdown-source.test.mjs` parse markers the same way.
 */

/**
 * `{#id}` syntax: the character codes the tokenizer below recognises.
 *
 * Ids stay deliberately boring — the Notion migration minted hex ids and hand
 * written ones use `a-z0-9_-` — so the grammar never has to guess where an id
 * ends, and anything else falls through to MDX's own `{expression}` parsing.
 */
const OPEN_BRACE = 123
const CLOSE_BRACE = 125
const HASH = 35

function isIdCode(code) {
  return (
    code !== null &&
    ((code >= 48 && code <= 57) || // 0-9
      (code >= 65 && code <= 90) || // A-Z
      (code >= 97 && code <= 122) || // a-z
      code === 45 || // -
      code === 95) // _
  )
}

/**
 * Micromark text construct for `{#id}`.
 *
 * MDX would hand `{` to its expression tokenizer, where `#id` is a JavaScript
 * syntax error, so this construct claims the sequence first and produces a
 * `headingId` token instead. Anything that is not exactly `{#`, one or more id
 * characters and `}` is rejected, and micromark restores the position so the
 * MDX expression construct still sees ordinary `{...}` expressions.
 */
function tokenizeHeadingId(effects, ok, nok) {
  return start

  function start(code) {
    effects.enter('headingId')
    effects.enter('headingIdMarker')
    effects.consume(code) // `{`
    return afterOpen
  }

  function afterOpen(code) {
    if (code !== HASH) return nok(code)
    effects.consume(code)
    effects.exit('headingIdMarker')
    return beforeValue
  }

  function beforeValue(code) {
    if (!isIdCode(code)) return nok(code)
    effects.enter('headingIdValue')
    return insideValue(code)
  }

  function insideValue(code) {
    if (isIdCode(code)) {
      effects.consume(code)
      return insideValue
    }
    if (code !== CLOSE_BRACE) return nok(code)
    effects.exit('headingIdValue')
    effects.enter('headingIdMarker')
    effects.consume(code) // `}`
    effects.exit('headingIdMarker')
    effects.exit('headingId')
    return ok
  }
}

/** Registered on `{` only, so every other character keeps its usual meaning. */
const headingIdSyntax = {
  text: { [OPEN_BRACE]: { name: 'headingId', tokenize: tokenizeHeadingId } }
}

/** Keep literal text as the value: image alt text is flattened during parsing. */
const headingIdFromMarkdown = {
  enter: {
    headingId(token) {
      this.enter({ type: 'headingId', value: '', id: '' }, token)
    }
  },
  exit: {
    headingIdValue(token) {
      const node = this.stack[this.stack.length - 1]
      node.id = this.sliceSerialize(token)
      node.value = `{#${node.id}}`
    },
    headingId(token) {
      this.exit(token)
    }
  }
}

/**
 * Folds trailing heading/paragraph markers and leading list-item markers into IDs.
 *
 * Because the marker is parsed rather than pattern matched, code fences,
 * inline code, escaped braces (`\{#id}`), JSX children and ordinary `{}`
 * expressions are untouched: they never produce a `headingId` token. A marker
 * outside these positions is restored as the literal text the author wrote.
 */
function applyHeadingIds(node) {
  const children = node.children
  if (!Array.isArray(children)) return

  // Keep syntax interpretation in this AST adapter, independent of HTML rendering.
  if (node.type === 'listItem') {
    const paragraph = children.find((child) => child.type === 'paragraph')
    const first = paragraph?.children[0]
    const following = paragraph?.children[1]
    if (
      first?.type === 'headingId' &&
      (!following ||
        (following.type === 'text' && /^[ \t\n\r]/.test(following.value)))
    ) {
      paragraph.children.shift()
      if (following?.type === 'text') {
        following.value = following.value.replace(/^ /, '')
        if (!following.value) paragraph.children.shift()
      }
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id: first.id }
      }
    }
  }

  if (node.type === 'heading' || node.type === 'paragraph') {
    const last = children[children.length - 1]
    if (last && last.type === 'headingId') {
      children.pop()
      const previous = children[children.length - 1]
      if (previous && previous.type === 'text') {
        previous.value = previous.value.replace(/[ \t]+$/, '')
        if (!previous.value) children.pop()
      }
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id: last.id }
      }
    }
  }

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]
    if (child.type === 'headingId') {
      children[index] = {
        type: 'text',
        value: child.value,
        position: child.position
      }
      continue
    }
    applyHeadingIds(child)
  }

  // Tight list items unwrap their paragraphs in remark-rehype, losing the id.
  // Keep an addressed paragraph as a real <p>, even in an otherwise tight list.
  if (
    node.type === 'listItem' &&
    children.some(
      (child) => child.type === 'paragraph' && child.data?.hProperties?.id
    )
  ) {
    node.spread = true
  }
}

/**
 * Lets headings/paragraphs end and list items begin with `{#stable-id}`.
 *
 * The syntax is taught to the parser instead of being rewritten in the source,
 * so only real heading or paragraph text can carry a marker. Registered as a micromark text
 * extension (ahead of MDX's expression tokenizer) plus the matching
 * `fromMarkdown` handlers; no new dependency is involved.
 */
function remarkHeadingIds() {
  const data = this.data()
  const add = (field, value) => {
    const list = data[field] || (data[field] = [])
    list.push(value)
  }
  // A line-leading marker must reach paragraph parsing instead of MDX's
  // flow-expression parser, which would reject `#id` before text parsing starts.
  for (const extension of data.micromarkExtensions || []) {
    const flow = extension.flow?.[OPEN_BRACE]
    const expression = (Array.isArray(flow) ? flow : [flow]).find(
      (construct) => construct?.name === 'mdxFlowExpression'
    )
    if (!expression) continue
    const guardedExpression = {
      ...expression,
      tokenize(effects, ok, nok) {
        const ordinaryExpression = expression.tokenize.call(
          this,
          effects,
          ok,
          nok
        )
        return effects.check(
          { tokenize: tokenizeHeadingId },
          nok,
          ordinaryExpression
        )
      }
    }
    extension.flow = {
      ...extension.flow,
      [OPEN_BRACE]: Array.isArray(flow)
        ? flow.map((construct) =>
            construct === expression ? guardedExpression : construct
          )
        : guardedExpression
    }
    break
  }
  // Micromark prepends later constructs, ahead of MDX's expression tokenizer.
  add('micromarkExtensions', headingIdSyntax)
  add('fromMarkdownExtensions', headingIdFromMarkdown)
  return function transform(tree) {
    applyHeadingIds(tree)
  }
}

export default remarkHeadingIds
