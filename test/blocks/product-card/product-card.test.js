import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'product-card.html' });
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const productCardBlock = document.querySelector('div.product-card');
await decorateBlock(productCardBlock);
await loadBlock(productCardBlock);

// console.log(productCardBlock);
describe('Product card block', () => {
  it('Builds product card block', () => {
    expect(productCardBlock).to.exist;
    expect(productCardBlock.getAttribute('daa-lh')).to.equal('product-card');

   });

  it('product card > headings', () => {
    productCardBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        expect(h.classList.contains('spectrum-Heading')).to.be.true;
        expect(h.classList.contains('spectrum-Heading--sizeS')).to.be.true;
        expect(h.classList.contains('title-heading')).to.be.true;
      });
  });

  it('product card > paragraphs', () => {
    productCardBlock.querySelectorAll('p').forEach((p) => {
      expect(p.classList.contains('spectrum-Body')).to.be.true;
      expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
    });
  });

  it('product card > anchors', () => {
    productCardBlock.querySelectorAll('a').forEach((a) => {
      if (a.title === "View docs") {
        expect(a.classList.contains('spectrum-Button')).to.be.true;
        expect(a.classList.contains('spectrum-Button--outline')).to.be.true;
        expect(a.classList.contains('spectrum-Button--accent')).to.be.true;
        expect(a.classList.contains('spectrum-Button--sizeM')).to.be.true;
      }
    });
  });
});
