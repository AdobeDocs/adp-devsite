---
name: playwright-test-authoring
description: Playwright e2e tests and visual snapshots under tests/playwright. Use when writing or extending a spec, fixing a failing or flaky test, reviewing Playwright changes, or creating or updating snapshot baselines.
---

# Playwright Test Authoring

Tests prove intended behavior, not current output.

## Start

1. Read the Playwright section of [`CONTRIBUTING.md`](../../../CONTRIBUTING.md). It owns commands, the CI workflow, preview URLs, and Linux snapshot generation; this skill covers only what it does not.
2. Run `git status --short` and note existing reports, traces, screenshots, and result files. Leave everything you did not create in place.
3. Load the reference for each mode the task involves:
   - Writing or extending a spec: [`references/author.md`](references/author.md)
   - Failing or flaky test: [`references/diagnose.md`](references/diagnose.md)
   - Reviewing changes: [`references/review.md`](references/review.md)
   - Creating or updating a baseline, alongside the above: [`references/snapshots.md`](references/snapshots.md)

## Establish intent

Rank evidence in this order: the issue or user requirements, the authored fixture and documented design, existing tests for the same behavior, then the implementation. Read the block's implementation and styles, its fixture, existing spec and baselines, shared helpers, and `playwright.config.mjs`; stop once you know the behavior and where to test it.

If intended behavior is still ambiguous, summarize the evidence and ask one targeted question before writing tests or snapshots.

## Core rules

### Files

- Name specs after the `hlx_statics/blocks/<block>/` directory, not the reference URL slug when they differ (e.g. `inlinealert.spec.mjs` for `/dev-docs-reference/blocks/inline-alert/`).
- Declare every test in a spec file Playwright discovers directly. `--test-list` filters by declaring file, so a test declared in an imported helper module is silently skipped by CI's affected-test runs.

### Fixtures

- **DevDocs** fixtures (`/dev-docs-reference/blocks/`) are controlled; use them for shared behavior.
- **DevBiz** fixtures (`/tools/sidekick/blocks/`) are for DevBiz-only behavior or variants; state why in the test.
- The **fixture contract** is what the authored page guarantees: its content, its variants, and, where a test depends on it, its order.

### Setup

- DevDocs: call `openDevDocsReferencePage(page, { path, heading })` from `tests/playwright/visual-test-utils.mjs`, then add block-specific readiness signals.
- Visual tests on either site: call `hideNonComponentContent(page)` to remove the site header, metadata, contributor, and AI-assistant UI.
- Keep tests independent; Playwright runs files and tests in parallel.

### Readiness signals

A visible heading proves navigation, not decoration. Wait on a **readiness signal** produced by the behavior under test:

- `data-block-status="loaded"` on the block.
- A decorated child or class, or a known count of decorated elements.
- An expected role and accessible name.
- Images with `complete === true` and `naturalWidth > 0` when loading matters.
- `document.fonts.ready` before any visual assertion.

Readiness signals stand in for sleeps, `networkidle`, and raised timeouts.

### Locators

Scope locators to the target block, preferring in order:

1. Role and accessible name.
2. Stable authored attribute or meaningful variant class.
3. Block-scoped structural selector.
4. Position, only when authored order is part of the fixture contract.

A DevBiz `.nth(index)` needs all of: an assertion on total block count, an ordered variant table, an identity assertion (class or semantics) for each index before use, and a comment that order is part of the fixture contract.

### Assertions

- Behavioral assertions prove decoration and state; screenshots prove presentation. Every visual case also asserts semantically that the intended variant rendered.
- Prove user-visible behavior with user-visible evidence. An implementation class, attribute, or internal state can supplement that proof, not replace it.

### Scope

- Reuse existing helpers. A new test-only helper needs two real callers, and every spec that uses it must pass.
- Keep block-specific selectors, fixture assumptions, and readiness signals in the spec.
- Change production code only when the user asks. If stable testing needs a production seam, explain why and request approval.
- Mobile and dedicated accessibility suites are opt-in: add them when requested or when the requirement depends on responsive or accessibility behavior.

## Finish

Done means:

- Focused behavioral tests pass, then Linux visual comparisons when screenshots are involved.
- Every affected spec passes when shared Playwright files changed.
- `git diff --check` is clean.

Linux baselines are the reference: only a Linux comparison counts as a visual pass. If Docker, Act, or the branch preview is unavailable, run what you can and mark Linux verification as blocked, pointing to `CONTRIBUTING.md`.

Report:

- Files changed.
- Behavioral coverage added or verified.
- Commands run and their results.
- Every new or updated snapshot, inspected.
- Validation that remains blocked.
- Residual risks and intentional omissions.
