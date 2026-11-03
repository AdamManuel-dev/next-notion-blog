# Historical fragment migrations

These one-time tools record the successive source migrations. They are not part
of production rendering or routine content authoring. Run from the repository
root, in this order when replaying an old content tree:

```sh
node scripts/migrations/clean-block-markup.mjs
node scripts/migrations/migrate-fragment-slugs.mjs
node scripts/migrations/remove-standalone-anchors.mjs
node scripts/migrations/merge-fragmented-lists.mjs
```

Each command defaults to a dry run; append `--write` to apply it. The first
converts legacy HTML block markup, the second pins readable fragment names and
records historical aliases, and the third removes compatibility directives while
flattening aliases onto real blocks. That historical conversion retained singleton
list boundaries; the fourth is an intentional semantic repair that joins related
items into ordinary lists and restores continuous numbering. Back up historical
inputs before replaying. The repair stages and validates all affected pages and
fragment aliases before writing; rerunning completed migrations reports no changes.

The list repair removes only empty comments separating compatible singleton lists.
It preserves quote separators, item-leading comments, nested ownership, prose and
code. Leading `{#item-id}` markers pin each repaired real `<li>` to its former
container permalink. Historical aliases and former generated IDs are mapped to
the intended item or unchanged block—not merely any surviving ID. This repair
intentionally changes list containers and spacing; exact legacy HTML equality is
not its acceptance criterion. The syntax-only formatter remains a separate,
semantics-preserving tool.

```sh
node --test tests/migration/tooling/*.test.mjs
node --test tests/block-ids.test.mjs tests/fragment-aliases.test.mjs
```

`remark-legacy-block-ids.mjs` and `rehype-legacy-fragments.mjs` preserve retired
`::anchor` interpretation and placeholder neighbor binding solely for replay and
auditing. `legacy-content.mjs` injects them through the shared MDX compiler seam;
it does not duplicate the renderer. Production rejects retired directives and
allocates targets once, using `content/fragment-aliases.json` for old URLs.
Native authored HTML (including id-only `<a>` elements) remains ordinary HTML:
it is never consumed, interpreted as a placeholder, or rebound to a neighbor.
Use a real block ID plus sidecar aliases for compatibility URLs.

The frozen `tests/migration/local-content.test.mjs` remains separate from these
tooling tests. Do not regenerate content or the alias sidecar merely to run tests.
