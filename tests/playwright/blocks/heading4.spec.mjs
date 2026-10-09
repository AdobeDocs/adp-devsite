import { test } from '@playwright/test';
import { createHeadingFixtureCases } from '../heading-permalink-test-utils.mjs';

test.describe('H4 browser fixtures heading permalinks', () => {
  const { beforeEach, cases } = createHeadingFixtureCases(4);
  test.beforeEach(beforeEach);
  for (const scenario of cases) test(scenario.name, scenario.run);
});
