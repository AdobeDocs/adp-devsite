import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'tab-playground.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const tabBlock = document.querySelector('div.tab');
await decorateBlock(tabBlock);
await loadBlock(tabBlock);

describe('Tab block playground metadata', () => {
  it('extracts data-playground attributes via decoratePreformattedCode', () => {
    const pre = tabBlock.querySelector('pre');
    const code = tabBlock.querySelector('pre code');
    expect(pre).to.exist;
    expect(code).to.exist;
    expect(pre.getAttribute('data-playground-session-id')).to.equal('tab-session');
    expect(pre.getAttribute('data-playground-mode')).to.equal('standard');
    expect(pre.getAttribute('data-playground-execution-mode')).to.equal('sync');
    expect(pre.getAttribute('data-playground-url')).to.equal('https://example.com/tab-play');
    expect(code.getAttribute('data-playground-session-id')).to.equal('tab-session');
  });
});
