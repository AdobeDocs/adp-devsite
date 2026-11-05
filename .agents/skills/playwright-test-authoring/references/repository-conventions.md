# Repository conventions

Read the current Playwright section of [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) before relying on this summary.

## Files and execution

- Block specs live at `tests/playwright/blocks/<block>.spec.mjs`. A block may also have feature specs named `tests/playwright/blocks/<block>.<feature>.spec.mjs`, for example `ai-assistant.citations.spec.mjs`. Separate the feature name with a dot, never a hyphen: block names can contain hyphens (`info` and `info-card` are different blocks).
- Declare every test in a `*.spec.mjs` file that Playwright discovers directly. Never declare tests in a helper module imported by a spec: `--test-list` filters by the file where each test is declared, so CI's affected-test runs silently skip them.
- Baselines live beside them in `<spec>.mjs-snapshots/` and use Playwright's generated platform suffix.
- Configuration lives in `playwright.config.mjs`.
- Pull requests test their AEM preview at `https://<normalized-branch>--adp-devsite--adobedocs.aem.page`.
- `scripts/playwright-affected-tests.mjs` maps block implementation, spec, and snapshot changes to every spec of that block: `<block>.spec.mjs` and its `<block>.<feature>.spec.mjs` files. Shared Playwright files, including `tests/playwright/fixtures/`, trigger the full suite.
- GitHub Actions is authoritative for Linux snapshots. Act and the workflow's pinned Playwright container are the supported local Linux paths.

Inspect these files because commands and image versions can change; do not freeze their current contents into generated code.

## DevDocs and DevBiz fixtures

Prefer `/dev-docs-reference/blocks/` for shared behavior because these are controlled test fixtures. Use `/tools/sidekick/blocks/` only when behavior or authored variants are specific to DevBiz.

For DevDocs setup, reuse:

```js
await openDevDocsReferencePage(page, {
  path,
  heading: 'Expected H1',
});
```

Import it from `tests/playwright/visual-test-utils.mjs`. Keep block-specific readiness checks in the spec after this call.

For visual tests on either site, reuse:

```js
await hideNonComponentContent(page);
```

This removes unrelated metadata, contributor UI, and AI-assistant UI from component screenshots.

## Readiness

A visible authored heading proves navigation, not block decoration. Wait for a signal produced by the behavior under test, such as:

- The block's `data-block-status="loaded"` state.
- A decorated child or class.
- An expected role and accessible name.
- A known count of decorated elements.
- An image with both `complete === true` and `naturalWidth > 0` when successful loading matters.
- `document.fonts.ready` before visual assertions.

Do not use `networkidle` to hide uncertainty. Avoid arbitrary sleeps.

## Locators

Prefer this order:

1. Role plus accessible name.
2. Stable authored attribute or meaningful variant class.
3. A block-scoped structural selector.
4. Positional selectors only when authored order is the fixture contract.

When DevBiz requires `.nth(index)`, require all of the following:

- Assert the total expected block count.
- Define an ordered variant table.
- Assert each indexed block's identifying class or semantics before using it.
- Comment that authored order is part of the fixture contract.

## Scope and reuse

Behavioral assertions establish that decoration worked; screenshots establish presentation. Do not use a screenshot as the only assertion for meaningful state or behavior.

Keep block-specific selectors, fixture assumptions, and readiness checks local. Shared helpers should hide repeated mechanics behind a small interface and have at least two real callers. Never move production behavior into test utilities.

Preserve nearby naming and organization. Do not opportunistically rename snapshots, rewrite loops, or reformat unrelated code.

Mobile and dedicated accessibility suites are not required by default. Add them only when requested or when the requirement specifically depends on responsive or accessibility behavior.
