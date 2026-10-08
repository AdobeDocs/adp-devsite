import { test } from '@playwright/test';
import { createHeadingPermalinkCases } from '../heading-permalink-test-utils.mjs';

const pages = [
  {
    name: 'Support',
    path: '/developer-distribution/creative-cloud/docs/support/',
    heading: 'Adobe Developer Distribution Support',
    sections: [
      { title: 'Frequently Asked Questions', id: 'frequently-asked-questions' },
      { title: 'Developer Forums', id: 'developer-forums' },
      { title: 'Bugs and Feature Requests', id: 'bugs-and-feature-requests' },
      { title: 'Formal Support Requests', id: 'formal-support-requests' },
    ],
  },
  {
    name: 'Guide',
    path: '/developer-distribution/creative-cloud/docs/guides/',
    heading: 'Adobe Developer Distribution',
    sections: [
      { title: 'Overview', id: 'overview' },
      {
        title: 'Developer Distribution New Listing Use Cases for UXP Plugin Listings',
        id: 'developer-distribution-new-listing-use-cases-for-uxp-plugin-listings',
      },
      { title: 'Access the Developer Distribution Portal', id: 'access-the-developer-distribution-portal' },
      { title: 'Next Steps', id: 'next-steps' },
    ],
  },
];

for (const example of pages) {
  test.describe(`${example.name} heading permalinks`, () => {
    const { beforeEach, cases } = createHeadingPermalinkCases(example);
    test.beforeEach(beforeEach);
    for (const scenario of cases) test(scenario.name, scenario.run);
  });
}
