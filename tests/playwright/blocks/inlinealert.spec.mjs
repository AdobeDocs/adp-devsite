import { expect, test } from '@playwright/test';
import {
  hideNonComponentContent,
  openDevDocsReferencePage,
} from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/inline-alert/';
const codeHeading = 'Example for inline alert with code';
const codeExample = [
  'function greet(name) {',
  '  return "Hello, " + name + "!";',
  '}',
  '',
  'console.log(greet("Inline Alert")); // Output: Hello, Inline Alert!!',
  '',
].join('\n');
const examples = [
  {
    name: 'defaults to info without an authored variant',
    variant: 'info',
    message: 'This is an info alert.',
    icon: '/hlx_statics/icons/info.svg#icon-info',
    snapshot: 'inlinealert-info.png',
  },
  {
    name: 'renders the help variant',
    variant: 'help',
    message: 'This is an help alert.',
    icon: '/hlx_statics/icons/help-icon.svg#icon-help',
    snapshot: 'inlinealert-help.png',
  },
  {
    name: 'renders the error variant',
    variant: 'error',
    message: 'This is an error alert.',
    icon: '/hlx_statics/icons/warning-icon.svg#icon-alert',
    snapshot: 'inlinealert-error.png',
  },
  {
    name: 'renders the success variant',
    variant: 'success',
    message: 'This is a success alert.',
    icon: '/hlx_statics/icons/success-icon.svg#icon-success',
    snapshot: 'inlinealert-success.png',
  },
  {
    name: 'renders the warning variant',
    variant: 'warning',
    message: 'This is a warning alert.',
    icon: '/hlx_statics/icons/warning-icon.svg#icon-alert',
    snapshot: 'inlinealert-warning.png',
  },
  {
    name: 'renders the neutral variant without an icon',
    variant: 'neutral',
    message: 'This is a neutral alert.',
    snapshot: 'inlinealert-neutral.png',
  },
];

function getInlineAlert(page, text) {
  return page.locator('main .inlinealert.block').filter({ hasText: text });
}

async function expectVariant(block, variant, icon) {
  await expect(block).toHaveCount(1);
  await expect(block).toBeVisible();
  await expect(block).toHaveClass(new RegExp(`(^|\\s)spectrum-InLineAlert--${variant}(\\s|$)`));

  const alertIcon = block.locator('.spectrum-InLineAlert-icon');
  if (icon) {
    await expect(alertIcon).toHaveCount(1);
    await expect(alertIcon).toBeVisible();
    const iconUse = alertIcon.locator('use');
    await expect(iconUse).toHaveAttribute('href', icon);
    // The external sprite resolves asynchronously; until it does, the <use>
    // element has an empty bounding box and the icon renders blank.
    await expect.poll(() => iconUse.evaluate((element) => {
      const { width, height } = element.getBBox();
      return width > 0 && height > 0;
    }), { message: `${icon} should resolve to a rendered icon` }).toBe(true);
  } else {
    await expect(alertIcon).toHaveCount(0);
  }
}

async function expectVisual(page, block, snapshot) {
  await hideNonComponentContent(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(block).toHaveScreenshot(snapshot);
}

test.describe('InlineAlert reference', () => {
  test.beforeEach(async ({ page }) => {
    await openDevDocsReferencePage(page, {
      path,
      heading: 'Inline Alert',
    });

    // The authored heading alone does not prove that the eight alert examples
    // have finished mapping their slots and decorating their variants.
    await expect(page.locator('main .inlinealert.block')).toHaveCount(8);
    await expect(page.locator('main .inlinealert.block[data-block-status="loaded"]')).toHaveCount(8);

    // The Syntax code sample and the content header finish decorating after the
    // alerts load, shifting every example by a fractional offset that changes
    // screenshot antialiasing. Wait for both before measuring or capturing.
    await expect(page.locator('main .code.block .code-toolbar')).toHaveCount(1);
    await expect(page.locator('main .content-header .github-actions-wrapper')).toBeAttached();
  });

  examples.forEach((example) => {
    test(`${example.name} and matches its visual`, async ({ page }) => {
      const block = getInlineAlert(page, example.message);

      await expectVariant(block, example.variant, example.icon);
      await expect(block).toHaveAttribute('data-slots', 'text');
      await expect(block.locator('.spectrum-InLineAlert-header')).toHaveCount(0);
      const content = block.locator('.spectrum-InLineAlert-content');
      await expect(content).toHaveCount(1);
      await expect(content).toHaveText(example.message);
      await expect(content).toBeVisible();

      if (example.variant === 'info') {
        await expect(block).not.toHaveAttribute('data-variant');
        await expect(block).not.toHaveClass(/(^|\s)info(\s|$)/);
      } else {
        await expect(block).toHaveAttribute('data-variant', example.variant);
      }

      await expectVisual(page, block, example.snapshot);
    });
  });

  test('preserves a heading and rich text slots and matches its visual', async ({ page }) => {
    const block = getInlineAlert(page, 'Alternative steps:');
    await expectVariant(block, 'help', '/hlx_statics/icons/help-icon.svg#icon-help');

    const header = block.locator('.spectrum-InLineAlert-header');
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText('Alternative steps:');
    await expect(header).toBeVisible();

    const content = block.locator('.spectrum-InLineAlert-content');
    await expect(content).toHaveText([
      /^Step 1: This is faux step text for the text1 slot\./,
      /^Step 2: This is faux step text for the text2 slot\./,
      /^Step 3: This is faux step text for the text3 slot\./,
      /^Step 4: This is faux step text for the text4 slot\./,
    ]);
    await expect(content.locator('strong')).toHaveText(['Step 1:', 'Step 2:', 'Step 3:', 'Step 4:']);
    // Paragraph order is part of this fixture's text1 through text4 slot contract.
    for (const [index, slot] of ['text1', 'text2', 'text3', 'text4'].entries()) {
      await expect(content.nth(index)).toBeVisible();
      await expect(content.nth(index).locator('code.inline-code').first()).toHaveText(slot);
    }
    await expect(block.locator('pre, .code-toolbar')).toHaveCount(0);

    await expectVisual(page, block, 'inlinealert-rich.png');
  });

  test('decorates a heading and code slot and matches its visual', async ({ page }) => {
    const block = getInlineAlert(page, codeHeading);
    await expectVariant(block, 'info', '/hlx_statics/icons/info.svg#icon-info');
    await expect(block).toHaveAttribute('data-slots', 'heading, code');
    await expect(block).toHaveAttribute('data-variant', 'info');

    const header = block.locator('.spectrum-InLineAlert-header');
    await expect(header).toHaveCount(1);
    await expect(header).toHaveText(codeHeading);
    await expect(header).toBeVisible();

    const content = block.locator('.spectrum-InLineAlert-content');
    await expect(content).toHaveCount(1);
    await expect(content.locator('.code-toolbar')).toHaveCount(1);
    const pre = content.locator('pre');
    const code = pre.locator('code');
    await expect(pre).toBeVisible();
    await expect(pre).toHaveClass(/(^|\s)line-numbers(\s|$)/);
    await expect(pre).toHaveClass(/(^|\s)language-js(\s|$)/);
    await expect(code).toHaveClass(/(^|\s)language-js(\s|$)/);
    await expect(code.locator('.token.keyword').filter({ hasText: /^function$/ })).toBeVisible();
    await expect(code.locator('.line-numbers-rows > span')).toHaveCount(5);
    // Unlike toHaveText with a string, this also checks indentation and newlines.
    expect(await code.textContent()).toBe(codeExample);
    await expect(block.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
    await expect(block.getByRole('button')).toHaveCount(1);

    await expectVisual(page, block, 'inlinealert-code.png');
  });

  test('copies only the embedded code to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });
    // A previous clipboard value must not let a broken copy operation pass.
    await page.evaluate(() => navigator.clipboard.writeText(''));

    const block = getInlineAlert(page, codeHeading);
    await block.getByRole('button', { name: 'Copy', exact: true }).click();

    await expect(block.getByRole('button', {
      name: 'Copied to your clipboard',
      exact: true,
    })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(codeExample);
  });
});
