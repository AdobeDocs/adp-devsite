import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'code.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const codeBlock = document.querySelector('div.code');
await decorateBlock(codeBlock);
await loadBlock(codeBlock);

describe('Code block', () => {
  it('code > block exists', () => {
    expect(codeBlock).to.exist;
    expect(codeBlock.classList.contains('code')).to.be.true;
  });

  it('code > decoratePreformattedCode formats code/pre', () => {
    const pre = codeBlock.querySelector('pre');
    const code = codeBlock.querySelector('code');
    expect(pre).to.exist;
    expect(code).to.exist;
    expect(pre.className).to.match(/language-/);
    expect(pre.classList.contains('line-numbers')).to.be.true;
  });

  it('code > data-playground attributes from class', () => {
    const pre = codeBlock.querySelector('pre');
    const code = codeBlock.querySelector('code');
    expect(pre.getAttribute('data-playground-session-id')).to.equal('code-session');
    expect(pre.getAttribute('data-playground-mode')).to.equal('standard');
    expect(pre.getAttribute('data-playground-execution-mode')).to.equal('sync');
    expect(pre.getAttribute('data-playground-url')).to.equal('https://example.com/play');
    expect(code.getAttribute('data-playground-session-id')).to.equal('code-session');
  });
});
