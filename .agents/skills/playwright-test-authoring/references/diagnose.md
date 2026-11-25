# Diagnose a failing or flaky test

## Gather evidence

Reproduce the smallest failing test against the same target and platform as CI. Read Playwright's error context, the actual, expected, and diff images, the trace, and browser logs before changing code or baselines. Baselines stay as they are during diagnosis; a regenerated baseline hides the cause.

## Classify

Name the category the evidence supports:

- **Product regression**: behavior or rendering no longer meets the requirement. Report it; fix production code only when the user asks.
- **Fixture drift**: authored content, order, or identifiers changed.
- **Readiness race**: the test observes before a readiness signal.
- **Page UI contamination**: metadata, contributors, navigation, AI assistant, or another overlay appears in the screenshot.
- **Weak locator**: a positional or broad selector matches the wrong element.
- **Environment mismatch**: platform, viewport, browser, fonts, or base URL differs from CI.
- **Intentional visual change**: the requirements authorize a new baseline; continue with [`snapshots.md`](snapshots.md).

## Fix

Fix the cause the category names, using the core rules in [`SKILL.md`](../SKILL.md). Keep retries, timeouts, tolerances, and `maxDiffPixels` at their current values unless measured evidence shows unavoidable rendering noise.

## Verify

A flake fix is done when the focused test passes with `--repeat-each=10` and zero failures. Then run every spec affected by shared changes and the Linux comparison. Remove only temporary artifacts this run created.

Add the category, evidence, fix, repetitions, and residual uncertainty to the **Finish** report.
