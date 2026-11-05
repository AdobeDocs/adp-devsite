---
name: playwright-test-authoring
description: Author, extend, review, diagnose, stabilize, and intentionally update Playwright end-to-end and visual tests for adp-devsite AEM block pages. Use for DevDocs or DevBiz block coverage, Playwright failures, flaky screenshots, visual baselines, and reviews of changes under tests/playwright.
---

# Playwright Test Authoring

Build trustworthy Playwright coverage for this repository. Tests must prove intended behavior rather than merely record current output.

## Start every task

1. Read the current Playwright section of [`CONTRIBUTING.md`](../../../CONTRIBUTING.md). It is authoritative.
2. Inspect `git status --short` before running commands or editing. Record pre-existing generated artifacts and never delete or overwrite them accidentally.
3. Classify the request into one or more modes:
   - **Author or extend** — load [`references/author-and-extend.md`](references/author-and-extend.md).
   - **Diagnose or stabilize** — load [`references/diagnose-and-stabilize.md`](references/diagnose-and-stabilize.md).
   - **Review** — load [`references/review.md`](references/review.md).
   - **Create or update snapshots** — additionally load [`references/visual-snapshots.md`](references/visual-snapshots.md).
4. Always load [`references/repository-conventions.md`](references/repository-conventions.md).
5. Use Scout MCP when available, otherwise Scout CLI, for repository discovery. Read known files directly. If Scout is unavailable, report that limitation before using narrower fallback discovery.

Only load references needed by the selected mode.

## Establish intent before editing

Use these sources in order:

1. The issue, specification, or explicit user requirements.
2. The authored reference fixture and documented design.
3. Established tests for the same behavior.
4. The implementation as supporting evidence.

Inspect enough context to understand the target block implementation and styles, its fixture, existing spec and snapshots, nearby conventions, shared helpers, and Playwright configuration. Stop instead of scanning the whole repository once the behavior and test seam are understood.

If intended behavior remains ambiguous, summarize the evidence and ask a targeted question. Do not write speculative tests or throwaway snapshots while waiting for confirmation.

## Non-negotiable policies

- Prefer controlled DevDocs fixtures for shared block behavior.
- Use DevBiz fixtures only for DevBiz-specific behavior and state why they are needed.
- Add behavioral assertions before visual assertions.
- Use explicit component readiness signals; do not use `networkidle` as a substitute.
- Prefer roles, accessible names, stable classes, and authored attributes.
- Positional DevBiz locators are allowed only with the safeguards in the repository conventions.
- Use existing test helpers before adding another abstraction.
- Extract a new test helper only when at least two real callers need it.
- Do not modify production code unless the user explicitly asks.
- Preserve existing suite structure and naming unless correctness or genuine reuse requires a change.
- Do not add mobile or dedicated accessibility coverage unless requested. Continue using semantic locators and assertions where applicable.
- Do not commit or push unless explicitly asked.

## Completion contract

Run focused behavioral tests first, then Linux visual comparisons when screenshots are involved. Run every affected spec when shared Playwright infrastructure changes. Also run `git diff --check`. 

If Docker, Act, or the branch preview is unavailable, run what is possible, clearly mark Linux visual verification as blocked, and point the user to the current Playwright instructions in `CONTRIBUTING.md`.

Finish with:

- Files changed.
- Behavioral coverage added or verified.
- Commands run and their results.
- Every new or updated snapshot inspected.
- Validation that remains blocked.
- Residual risks or intentional omissions.

Never claim a visual suite passes based only on a non-Linux comparison when the repository contains Linux baselines.
