# Visual snapshots

## When to update a baseline

| Situation | Action |
|-|-|
| A new visual test needs its first baseline | Generate it after behavioral assertions pass. |
| An existing snapshot unexpectedly differs | Keep the baseline and follow [`diagnose.md`](diagnose.md). |
| Requirements confirm an intentional visual change | Generate the updated Linux baseline. |
| A behavior-only change has no intended rendering change | Keep the baseline. |
| Intent is unclear | Ask before generating or replacing a baseline. |

## Capture the resting state

A block screenshot shows its **resting state** unless hover, focus, open, pressed, or dragged state is the subject. After the semantic assertions and before capturing:

- Move the pointer to a safe coordinate outside the target; a fixed header or overlay can occupy `(0, 0)`.
- Blur the last interacted control.
- Close menus, pickers, and popovers.

Screenshot the block or `.{block}-wrapper` locator (when wrapper styling is part of the block) rather than the full page, using the configured viewport and browser project.

## Generate on Linux

Follow **Generate snapshots with GitHub Actions** or **Generate snapshots locally with Act** in [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md), with the workflow's current pinned image. A focused Docker run on that exact image is fine for diagnosis. Remove only platform artifacts, such as `*-darwin.png`, that this run created.

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
