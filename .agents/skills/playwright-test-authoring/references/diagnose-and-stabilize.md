# Diagnose or stabilize Playwright tests

## Preserve evidence first

Before running anything:

1. Inspect `git status --short`.
2. Note pre-existing reports, traces, screenshots, and result files.
3. Do not delete or overwrite artifacts you did not create.

Reproduce the smallest failing test against the same target and platform as CI when possible. Read Playwright's error context, actual/expected/diff images, trace, and relevant browser logs before changing code or baselines.

## Classify the failure

Determine which category has evidence:

- **Product regression** — behavior or rendering no longer meets the requirement.
- **Fixture drift** — authored content, order, or identifiers changed.
- **Readiness race** — the test observes before decoration, fonts, or images are ready.
- **Unrelated page UI** — metadata, contributors, navigation, AI assistant, or another overlay contaminates a component screenshot.
- **Weak locator** — positional or broad selectors now target the wrong element.
- **Environment mismatch** — local platform, viewport, browser, fonts, or base URL differs from CI.
- **Intentional visual change** — requirements explicitly authorize a new baseline.

Do not use snapshot regeneration as a diagnostic technique. A changed baseline can conceal the cause.

## Stabilization rules

- Replace timing guesses with behavior-specific readiness assertions.
- Use `document.fonts.ready` for visual stability.
- Require `naturalWidth > 0` when image loading must succeed; `complete` alone is insufficient.
- Use `hideNonComponentContent` for unrelated page-level UI.
- Prefer semantic and block-scoped locators.
- If DevBiz order is unavoidable, assert count and per-index identity.
- Keep retries, tolerances, and `maxDiffPixels` unchanged unless measured evidence proves unavoidable rendering noise.
- Do not introduce broad waits or raise timeouts merely to make a race disappear.

## Verification

Re-run the focused test repeatedly when diagnosing flakiness, then run all specs affected by shared setup changes. Verify visual comparisons in the workflow's pinned Linux environment.

If the environment or preview is unavailable, state what remains unverified and direct the user to the Playwright workflow in `CONTRIBUTING.md`.

Clean only temporary artifacts created during this run. Report the failure category, supporting evidence, fix, repetitions performed, and residual uncertainty.
