# Write or extend a spec

## 1. Place the coverage

Decide whether the behavior is DevDocs-only, DevBiz-only, shared (cover it with DevDocs), or genuinely distinct on both. Extend the block's existing spec; create a `<block>.<feature>.spec.mjs` only for a feature with its own setup or fixture.

## 2. Build a coverage matrix

Before editing, fill in one row per requirement:

| Requirement | Behavioral evidence | Visual evidence | Fixture |
|-|-|-|-|
| Example requirement | Role, class, state, text, or computed style | Snapshot, if presentation matters | DevDocs or DevBiz |

Every row has behavioral evidence. If a requirement is missing or conflicts with the fixture, ask before implementing.

## 3. Implement

Write a behavioral test per behavior; add a visual test only where pixel presentation matters. Data-driven cases suit variants with the same assertion shape; keep each case name and expected identity explicit. A dedicated test fixture may be improved when that is within the request.

### Custom controls

For a custom picker, menu, popover, or DOM-rendered select:

1. Open it with the user interaction.
2. Wait for its open-state readiness signal.
3. Assert which choices are visible and which are hidden or absent.
4. Close it unless the open state is the subject.

Select options by visible label or accessible name, and assert the selected label:

```js
await picker.selectOption({ label: 'server.py' });
```

Use a value or index only when it is itself the fixture contract.

Native select popups are often not exposed to DOM locators. Then assert the closest reliable user-visible seam and note the limitation in the test.

## 4. Validate

Run the focused spec. For baselines, follow [`snapshots.md`](snapshots.md). Then complete **Finish** in [`SKILL.md`](../SKILL.md).
