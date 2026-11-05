# Author or extend a Playwright suite

## 1. Discover the test seam

Use Scout MCP or Scout CLI when available to find the target block implementation, styles, existing spec, shared helpers, and relevant neighboring tests. Inspect the authored DevDocs or DevBiz fixture and any existing baselines.

Determine whether the requested behavior belongs to:

- DevDocs only.
- DevBiz only.
- Shared behavior best covered by DevDocs.
- Distinct behavior that genuinely needs coverage in both.

Do not duplicate equivalent coverage across DevDocs and DevBiz without a stated reason.

## 2. Establish expected behavior

Build a small internal coverage matrix before editing:

| Requirement | Behavioral evidence | Visual evidence | Fixture |
|-|-|-|-|
| Example requirement | Role, class, state, text, or computed style | Snapshot if presentation matters | DevDocs or DevBiz |

Every material visual variant needs a semantic assertion proving that the intended variant was selected and decorated. If requirements are missing or conflict with the fixture, ask the user to confirm before implementing.

## 3. Design deterministic setup

- Assert navigation succeeded.
- For DevDocs, use `openDevDocsReferencePage`.
- Wait on component-specific decoration signals.
- Wait for fonts before screenshots.
- Use `hideNonComponentContent` in visual tests.
- Scope locators to the target block.
- Avoid arbitrary sleeps and `networkidle`.
- Guard unavoidable DevBiz indexes with count and identity assertions.

Keep each test independent; Playwright runs files and tests in parallel.

Extend the block's existing `<block>.spec.mjs` by default. When a distinct feature needs its own setup or fixture, create `<block>.<feature>.spec.mjs` beside it; see the naming rules in `repository-conventions.md`.

## 4. Implement the smallest complete coverage

Prefer a behavioral test for each behavior and a visual test only where pixel presentation matters. Data-driven cases are useful when variants share the same assertion shape, but keep case names and expected identity explicit.

Do not modify production code unless explicitly asked. If stable testing requires a production seam, explain the problem and request approval. A dedicated test fixture may be improved when that is clearly within the user's request.

Use existing helpers first. Add or deepen a test-only helper without asking only when at least two actual callers benefit and all affected specs can be validated.

### Test user-visible control behavior

Do not use an implementation class, attribute, or internal state as the only proof of behavior a user can see.

For a custom picker, menu, popover, or DOM-rendered select:

1. Open the control using its user interaction.
2. Wait for an explicit open-state or popup readiness signal.
3. Assert which choices are visible and which are hidden or absent.
4. Close the control when the test is not specifically testing its open state.

A state-class assertion may supplement these checks, but cannot replace them.

When selecting a user-facing picker option, prefer its visible label or accessible name over an internal numeric value or authored position:

```js
await picker.selectOption({ label: 'server.py' });
```

Assert the selected option's visible label as well. Use a value or index only when that value or ordering is itself the documented fixture contract.

Native browser select popups are not consistently available to DOM locators. When the browser does not expose popup options, assert the closest reliable user-visible seam and document that limitation rather than treating a CSS class as visibility proof.

## 5. Validate

1. Run the focused non-visual behavior or focused spec.
2. If adding snapshots, follow `visual-snapshots.md`.
3. Run every affected spec when shared helpers changed.
4. Run `git diff --check`.
5. Inspect `git status` and report exactly what was generated.

Do not commit unless requested.
