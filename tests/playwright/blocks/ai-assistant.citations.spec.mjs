import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { expect, test as base } from '@playwright/test';
import { openDevDocsReferencePage } from '../visual-test-utils.mjs';

const recorded = (await readFile(new URL('../fixtures/ai-assistant-citations.sse', import.meta.url), 'utf8'))
  .split('\n').filter((line) => line.startsWith('data: '))
  .map((line) => JSON.parse(line.slice(6)));
const sampleAnswer = recorded.filter(({ type }) => type === 'content').map(({ text }) => text).join('');
const sampleCitations = recorded.filter(({ type }) => type === 'citation');
const content = (text) => ({ type: 'content', text });
const citation = (references, start, end) => ({
  type: 'citation',
  citation: { retrievedReferences: references, textRange: { start, end } },
});
const ref = (url, title, label) => ({ metadata: { url, title }, label });
const url = (name) => `https://example.com/${name}`;
const markers = '.chat-bubble-inline-source';
const groups = '.chat-bubble-inline-sources';
const sourceLinks = '.chat-bubble-sources-item a';
const answerSelector = '.chat-bubble[data-message-id="citation-test"]';

// Use the real pinned runtime libraries, not identity sanitizers or fake Markdown.
// These are CDN asset requests only; no assistant/model calls create fixtures.
let libraries;
base.beforeAll(async ({ request }) => {
  libraries = await Promise.all([
    'https://unpkg.com/marked@18.0.5/lib/marked.umd.js',
    'https://unpkg.com/dompurify@3.4.11/dist/purify.min.js',
  ].map(async (asset) => {
    const response = await request.get(asset);
    expect(response.ok()).toBeTruthy();
    return response.body();
  }));
});

const test = base.extend({
  conversation: [{
    messages: [{ id: 'welcome', source: 'ai', content: 'Welcome.' }],
    suggestedQuestions: [], sessionId: null,
  }, { option: true }],
  startStream: [true, { option: true }],
  assistant: async ({ page, conversation, startStream }, use) => {
    let stream;
    let connected;
    const connection = new Promise((resolve) => { connected = resolve; });
    const unexpected = [];
    const feedback = [];
    const answerRequests = [];
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
    // A local fixture transport, not a page/dev server. A redirect allows real
    // fetch/reader/SSE delivery to be gated without buffering route.fulfill.
    const server = createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Headers', '*');
      if (request.method === 'OPTIONS') {
        response.writeHead(204).end();
        return;
      }
      if (request.url !== '/stream' || request.method !== 'POST' || stream) {
        unexpected.push(`fixture: ${request.method} ${request.url}`);
        response.writeHead(500).end();
        return;
      }
      stream = response;
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      response.flushHeaders();
      connected();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const fixtureUrl = `http://127.0.0.1:${server.address().port}/stream`;
    await page.route('**/*', async (route) => {
      const request = route.request();
      const target = new URL(request.url());
      const headers = request.headers();
      const isBackend = target.hostname.includes('devsite-rag') || Boolean(headers['x-api-key']);
      if (isBackend && request.url() !== fixtureUrl) {
        const endpoint = target.pathname;
        const method = request.method();
        if (method === 'GET' && endpoint === '/v1/inference/collections') {
          await route.fulfill({ json: [] });
        } else if (method === 'POST' && endpoint === '/v1/inference/retrieve/generate/stream'
          && startStream && answerRequests.length === 0) {
          answerRequests.push(request.postDataJSON());
          await route.fulfill({
            status: 307,
            headers: { location: fixtureUrl, 'Access-Control-Allow-Origin': '*' },
          });
        } else if (method === 'POST' && endpoint === '/v1/inference/feedback/citation-test') {
          feedback.push(request.postDataJSON());
          await route.fulfill({ json: { success: true } });
        } else {
          unexpected.push(`${method} ${request.url()}`);
          await route.abort('blockedbyclient');
        }
        return;
      }
      // The unrelated header's IMS check otherwise rejects with an opaque
      // "http" page error on localhost (CORS). Keep a deterministic signed-out
      // response so UI-error assertions can catch real history regressions.
      if (target.hostname.startsWith('adobeid-') && target.pathname.startsWith('/ims/')) {
        await route.fulfill({ json: { error: 'login_required' } });
      } else if (request.url().includes('/marked@18.0.5/')) {
        await route.fulfill({ contentType: 'application/javascript', body: libraries[0] });
      } else if (request.url().includes('/dompurify@3.4.11/')) {
        await route.fulfill({ contentType: 'application/javascript', body: libraries[1] });
      } else {
        await route.continue();
      }
    });
    await page.addInitScript((seed) => {
      localStorage.setItem('ai-assistant-enabled', 'true');
      // Seed once, never overwrite finalized sessionStorage on reload.
      if (!sessionStorage.getItem('ai-assistant-chat-history')) {
        sessionStorage.setItem('ai-assistant-chat-history', JSON.stringify(seed));
      }
      window.copiedTexts = [];
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (text) => { window.copiedTexts.push(text); } },
      });
    }, conversation);
    // CI pages are public HTTPS previews; Chromium's Local Network Access policy
    // otherwise blocks the redirected stream to this loopback fixture server.
    await page.context().grantPermissions(['local-network-access']);
    await openDevDocsReferencePage(page, {
      path: '/dev-docs-reference/blocks/announcement/', heading: 'Announcement Block',
    });
    await openLoadedAssistant(page);
    const input = page.getByRole('textbox', { name: 'Enter a question for the AI Assistant' });
    const send = (...events) => events.forEach((event) => stream.write(`data: ${JSON.stringify(event)}\n\n`));
    const answer = page.locator(answerSelector);
    if (startStream) {
      await input.fill('Citation verification');
      await input.press('Enter');
      await connection;
      send({ type: 'metadata', requestId: 'citation-test', sessionId: 'mock-session', collectionId: 'mock-collection' });
      await expect(answer).toBeVisible();
    }
    const finish = async (...events) => {
      send(...events, { type: 'complete' });
      stream.end();
      await expect(page.getByRole('button', { name: 'Stop response' })).toHaveCount(0);
    };
    try {
      await use({ send, finish, answer, input, feedback, unexpected, fixtureUrl, answerRequests });
    } finally {
      stream?.end();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      expect(unexpected, 'Unexpected assistant traffic is blocked, never sent to a real backend').toEqual([]);
      expect(pageErrors, 'Citation/history metadata must not cause UI errors').toEqual([]);
    }
  },
});

async function sourceUrls(answer) {
  return answer.locator(sourceLinks).evaluateAll((links) => links.map((link) => link.getAttribute('href')));
}

async function savedAnswer(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('ai-assistant-chat-history'))
    .messages.find(({ id }) => id === 'citation-test'));
}

async function openLoadedAssistant(page) {
  await expect(page.locator('.ai-assistant')).toHaveAttribute('data-block-status', 'loaded');
  await page.waitForFunction(() => window.marked && window.DOMPurify);
  await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
  await expect(page.locator('.chat-window')).toBeVisible();
}

async function savedConversation(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('ai-assistant-chat-history')));
}

async function presentation(answer) {
  return answer.evaluate((element) => {
    const links = (container, selector) => [...container.querySelectorAll(selector)].map((link) => ({
      text: link.textContent,
      href: link.getAttribute('href'),
      name: link.getAttribute('aria-label'),
      target: link.getAttribute('target'),
      rel: link.getAttribute('rel'),
      analytics: link.getAttribute('daa-ll'),
    }));
    return {
      groups: [...element.querySelectorAll('.chat-bubble-inline-sources')]
        .map((group) => links(group, 'a')),
      sources: [...element.querySelectorAll('.chat-bubble-sources-item')].map((item) => ({
        ...links(item, 'a')[0],
        sourceNumber: item.querySelector('.chat-bubble-sources-item-marker').textContent,
      })),
    };
  });
}

async function reloadAnswer(page, answer) {
  const before = await presentation(answer);
  const saved = await savedConversation(page);
  const count = await page.locator('.chat-bubble').count();
  const response = await page.reload({ waitUntil: 'domcontentloaded' });
  expect(response.ok()).toBeTruthy();
  await openLoadedAssistant(page);
  await expect(answer).toBeVisible();
  await expect(page.locator('.chat-bubble')).toHaveCount(count);
  expect(await presentation(answer)).toEqual(before);
  expect(await savedConversation(page)).toEqual(saved);
  await expect(page.getByRole('log').locator('div').filter({ hasText: /^Assistant:/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop response', exact: true })).toHaveCount(0);
  await expect(answer.locator('.chat-bubble-actions')).toHaveCount(1);
}

test.describe('AI Assistant finalized inline citations', () => {
  test('recorded sample: deferred markers, final bullet, shared numbering, actions and copy', async ({ page, assistant }) => {
    const { send, finish, answer, input, feedback } = assistant;
    expect(sampleAnswer).toHaveLength(1864);
    send(content(sampleAnswer.slice(0, 400)), sampleCitations[0]);
    await expect(answer).toContainText('Its main components');
    await expect(answer.locator(markers)).toHaveCount(0);
    await expect(answer.locator('.chat-bubble-sources')).toHaveCount(0);
    send(content(sampleAnswer.slice(400)), ...sampleCitations.slice(1));
    await expect(answer).toContainText('Adobe partners');
    await expect(answer.locator(groups)).toHaveCount(0);
    await expect(answer.locator('.chat-bubble-actions')).toHaveCount(0);
    await expect(input).toBeFocused();
    send({ type: 'answerComplete' });
    await expect(answer.locator(groups)).toHaveCount(5);
    expect(await answer.locator(markers).allTextContents()).toEqual(['1', '2', '1', '1', '2', '3']);
    await expect(answer.locator(sourceLinks)).toHaveCount(3);
    await expect(answer.locator('.chat-bubble-content strong')).toHaveCount(4);
    await expect(answer.locator('.chat-bubble-content li')).toHaveCount(8);
    await expect(answer.locator('.chat-bubble-content li').last()).toHaveText(/GraphQL2$/);
    await expect(input).toBeFocused();
    const announcement = page.getByRole('log').locator('div').filter({ hasText: /^Assistant:/ });
    await expect(announcement).toHaveCount(1);
    await expect(announcement).toContainText('3 sources available.');
    await expect(announcement).toContainText('GraphQL\n');
    expect(await announcement.textContent()).not.toContain('GraphQL2');
    const persisted = await savedAnswer(page);
    expect(persisted.content).toBe(sampleAnswer);
    expect(persisted.references.map(({ url: href }) => href)).toEqual(await sourceUrls(answer));
    send({ type: 'answerComplete' });
    await finish({ type: 'followupQuestions', followupQuestions: [{ label: 'Next', text: 'Next question' }] });
    await expect(answer.locator(groups)).toHaveCount(5);
    await expect(answer.locator('.chat-bubble-actions')).toHaveCount(1);
    await expect(announcement).toHaveCount(1);
    expect(await savedAnswer(page)).toEqual(persisted);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
    const disclosure = answer.getByRole('button', { name: 'Sources', exact: true });
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(answer.locator(sourceLinks).first()).toBeVisible();
    await expect(answer.locator('.chat-bubble-sources-favicon-images img')).toHaveCount(3);
    await expect(answer.locator(sourceLinks).first()).toHaveAttribute('daa-ll', 'DevsiteAI Assistant:Message:Sources:Link');
    await answer.getByRole('button', { name: 'Copy response', exact: true }).click();
    expect(await page.evaluate(() => window.copiedTexts)).toEqual([sampleAnswer]);
    await answer.getByRole('button', { name: 'Upvote answer', exact: true }).click();
    await expect(answer.getByRole('button', { name: 'Upvote answer', exact: true })).toHaveAttribute('data-selected', 'true');
    expect(feedback).toHaveLength(1);

    expect(persisted.citations).toEqual([
      { start: 0, end: 377, sourceUrls: persisted.references.slice(0, 2).map(({ url: href }) => href) },
      { start: 378, end: 1045, sourceUrls: [persisted.references[0].url] },
      { start: 1046, end: 1262, sourceUrls: [persisted.references[0].url] },
      { start: 1263, end: 1706, sourceUrls: [persisted.references[1].url] },
      { start: 1707, end: 1863, sourceUrls: [persisted.references[2].url] },
    ]);
    expect(Object.keys(persisted).sort()).toEqual(['citations', 'content', 'context', 'id', 'references', 'source', 'timestamp']);
    persisted.references.forEach((reference) => expect(Object.keys(reference).sort()).toEqual(['title', 'url']));
    await reloadAnswer(page, answer);
    await expect(answer.locator(groups)).toHaveCount(5);
    await expect(answer.locator(markers)).toHaveCount(6);
    await expect(answer.locator(sourceLinks)).toHaveCount(3);
    await expect(answer.locator('.chat-bubble-content strong')).toHaveCount(4);
    await expect(answer.locator('.chat-bubble-content li')).toHaveCount(8);
    await expect(answer.locator('.chat-bubble-content li').last()).toHaveText(/GraphQL2$/);
    await expect(input).toBeFocused();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
    await expect(answer.getByRole('button', { name: 'Upvote answer', exact: true })).toHaveAttribute('data-selected', 'true');
    const restoredDisclosure = answer.getByRole('button', { name: 'Sources', exact: true });
    await expect(restoredDisclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(answer.locator(sourceLinks).first()).toBeHidden();
    await restoredDisclosure.click();
    await expect(answer.locator(sourceLinks).first()).toBeVisible();
    await restoredDisclosure.click();
    await expect(answer.locator(sourceLinks).first()).toBeHidden();
    await answer.getByRole('button', { name: 'Copy response', exact: true }).click();
    expect(await page.evaluate(() => window.copiedTexts)).toEqual([sampleAnswer]);
    await answer.getByRole('button', { name: 'Downvote answer', exact: true }).click();
    await expect(answer.getByRole('button', { name: 'Downvote answer', exact: true })).toHaveAttribute('data-selected', 'true');
    expect(feedback.at(-1)).toMatchObject({ score: 0, query: 'Citation verification', collectionId: 'mock-collection' });
    expect(assistant.answerRequests).toHaveLength(1);
    expect((await savedConversation(page)).sessionId).toBe('mock-session');
    expect((await savedAnswer(page)).timestamp).toBe(persisted.timestamp);
    await expect(answer.locator('.chat-bubble-timestamp')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
    await expect(answer.locator('.chat-bubble-actions')).toHaveCount(1);
    await expect(page.locator('.chat-bubble')).toHaveCount(3);
  });

  test('shuffled overlapping ranges, same-endpoint merging, repeats and Sources-only ordering round trip', async ({ page, assistant }) => {
    const { send, finish, answer } = assistant;
    const text = 'First.\n\nSecond.\n\nThird.';
    send(content(text),
      citation([ref(url('only'))]),
      citation([ref(url('long'))], 0, text.length),
      citation([ref(url('second')), ref(url('first'))], 8, 15),
      citation([ref(url('first')), ref(url('tie'))], 0, 6),
      citation([ref(url('tie')), ref(url('merged'))], 1, 6),
      citation([ref(url('first'))], 0, 6),
      citation([ref(url('first')), ref(url('long'))], 0, text.length));
    await finish({ type: 'answerComplete' });
    expect(await sourceUrls(answer)).toEqual(['first', 'tie', 'merged', 'second', 'long', 'only'].map(url));
    expect(await answer.locator(groups).allTextContents()).toEqual(['123', '14', '15']);
    expect(await answer.locator(markers).allTextContents()).toEqual(['1', '2', '3', '1', '4', '1', '5']);
    await reloadAnswer(page, answer);
    expect((await savedAnswer(page)).citations).toEqual([
      { start: 0, end: 6, sourceUrls: ['first', 'tie', 'merged'].map(url) },
      { start: 8, end: 15, sourceUrls: ['first', 'second'].map(url) },
      { start: 0, end: text.length, sourceUrls: ['first', 'long'].map(url) },
    ]);
  });

  test('malformed metadata and ranges survive; title upgrades and exact URL identities are safe', async ({ page, assistant }) => {
    const { send, finish, answer } = assistant;
    const text = 'A valid answer.';
    send(content(text),
      ...[null, [], 'bad', {}, { retrievedReferences: {} }, { retrievedReferences: 'bad' }]
        .map((value) => ({ type: 'citation', citation: value })),
      citation([null, 3, {}, { metadata: null }, ref('http://example.com'), ref('javascript:alert(1)'), ref('invalid'), ref({})], 0, text.length),
      citation([ref(url('upgrade'), '  ', ' ')]),
      citation([ref(url('upgrade'), null, 'First label')]),
      citation([ref(url('upgrade'), null, 'Later label')]),
      citation([ref(url('upgrade'), '<img src=x onerror=alert(1)>')], 0, text.length),
      citation([ref(url('upgrade'), 'Later metadata')]),
      citation([ref(url('label'), '', ' Label fallback ')], 0, text.length),
      citation([ref(url('label'), null, 'Equal-priority conflict')]),
      citation([ref(url('fallback'))], 0, text.length),
      citation([ref(`${url('fallback')}/`), ref(`${url('fallback')}#part`)], 0, text.length),
      ...[[-1, 2], [0, 0], [3, 2], [0.5, 2], [0, 1000], ['0', 2], [0, 2.5], [null, 2]]
        .map(([start, end], index) => citation([ref(url(`invalid-${index}`))], start, end)),
      { type: 'citation', citation: { retrievedReferences: [ref(url('span-only'))], span: { start: 0, end: text.length } } });
    await finish({ type: 'answerComplete' });
    await expect(answer).toContainText(text);
    await expect(answer.locator(markers)).toHaveCount(5);
    await expect(answer.locator(sourceLinks)).toHaveCount(14);
    expect((await sourceUrls(answer)).slice(0, 5)).toEqual([
      url('upgrade'), url('label'), url('fallback'), `${url('fallback')}/`, `${url('fallback')}#part`,
    ]);
    await expect(answer.locator(markers).first()).toHaveAccessibleName('Source 1: <img src=x onerror=alert(1)> (opens in a new tab)');
    expect(await answer.locator(sourceLinks).allTextContents()).toEqual([
      '<img src=x onerror=alert(1)>', 'Label fallback', url('fallback'), `${url('fallback')}/`, `${url('fallback')}#part`,
      ...Array.from({ length: 8 }, (_, index) => url(`invalid-${index}`)), url('span-only'),
    ]);
    await expect(answer.locator('.chat-bubble-content img')).toHaveCount(0);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });

  test('safe Markdown endpoints preserve emphasis, links, inline/fenced code and code-copy decoration', async ({ page, assistant }) => {
    const { send, finish, answer } = assistant;
    const paragraphs = [
      '**Bold** and *emphasis*.',
      '[Guide](https://example.com/guide) and `inline()`.',
      '- First bullet\n- Final bullet',
      '```js\nconst value = 42;\nconsole.log(value);\n```\n',
      'After code.',
    ];
    const text = paragraphs.join('\n\n');
    let end = 0;
    const events = paragraphs.map((part, index) => {
      end += part.length + (index ? 2 : 0);
      return citation([ref(url('code'), 'Code guide')], 0, end);
    });
    send(content(text), ...events);
    const guide = answer.getByRole('link', { name: 'Guide', exact: true });
    await expect(guide).toBeVisible();
    await guide.focus();
    await finish({ type: 'answerComplete' }, { type: 'answerComplete' },
      content('Ignored late content'), citation([ref(url('late'))], 0, text.length));
    await expect(answer.locator(groups)).toHaveCount(5);
    await expect(answer).not.toContainText('Ignored late content');
    await expect(guide).toBeFocused();
    await expect(answer.locator('strong')).toHaveText('Bold');
    await expect(answer.locator('em')).toHaveText('emphasis');
    await expect(answer.getByRole('link', { name: 'Guide', exact: true })).toHaveAttribute('target', '_blank');
    await expect(answer.locator('p code')).toHaveText('inline()');
    await expect(answer.locator('.chat-bubble-content li').last()).toHaveText('Final bullet1');
    await expect(answer.locator('a a, code a')).toHaveCount(0);
    await expect(answer.locator('pre.line-numbers code')).toContainText('const value = 42;');
    await expect(answer.locator('pre .token.keyword').first()).toHaveText('const');
    await expect(answer.locator('.line-numbers-rows > span')).toHaveCount(2);
    await expect(answer.locator('.copy-to-clipboard-button')).toHaveCount(1);
    await answer.locator('.copy-to-clipboard-button').click();
    expect((await page.evaluate(() => window.copiedTexts)).at(-1)).toContain('const value = 42;');
    await expect(answer.locator('.chat-bubble-actions')).toHaveCount(1);
    await reloadAnswer(page, answer);
    await expect(answer.locator(groups)).toHaveCount(5);
    await expect(answer.locator('pre.line-numbers')).toHaveCount(1);
    await expect(answer.locator('pre .token.keyword').first()).toHaveText('const');
    await expect(answer.locator('.line-numbers-rows')).toHaveCount(1);
    await expect(answer.locator('.line-numbers-rows > span')).toHaveCount(2);
    await expect(answer.locator('.code-toolbar')).toHaveCount(1);
    await expect(answer.locator('.toolbar')).toHaveCount(1);
    await expect(answer.locator('.copy-to-clipboard-button')).toHaveCount(1);
    await answer.locator('.copy-to-clipboard-button').click();
    expect((await page.evaluate(() => window.copiedTexts)).at(-1)).toContain('const value = 42;');
    await answer.getByRole('button', { name: 'Copy response', exact: true }).click();
    expect((await page.evaluate(() => window.copiedTexts)).at(-1)).toBe(text);
  });

  test('no usable sources leaves ordinary prose/actions and an uncited announcement', async ({ page, assistant }) => {
    assistant.send(content('Uncited **answer**.'), citation([null, ref('http://example.com'), ref('javascript:alert(1)')], 0, 18));
    await assistant.finish({ type: 'answerComplete' });
    await expect(assistant.answer.locator(markers)).toHaveCount(0);
    await expect(assistant.answer.locator('.chat-bubble-sources')).toHaveCount(0);
    await expect(assistant.answer.locator('strong')).toHaveText('answer');
    await expect(assistant.answer.locator('.chat-bubble-actions')).toHaveCount(1);
    await expect(page.getByRole('log').locator('div').last()).toHaveText('Assistant: Uncited answer.');
  });

  test('Sources-only references survive absent placements and keep received order', async ({ page, assistant }) => {
    assistant.send(content('Sources-only answer.'), citation([ref(url('b')), ref(url('a'))]));
    await assistant.finish({ type: 'answerComplete' });
    await expect(assistant.answer.locator(markers)).toHaveCount(0);
    expect(await sourceUrls(assistant.answer)).toEqual([url('b'), url('a')]);
    await expect(page.getByRole('log').locator('div').last()).toHaveText('Assistant: Sources-only answer. 2 sources available.');
  });

  test('stopping a partial stream finalizes valid citations without pulling focus', async ({ page, assistant }) => {
    assistant.send(content('Stopped partial.'), citation([ref(url('partial'))], 0, 16));
    await expect(assistant.answer).toContainText('Stopped partial.');
    await page.getByRole('button', { name: 'Stop response', exact: true }).click();
    await expect(assistant.answer.locator(markers)).toHaveText('1');
    await expect(assistant.answer.locator('.chat-bubble-actions')).toHaveCount(1);
    expect((await savedAnswer(page)).content).toBe('Stopped partial.');
  });

  test('terminal fallback validates and restores partial content without answerComplete', async ({ page, assistant }) => {
    const { send, finish, answer } = assistant;
    send(content('Partial answer.'), citation([ref(url('valid'))], 0, 15), citation([ref(url('future'))], 0, 500));
    await finish();
    await expect(answer.locator(markers)).toHaveText('1');
    expect(await sourceUrls(answer)).toEqual([url('valid'), url('future')]);
    await expect(answer.locator('.chat-bubble-actions')).toHaveCount(1);
    expect((await savedAnswer(page)).citations).toEqual([{ start: 0, end: 15, sourceUrls: [url('valid')] }]);
    await reloadAnswer(page, answer);
  });

  test('stop without content discards collected and stale saved citations before reload', async ({ page, assistant }) => {
    assistant.send(citation([ref(url('unused'))], 0, 10));
    // updateLast merges: verify replacement explicitly clears an existing field.
    await page.evaluate(async (sourceUrl) => {
      const { chatHistory } = await import('/hlx_statics/blocks/ai-assistant/ai-assistant_chat-history.js');
      chatHistory.updateLast({
        references: [{ url: sourceUrl, title: 'Old' }],
        citations: [{ start: 0, end: 8, sourceUrls: [sourceUrl] }],
      });
    }, url('old'));
    await page.getByRole('button', { name: 'Stop response', exact: true }).click();
    await expect(assistant.answer).toContainText('Response stopped by user.');
    await expect(assistant.answer.locator(markers)).toHaveCount(0);
    await expect(assistant.answer.locator('.chat-bubble-sources')).toHaveCount(0);
    expect((await savedAnswer(page)).references).toBeUndefined();
    expect((await savedAnswer(page)).content).toBe('_Response stopped by user._');
    expect((await savedAnswer(page)).citations).toBeUndefined();
    await reloadAnswer(page, assistant.answer);
  });

  test('stream error after finalization replaces content and clears old sources/history', async ({ page, assistant }) => {
    assistant.send(content('Before error.'), citation([ref(url('old'))], 0, 13), { type: 'answerComplete' });
    await expect(assistant.answer.locator(markers)).toHaveCount(1);
    // Exercise the actual parser/error callback, not a private controller method.
    assistant.send({ type: 'followupQuestions', followupQuestions: [null] });
    await expect(assistant.answer.locator('[role="alert"]')).toBeVisible();
    await expect(assistant.answer.locator(markers)).toHaveCount(0);
    await expect(assistant.answer.locator('.chat-bubble-sources')).toHaveCount(0);
    expect((await savedAnswer(page)).references).toBeUndefined();
    expect((await savedAnswer(page)).content).not.toContain('Before error.');
    expect((await savedAnswer(page)).citations).toBeUndefined();
    await reloadAnswer(page, assistant.answer);
  });

  test('keyboard focus, new-tab links, visible focus and static inline analytics', async ({ page, assistant }) => {
    assistant.send(content('Keyboard answer.'), citation([ref(url('one'), 'First'), ref(url('two'), 'Second')], 0, 16));
    await assistant.finish({ type: 'answerComplete' });
    await reloadAnswer(page, assistant.answer);
    const links = assistant.answer.locator(markers);
    await expect(links.first()).toHaveAccessibleName('Source 1: First (opens in a new tab)');
    await expect(links.first()).toHaveAttribute('target', '_blank');
    await expect(links.first()).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(links.first()).toHaveAttribute('daa-ll', 'DevsiteAI Assistant:Message:InlineSources:Link');
    await links.first().focus();
    await page.keyboard.press('Tab');
    await expect(links.nth(1)).toBeFocused();
    expect(await links.nth(1).evaluate((link) => getComputedStyle(link).outlineStyle)).toBe('solid');
    await page.context().route('https://example.com/**', (route) => route.fulfill({ body: 'Mock documentation' }));
    const popup = page.waitForEvent('popup');
    await page.keyboard.press('Enter');
    const opened = await popup;
    await opened.waitForLoadState();
    expect(opened.url()).toBe(url('two'));
    expect(await opened.evaluate(() => window.opener)).toBeNull();
    await opened.close();
  });

  test('mobile marker groups wrap with usable hit areas and no horizontal overflow', async ({ page, assistant }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    assistant.send(content('Mobile.'), citation(Array.from({ length: 30 }, (_, index) => ref(url(`mobile-${index}`))), 0, 7));
    await assistant.finish({ type: 'answerComplete' });
    await reloadAnswer(page, assistant.answer);
    await page.locator('.chat-window').evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
    });
    const layout = await assistant.answer.evaluate((answer) => {
      const boxes = [...answer.querySelectorAll('.chat-bubble-inline-source')].map((link) => {
        const box = link.getBoundingClientRect();
        return { width: box.width, height: box.height, top: box.top, right: box.right };
      });
      const container = answer.querySelector('.chat-bubble-content');
      return { boxes, width: container.clientWidth, scrollWidth: container.scrollWidth };
    });
    expect(layout.boxes).toHaveLength(30);
    // Bounding rects can be fractionally below the CSS size after a scale transition.
    expect(layout.boxes.every((box) => box.width >= 23.99 && box.height >= 23.99)).toBeTruthy();
    expect(new Set(layout.boxes.map(({ top }) => top)).size).toBeGreaterThan(1);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  });

  test('finalization preserves a scrolled-up reader and focused input', async ({ page, assistant }) => {
    const text = Array.from({ length: 60 }, (_, index) => `Paragraph ${index}: Reading position remains here.`).join('\n\n');
    assistant.send(content(text), citation([ref(url('scroll'))], 0, text.length));
    await expect(assistant.answer).toContainText('Paragraph 59');
    const container = page.locator('.chat-window-content');
    await expect.poll(() => container.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
    await container.evaluate((element) => { element.scrollTop = 120; });
    await expect.poll(() => container.evaluate((element) => element.scrollTop)).toBe(120);
    // Wait for the scroll listener's observable position to settle before completing.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await assistant.finish({ type: 'answerComplete' });
    await expect(assistant.input).toBeFocused();
    expect(await container.evaluate((element) => element.scrollTop)).toBe(120);
  });

  test('persists only displayed placements when an unsupported link endpoint is omitted', async ({ page, assistant }) => {
    const text = 'Read <a href="https://example.com/guide">Guide</a>.\n\nDone.';
    const end = text.indexOf('Guide') + 'Guide'.length;
    assistant.send(content(text), citation([ref(url('dropped'), 'Sources only')], 0, end),
      citation([ref(url('visible'), 'Visible')], 0, text.length));
    await assistant.finish({ type: 'answerComplete' });
    await expect(assistant.answer.locator(groups)).toHaveCount(1);
    await expect(assistant.answer.getByRole('link', { name: 'Guide', exact: true })).toBeVisible();
    const saved = await savedAnswer(page);
    expect(saved.citations).toEqual([{ start: 0, end: text.length, sourceUrls: [url('visible')] }]);
    expect(saved.references.map(({ url: href }) => href)).toEqual([url('dropped'), url('visible')]);
    expect(saved.content).toBe(text);
    await reloadAnswer(page, assistant.answer);
  });
});

const historyMessage = (overrides = {}) => ({
  id: 'citation-test', source: 'ai', content: 'First.\n\nSecond.',
  references: [{ url: url('b'), title: 'Saved B' }, { url: url('a'), title: 'Saved A' }],
  timestamp: 1700000000000,
  context: { query: 'Saved query', collectionId: 'saved-collection' },
  ...overrides,
});

test.describe('AI Assistant saved citation histories', () => {
  test.use({ startStream: false });

  test.describe('authoritative saved registry', () => {
    test.use({ conversation: {
      messages: [historyMessage({
        references: [
          { url: url('only'), title: 'Saved Sources-only first' },
          { url: url('b'), title: 'Saved B' },
          { url: url('a'), title: 'Saved A' },
        ],
        citations: [
          { start: 8, end: 15, sourceUrls: [url('b')] },
          { start: 0, end: 6, sourceUrls: [url('a'), url('b'), url('a')] },
          { start: 1, end: 6, sourceUrls: [url('b')] },
        ],
      })],
      suggestedQuestions: [{ label: 'Saved next', question: 'Continue saved session' }],
      sessionId: 'saved-session',
    } });

    test('does not move Sources-only entries or reconstruct numbering from placements', async ({ page, assistant }) => {
      expect(await sourceUrls(assistant.answer)).toEqual(['only', 'b', 'a'].map(url));
      expect(await assistant.answer.locator(groups).allTextContents()).toEqual(['23', '2']);
      expect(await assistant.answer.locator(sourceLinks).allTextContents()).toEqual(['Saved Sources-only first', 'Saved B', 'Saved A']);
      await expect(assistant.answer.locator(markers).first()).toHaveAccessibleName('Source 2: Saved B (opens in a new tab)');
      await expect(page.getByRole('button', { name: 'Saved next', exact: true })).toBeVisible();
      await expect(page.getByRole('log').locator('div')).toHaveCount(0);
      await reloadAnswer(page, assistant.answer);
      expect(assistant.answerRequests).toEqual([]);
      expect((await savedConversation(page)).sessionId).toBe('saved-session');
    });
  });

  test.describe('legacy entries', () => {
    test.use({ conversation: {
      messages: [
        { id: 'question', source: 'user', content: 'Saved query', timestamp: 1700000000000 },
        historyMessage({ id: 'earlier-answer', content: 'Earlier answer.' }),
        historyMessage({ content: '**Legacy** [guide](https://example.com/guide).\n\n```js\nconst legacy = 1;\n```\n' }),
      ],
      suggestedQuestions: [], sessionId: 'legacy-session',
    } });

    test('restores Sources-only Markdown, actions, code and timestamp grouping without duplication', async ({ page, assistant }) => {
      await expect(page.locator('.chat-bubble')).toHaveCount(3);
      await expect(page.locator(markers)).toHaveCount(0);
      expect(await sourceUrls(assistant.answer)).toEqual(['b', 'a'].map(url));
      await expect(assistant.answer.locator('strong')).toHaveText('Legacy');
      await expect(assistant.answer.locator('.token.keyword')).toHaveText('const');
      await expect(assistant.answer.locator('.code-toolbar')).toHaveCount(1);
      await expect(assistant.answer.locator('.copy-to-clipboard-button')).toHaveCount(1);
      await expect(page.locator('.chat-bubble[data-message-id="earlier-answer"] .chat-bubble-timestamp')).toHaveCount(0);
      await expect(assistant.answer.locator('.chat-bubble-timestamp')).toHaveText('10:13 pm');
      await expect(assistant.answer.locator('.chat-bubble-actions')).toHaveCount(1);
      expect((await savedAnswer(page)).citations).toBeUndefined();
      await reloadAnswer(page, assistant.answer);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Open AI Assistant', exact: true }).click();
      await expect(page.locator('.chat-bubble')).toHaveCount(3);
      await expect(page.locator(markers)).toHaveCount(0);
      expect(assistant.answerRequests).toEqual([]);
    });
  });

  const badRanges = [
    [-1, 6], [0, 0], [6, 2], [0.5, 6], [0, 1000], ['0', 6], [0, 6.5], [null, 6], [0, null],
  ].map(([start, end]) => ({ start, end, sourceUrls: [url('b')] }));
  const malformed = [
    ['null', null], ['empty array', []], ['object', {}], ['string', 'invalid'],
    ['unusable placements', [null, [], 'invalid', {}, ...badRanges,
      { start: 0, end: 6, sourceUrls: {} },
      { start: 0, end: 6, sourceUrls: [null, {}, 'javascript:alert(1)', 'http://example.com/a', url('unknown')] },
    ]],
  ];
  for (const [name, citations] of malformed) {
    test.describe(name, () => {
      test.use({ conversation: {
        messages: [historyMessage({ citations, references: [
          { url: 'javascript:alert(1)', title: 'Unsafe' },
          { url: url('b'), title: 'Saved B' },
          { url: 'http://example.com/a', title: 'HTTP' },
          { url: url('a'), title: 'Saved A' },
          { url: 'invalid', title: 'Invalid' },
        ] })],
        suggestedQuestions: [], sessionId: 'malformed-session',
      } });

      test('ignores unusable optional citations and keeps valid Sources-only entries', async ({ page, assistant }) => {
        await expect(assistant.answer).toContainText('First.');
        await expect(assistant.answer.locator(markers)).toHaveCount(0);
        expect(await sourceUrls(assistant.answer)).toEqual(['b', 'a'].map(url));
        await expect(assistant.answer.locator('.chat-bubble-actions')).toHaveCount(1);
        await expect(assistant.answer.locator('[role="alert"]')).toHaveCount(0);
        await assistant.answer.getByRole('button', { name: 'Sources', exact: true }).click();
        await expect(assistant.answer.locator(sourceLinks).first()).toBeVisible();
        expect(assistant.answerRequests).toEqual([]);
        expect((await savedConversation(page)).sessionId).toBe('malformed-session');
      });
    });
  }

  test.describe('missing source registry', () => {
    test.use({ conversation: {
      messages: [historyMessage({ references: undefined, citations: [
        { start: 0, end: 6, sourceUrls: [url('b')] },
      ] })],
      suggestedQuestions: [], sessionId: 'missing-registry-session',
    } });

    test('does not fabricate sources from placement URLs', async ({ assistant }) => {
      await expect(assistant.answer).toContainText('First.');
      await expect(assistant.answer.locator(markers)).toHaveCount(0);
      await expect(assistant.answer.locator('.chat-bubble-sources')).toHaveCount(0);
      await expect(assistant.answer.locator('.chat-bubble-actions')).toHaveCount(1);
      expect(assistant.answerRequests).toEqual([]);
    });
  });

  test.describe('mixed usable metadata', () => {
    test.use({ conversation: {
      messages: [historyMessage({ citations: [
        ...badRanges,
        { start: 0, end: 6, sourceUrls: [url('unknown'), 'javascript:alert(1)', url('a'), url('a')] },
        { start: 8, end: 15, sourceUrls: [url('b')] },
      ] })],
      suggestedQuestions: [], sessionId: 'mixed-session',
    } });

    test('retains valid placements without inventing unknown links or changing source numbers', async ({ page, assistant }) => {
      expect(await assistant.answer.locator(groups).allTextContents()).toEqual(['2', '1']);
      expect(await sourceUrls(assistant.answer)).toEqual(['b', 'a'].map(url));
      await expect(assistant.answer.locator(markers).first()).toHaveAttribute('href', url('a'));
      await expect(assistant.answer.locator(markers).first()).toHaveAccessibleName('Source 2: Saved A (opens in a new tab)');
      await expect(page.getByRole('log').locator('div')).toHaveCount(0);
      expect(assistant.answerRequests).toEqual([]);
    });
  });
});
