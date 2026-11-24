# Visual snapshots

## When to update a baseline

- Generate a new baseline only after behavioral assertions pass.
- On an unexpected diff, keep the baseline and follow [`diagnose.md`](diagnose.md).
- When intent is unclear, ask before generating or replacing a baseline.

## Capture the resting state

A block screenshot shows its **resting state** unless hover, focus, open, pressed, or dragged state is the subject. After the semantic assertions and before capturing:

- Move the pointer to a safe coordinate outside the target; a fixed header or overlay can occupy `(0, 0)`.
- Blur the last interacted control.
- Close menus, pickers, and popovers.

Screenshot the block or `.{block}-wrapper` locator (when wrapper styling is part of the block) rather than the full page, using the configured viewport and browser project.

## Generate on Linux

Use the workflow's pinned Playwright Docker image for any focused local diagnosis run. Remove only platform artifacts, such as `*-darwin.png`, that this run created.

## Inspect every changed PNG

Open each new or updated image and confirm:

- The intended block state and variant.
- Correct fonts, with no fallbacks.
- Images fully loaded and correct.
- No loading skeletons or undecorated markup.
- No AI-assistant bubbles, metadata, contributor UI, navigation, or other overlays.
- No clipping, unexpected whitespace, scrollbars, or wrong dimensions.
- No leftover hover, focus, active, or open styling.
- Content and order that match the fixture contract.

A matching comparison proves consistency with the baseline, not that the baseline is correct.

## Verify

Rerun the focused test without `--update-snapshots`. Report each inspected snapshot by path with its Linux comparison result.
