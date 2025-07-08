import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'edition.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const editionBlock = document.querySelector('div.edition');
await decorateBlock(editionBlock);
await loadBlock(editionBlock);

describe('Edition block', () => {
  it('Builds edition block', async () => {
    expect(editionBlock).to.exist;
    expect(editionBlock.classList.contains('edition')).to.be.true;
  });

  it('edition > div > div', async () => {
    editionBlock.querySelectorAll('.edition > div > div').forEach((div) => {
        expect(div.style.backgroundColor).to.equal('rgb(187, 2, 2)');
        expect(div.style.color).to.equal('white');
        expect(div.style.fontSize).to.equal('12px');
    });
  });

  it('edition > p:first-of-type', async () => {
    const spanElement = editionBlock.querySelector('div > div > span');
    expect(spanElement).to.exist;
    expect(spanElement.innerText).to.equal('Adobe Commerce only.Learn more');
  });

  it('edition > anchor tag', async () => {
    const anchorTag = editionBlock.querySelector('a');
    expect(anchorTag).to.exist;
    expect(anchorTag.getAttribute('rel')).to.equal('noopener noreferrer');
    expect(anchorTag.getAttribute('target')).to.equal('_blank');
    expect(anchorTag.getAttribute('title')).to.be.null;
    expect(anchorTag.parentElement.tagName.toLowerCase()).to.equal('span');
  });

});