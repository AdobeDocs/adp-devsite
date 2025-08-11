import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'list.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const listBlock = document.querySelector('div.list');
await decorateBlock(listBlock);
await loadBlock(listBlock);

describe('List block', () => {
  it('Builds list block', async () => {
    expect(listBlock).to.exist;
    expect(listBlock.classList.contains('list')).to.be.true;
    expect(listBlock.getAttribute('daa-lh')).to.equal('list');
  });

  it('list > headings', async () => {
    listBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      expect(heading.classList.contains('spectrum-Heading')).to.be.true;
      expect(heading.classList.contains('spectrum-Heading--sizeM')).to.be.true;
      expect(heading.classList.contains('column-header')).to.be.true;
    });
  });

  it('list > p', async () => {
    listBlock.querySelectorAll('p').forEach((p) => {
      expect(p.classList.contains('spectrum-Body')).to.be.true;
      expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
    });
  });

  it('list > ul ol', async () => {
    listBlock.querySelectorAll('ul ol').forEach((ol) => {
      expect(ol.classList.contains('spectrum-Body')).to.be.true;
      expect(ol.classList.contains('spectrum-Body--sizeL')).to.be.true;
    });
  });

  //TODO: add test for documentation template
});