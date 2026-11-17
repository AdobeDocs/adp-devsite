import { expect, test } from '@playwright/test';
import { openDevDocsReferencePage } from '../visual-test-utils.mjs';

const path = '/dev-docs-reference/blocks/announcement/';
const chatWindow = '#ai-assistant-chat-window';
const viewToggle = '#ai-assistant-view-toggle';
const testConversation = {
  messages: [
    {
      id: 'test-question',
      content: 'Which Adobe APIs should I start with?',
      source: 'user',
    },
    {
      id: 'test-answer',
      content: 'Start with the API overview and its authentication guide.',
      source: 'ai',
    },
  ],
  suggestedQuestions: [
    { label: 'API overview', question: 'Show me the API overview' },
    { label: 'Authentication', question: 'Explain authentication' },
    { label: 'SDKs', question: 'Which SDKs are available?' },
    { label: 'Examples', question: 'Show me an example' },
  ],
  sessionId: null,
};

async function openAssistant(page) {
  await page.route(
    '**/marked@18.0.5/lib/marked.umd.js*',
    (route) => route.fulfill({
      contentType: 'application/javascript',
      body: [
        'window.marked = { use() {}, parse(text) {',
        'return `<p>${text}</p>`;',
        '} };',
      ].join(' '),
    }),
  );
  await page.route(
    '**/dompurify@3.4.11/dist/purify.min.js*',
    (route) => route.fulfill({
      contentType: 'application/javascript',
      body: [
        'window.DOMPurify = { setConfig() {}, addHook() {},',
        'sanitize(html) { return html; } };',
      ].join(' '),
    }),
  );
  await page.addInitScript((conversation) => {
    try {
      sessionStorage.setItem('ai-assistant-chat-history', JSON.stringify(conversation));
    } catch {
      // Storage may be unavailable in the initial about:blank document.
    }
    try {
      localStorage.setItem('ai-assistant-enabled', 'true');
    } catch {
      // Storage may be unavailable in the initial about:blank document.
    }
  }, testConversation);

  await openDevDocsReferencePage(page, {
    path,
    heading: 'Announcement Block',
  });

  const launcher = page.locator('#ai-assistant-chat-button');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.locator(chatWindow)).toBeVisible();
  await expect(page.locator('.chat-bubble')).toHaveCount(2);
  await expect(page.locator('.chat-suggested-questions-button')).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
}

async function hidePageContent(page) {
  await page.addStyleTag({
    content: `
      body *:not(.ai-assistant-wrapper):not(.ai-assistant-wrapper *) {
        visibility: hidden !important;
      }
      .ai-assistant-wrapper { visibility: visible !important; }
      .chat-bubble-timestamp { visibility: hidden !important; }
    `,
  });
}

async function waitForAssistantImages(page) {
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((image) => image.decode().catch(() => {})),
    );
  });
}

test.describe('AI Assistant dialog and compact view', () => {
  test(
    'switches views without resetting the conversation and closes with Escape',
    async ({ page }) => {
      await openAssistant(page);

      const window = page.locator(chatWindow);
      const toggle = page.locator(viewToggle);
      const textarea = page.getByRole('textbox', {
        name: 'Enter a question for the AI Assistant',
      });
      const messages = page.locator('.chat-bubble');
      const originalMessages = await messages.allTextContents();

      await expect(page.locator('#ai-assistant-chat-button')).toBeHidden();
      await textarea.fill('A draft that should survive the layout change');
      await expect(toggle).toHaveAttribute('aria-label', 'Expand to dialog view');
      await expect(toggle).toHaveAttribute('title', 'Expand to dialog view');
      await expect(toggle).toHaveAttribute(
        'daa-ll',
        'DevsiteAI Assistant:Expand to dialog view',
      );
      await toggle.click();

      await expect(window).toHaveAttribute('aria-modal', 'true');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle).toHaveAttribute('aria-label', 'Return to compact view');
      await expect(toggle).toHaveAttribute('title', 'Return to compact view');
      await expect(toggle).toHaveAttribute(
        'daa-ll',
        'DevsiteAI Assistant:Return to compact view',
      );
      await expect(page.locator('.ai-assistant-wrapper'))
        .toHaveClass(/ai-assistant-expanded/);
      await expect(page.locator('body > header')).toHaveJSProperty('inert', true);
      await expect(textarea).toHaveValue(
        'A draft that should survive the layout change',
      );
      expect(await messages.allTextContents()).toEqual(originalMessages);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

      await page.locator('.chat-window-backdrop').click({
        position: { x: 10, y: 10 },
      });
      await expect(window).toHaveAttribute('aria-modal', 'true');

      await toggle.click();
      await expect(window).toHaveAttribute('aria-modal', 'false');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toHaveAttribute('aria-label', 'Expand to dialog view');
      await expect(toggle).toHaveAttribute('title', 'Expand to dialog view');
      await expect(toggle).toHaveAttribute(
        'daa-ll',
        'DevsiteAI Assistant:Expand to dialog view',
      );
      await expect(page.locator('.ai-assistant-wrapper'))
        .not.toHaveClass(/ai-assistant-expanded/);
      await expect(textarea).toHaveValue(
        'A draft that should survive the layout change',
      );
      expect(await messages.allTextContents()).toEqual(originalMessages);
      expect(await page.evaluate(() => document.body.style.overflow))
        .not.toBe('hidden');
      await expect(page.locator('body > header')).toHaveJSProperty('inert', false);

      await toggle.click();
      await page.keyboard.press('Escape');
      await expect(window).toBeHidden();
      await expect(page.locator('#ai-assistant-chat-button')).toBeFocused();

      // Reopening always starts in compact mode, while keeping the transcript.
      await page.locator('#ai-assistant-chat-button').click();
      await expect(window).toBeVisible();
      await expect(window).toHaveAttribute('aria-modal', 'false');
      await expect(page.locator(viewToggle)).toHaveAttribute('aria-expanded', 'false');
      expect(await messages.allTextContents()).toEqual(originalMessages);
    },
  );

  test(
    'fills the viewport on mobile and at 768px, then returns to desktop sizing',
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openAssistant(page);

      const window = page.locator(chatWindow);
      await page.locator(viewToggle).click();

      const phoneBox = await window.boundingBox();
      expect(phoneBox).not.toBeNull();
      expect(phoneBox.x).toBe(0);
      expect(phoneBox.y).toBe(0);
      expect(phoneBox.width).toBe(390);
      expect(phoneBox.height).toBe(844);

      for (const selector of [
        '.chat-window-clear',
        viewToggle,
        '.chat-window-close',
      ]) {
        const controlBox = await page.locator(selector).boundingBox();
        expect(controlBox).not.toBeNull();
        expect(controlBox.x).toBeGreaterThanOrEqual(phoneBox.x);
        expect(controlBox.x + controlBox.width).toBeLessThanOrEqual(
          phoneBox.x + phoneBox.width,
        );
      }

      await page.setViewportSize({ width: 768, height: 900 });
      const tabletBox = await window.boundingBox();
      expect(tabletBox).not.toBeNull();
      expect(tabletBox.x).toBe(0);
      expect(tabletBox.y).toBe(0);
      expect(tabletBox.width).toBe(768);
      expect(tabletBox.height).toBe(900);

      await page.setViewportSize({ width: 769, height: 900 });
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(769);
      const desktopBox = await window.boundingBox();
      expect(desktopBox).not.toBeNull();
      expect(desktopBox.x).toBeCloseTo(76.9, 1);
      expect(desktopBox.y).toBe(45);
      expect(desktopBox.width).toBeCloseTo(615.2, 1);
      expect(desktopBox.height).toBe(810);
    },
  );

  test('matches compact and expanded desktop visuals', async ({ page }) => {
    await openAssistant(page);
    await hidePageContent(page);
    await waitForAssistantImages(page);

    await expect(page).toHaveScreenshot('ai-assistant-compact.png');

    await page.locator(viewToggle).click();
    await expect(page.locator(chatWindow)).toHaveAttribute('aria-modal', 'true');
    await page.mouse.move(0, 0);
    await waitForAssistantImages(page);
    await expect(page).toHaveScreenshot('ai-assistant-expanded.png');
  });
});
