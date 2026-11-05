# Review Playwright changes

Review the requested diff and its new or changed snapshots. Establish the originating requirement; when it is unavailable, say that spec coverage cannot be fully assessed.

## Evidence to inspect

- Changed specs, helpers, configuration, and snapshots.
- Target block implementation and styles.
- DevDocs or DevBiz fixture used by the test.
- Existing neighboring tests and baselines.
- Current Playwright guidance in `CONTRIBUTING.md`.
- Focused test results in the pinned Linux environment when available.

Use Scout MCP or Scout CLI for source discovery when available. Keep the review bounded to changed behavior and its dependencies.

## Priorities

Report findings in this order:

1. Tests that can pass while required behavior is broken.
2. Flaky, timing-dependent, or environment-dependent tests.
3. Incorrect, stale, or contaminated snapshots.
4. Missing or partial requirement coverage.
5. Brittle fixtures, locators, and duplicated setup.
6. Style concerns only when they have concrete maintenance impact.

For each finding, cite the file and changed line, describe a realistic failure scenario, and recommend the smallest correction. Do not report preferences without practical impact.

## Review checklist

- Does every assertion trace to intended behavior rather than current implementation alone?
- Do visual cases have semantic assertions?
- Are navigation and component readiness explicit?
- Are fonts and required images ready?
- Is `networkidle` or an arbitrary timeout hiding uncertainty?
- Are screenshots scoped to the component and free of unrelated UI?
- Were new or updated PNGs actually inspected?
- Does a DevBiz test cover DevBiz-specific behavior?
- Are positional locators guarded by counts and variant identity?
- Did a snapshot update conceal a regression?
- Are existing shared helpers reused?
- Is every new test declared in a discoverable `<block>.spec.mjs` or `<block>.<feature>.spec.mjs` file, not in a module imported by another spec? Confirm with `npx playwright test --list --test-list <file>` listing the block's specs.
- Were production changes introduced merely for test convenience?
- Are test artifacts and the working tree handled safely?

Conclude with validations performed, evidence gaps, and a concise verdict. Do not modify code in review mode unless the user asks for fixes.
