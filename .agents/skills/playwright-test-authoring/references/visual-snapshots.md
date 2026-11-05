# Visual snapshot workflow

The current Playwright section of [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md) is authoritative. Read it before generating or updating snapshots.

## Authorization policy

| Situation | Action |
|-|-|
| A new visual test needs its first baseline | Generate after behavioral assertions pass, then inspect it. |
| An existing snapshot unexpectedly differs | Diagnose; do not update the baseline. |
| The requirement confirms an intentional visual change | Generate and inspect the updated Linux baseline. |
| A behavior-only change causes no intended rendering change | Keep the existing baseline. |
| Intent is unclear | Ask the user before generating or replacing a baseline. |

CI never accepts snapshot updates automatically.

## Before capturing

- Confirm the target fixture contains the intended state.
- Assert block decoration using a specific readiness signal.
- Wait for `document.fonts.ready`.
- Verify required images loaded successfully when they affect rendering.
- Call `hideNonComponentContent(page)` for component screenshots.
- Prefer a component-level locator over a page screenshot.
- Confirm the configured viewport and browser project are intentional.

## Capture the intended interaction state

A component screenshot normally represents its resting state. Before capturing, clear transient pointer and focus state left by setup interactions unless hover, focus, open-popup, pressed, or dragged state is the subject of the screenshot.

- Move the pointer to a known safe coordinate outside the screenshot target. Do not assume `(0, 0)` is safe when a fixed header or overlay occupies it.
- Blur the previously interacted control when its focus treatment is not part of the intended state.
- Close menus, pickers, and popovers unless their open state is being tested.
- Assert the semantic state first, then reset transient interaction state, then capture the screenshot.

## Linux generation

GitHub Actions is canonical. Follow **Generate snapshots with GitHub Actions** in `CONTRIBUTING.md` for branch-backed changes.

For local generation, follow **Generate snapshots locally with Act**. Use the workflow's current pinned Playwright image and options; do not assume a remembered image tag or digest is still current. A direct focused Docker run is acceptable for diagnosis or comparison when it uses that exact image, but the documented workflow remains authoritative.

A macOS-generated `*-darwin.png` is not a substitute for the Linux baseline. Track and remove only platform artifacts created by the current run; never delete pre-existing user artifacts.

## Inspect every changed PNG

Open every new or updated image and check for:

- The intended component state and variant.
- Missing or fallback fonts.
- Missing, partially loaded, or wrong images.
- Loading skeletons or undecorated markup.
- AI-assistant bubbles, metadata, contributor UI, navigation, or other unrelated overlays.
- Clipping, unexpected whitespace, scrollbars, and wrong dimensions.
- Accidental hover, focus, active, or open-control styling left by test setup.
- Content or ordering that does not match the fixture contract.

A passing pixel comparison proves consistency with the baseline, not correctness of the baseline.

## Verify after generation

Run the focused test again in comparison mode without `--update-snapshots`. If shared helpers or configuration changed, run all affected Playwright specs. Report each inspected snapshot by path and state whether Linux comparison succeeded.
