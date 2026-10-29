import { expect, test } from '@playwright/test';
import { openDevDocsReferencePage } from '../visual-test-utils.mjs';

const penpalScriptUrl = 'https://unpkg.com/penpal@^6/dist/penpal.min.js';
const devDocsEmbedUrl = 'https://codesandbox.io/embed/example';
const devBizEmbedUrl = 'https://developer.adobe.com/apis/';
const iframeHash = '#iframe-e2e';

async function mockExternalIframeDependencies(page) {
  // The block appends its iframe only after Penpal loads. Stub this third-party
  // boundary so the test exercises the block's decoration deterministically.
  await page.route(penpalScriptUrl, (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `window.penpalStub = { connections: [], visibilityCalls: 0 };
    window.Penpal = {
      connectToChild(options) {
        window.penpalStub.connections.push(options);
        return {
          promise: Promise.resolve({
            onHide() { window.penpalStub.visibilityCalls += 1; },
            onPopState() {},
            onShow() { window.penpalStub.visibilityCalls += 1; },
          }),
        };
      },
    };`,
  }));

  // The embedded applications are independently deployed and their pixels are
  // outside this component's contract. Keep their documents inert while
  // retaining the real URLs asserted below.
  await page.route(/^https:\/\/codesandbox\.io\/embed\/example(?:\?.*)?$/, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>CodeSandbox test iframe</title>',
  }));
  await page.route(/^https:\/\/developer\.adobe\.com\/apis\/(?:\?.*)?$/, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>DevBiz test iframe</title>',
  }));
}

async function decoratedIframeIn(page) {
  const wrapper = page.locator('main .iframe-wrapper');
  const iframe = wrapper.locator(':scope > iframe#penpalIframe');

  // The iframe is appended in the Penpal script's load handler, so it proves
  // decoration completed rather than merely that the authored page loaded.
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveClass(/\biframe-container\b/);
  await expect(wrapper.locator('.iframe.block')).toHaveCount(0);

  // The stub records the handshake, so a missed route (real Penpal loaded) or a
  // broken connection both fail here instead of passing silently.
  await expect.poll(() => page.evaluate(() => {
    const stub = window.penpalStub;
    return {
      connectedToBlockIframe: stub?.connections.length === 1
        && stub.connections[0].iframe === document.querySelector('#penpalIframe'),
      visibilityCalls: stub?.visibilityCalls,
    };
  }), { message: 'the block should connect Penpal to its iframe and notify the child once' })
    .toEqual({ connectedToBlockIframe: true, visibilityCalls: 1 });

  return iframe;
}

test.describe('Iframe reference', () => {
  test.beforeEach(async ({ page }) => mockExternalIframeDependencies(page));

  test('decorates the DevDocs source and forwards the initial fragment', async ({ page }) => {
    await openDevDocsReferencePage(page, {
      path: `/dev-docs-reference/blocks/iframe/${iframeHash}`,
      heading: 'Iframe Block',
    });

    const iframe = await decoratedIframeIn(page);
    await expect(iframe).toHaveAttribute('src', `${devDocsEmbedUrl}${iframeHash}`);
  });

  test('decorates the DevBiz link and forwards query and fragment state', async ({ page }) => {
    const query = 'e2eIframeParam=forwarded';
    const response = await page.goto(`/tools/sidekick/blocks/iframe?${query}${iframeHash}`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response, 'the DevBiz reference page should return an HTTP response').not.toBeNull();
    expect(response.ok(), `DevBiz reference page returned ${response.status()}`).toBeTruthy();

    const iframe = await decoratedIframeIn(page);
    await expect(iframe).toHaveAttribute('src', `${devBizEmbedUrl}?${query}${iframeHash}`);
  });
});
