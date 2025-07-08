import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'info.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const infoBlock = document.querySelector('div.info');
await decorateBlock(infoBlock);
await loadBlock(infoBlock);

describe('Info block', () => {
  it('Builds info block', async () => {
    expect(infoBlock).to.exist;
    expect(infoBlock.classList.contains('info')).to.be.true;
    expect(infoBlock.getAttribute('daa-lh')).to.equal('info');
  });

  it('info > h2', async () => {
    infoBlock.querySelectorAll('h2').forEach((h2) => {
      expect(h2.classList.contains('spectrum-Heading')).to.be.true;
      expect(h2.classList.contains('spectrum-Heading--sizeM')).to.be.true;
      expect(h2.classList.contains('info-header')).to.be.true;
      const hr = h2.nextElementSibling;
      expect(hr.tagName).to.equal('HR');
      expect(hr.classList.contains('info-divider')).to.be.true;
    });
  });

  it('info > p', async () => {
    infoBlock.querySelectorAll('p').forEach((p) => {
      expect(p.classList.contains('spectrum-Body')).to.be.true;
      expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
    });
  });

  it('info > ul', async () => {
    infoBlock.querySelectorAll('ul').forEach((ul) => {
      expect(ul.classList.contains('spectrum-Body')).to.be.true;
      expect(ul.classList.contains('spectrum-Body--sizeM')).to.be.true;
    });
  });

  it('info > a', async () => {
    infoBlock.querySelectorAll('a').forEach((a) => {
      expect(a.classList.contains('spectrum-Link')).to.be.true;
      expect(a.classList.contains('spectrum-Link--quiet')).to.be.true;
    });
  });
  
  
});