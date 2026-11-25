# Review Playwright changes

Review the diff, including new and changed snapshots, against the originating requirement; without one, state that requirement coverage cannot be fully assessed. Bound the review to the changed behavior and its dependencies: changed specs, helpers, config, and snapshots; the target block's implementation, styles, and fixture; neighboring tests and baselines.

## Priorities

Report findings in this order:

1. Tests that can pass while required behavior is broken.
2. Flaky, timing-dependent, or environment-dependent tests.
3. Incorrect, stale, or contaminated snapshots.
4. Missing or partial requirement coverage.
5. Brittle fixtures and locators, or duplicated setup.
6. Style issues with concrete maintenance impact.

Each finding cites the file and changed line, describes a realistic failure, and recommends the smallest correction.

## Checklist

Apply every core rule in [`SKILL.md`](../SKILL.md) to each changed test, then check:

- Does each assertion trace to intended behavior, not only current implementation?
- Did a baseline update conceal a regression?
- Was every new or updated PNG inspected against the list in [`snapshots.md`](snapshots.md)?
- Does `npx playwright test --list --test-list <file>` list every new test under the block's specs?
- Was production code changed only for test convenience?
- Were pre-existing test artifacts left in place?

Conclude with validations performed, evidence gaps, and a concise verdict. Review mode is read-only unless the user asks for fixes.
