import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'info-card.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const infoCardBlock = document.querySelector('div.info-card');
await decorateBlock(infoCardBlock);
await loadBlock(infoCardBlock);

describe('Info card block', () => {
  it('Builds info card block', async () => {
    expect(infoCardBlock).to.exist;
    expect(infoCardBlock.getAttribute('daa-lh')).to.equal('info-card');
  });

  //TODO: Test primary button class

  it('info-card > ul', async () => {
    const ul = infoCardBlock.querySelector('ul');
    expect(ul).to.exist;
    ul.querySelectorAll('li').forEach((li) => {
      const a = li.querySelector('a');
      expect(a).to.exist;
      
      // image
      const cardImageDiv = a.querySelector('div.cards-card-image');
      expect(cardImageDiv).to.exist;
      expect(cardImageDiv.querySelector('img')).to.exist;

      // text
      const textDiv = a.querySelector('div.cards-card-body');
      expect(textDiv).to.exist;
      
      // heading
      const headingElement = textDiv.querySelector('h1, h2, h3, h4, h5, h6') || textDiv.querySelector('a');
      if (headingElement) {
        const anchor = textDiv.querySelector('a');
        if (anchor) {
          const heading = textDiv.querySelector('h3');
          expect(heading).to.exist;
          expect(heading.classList.contains('spectrum-Heading')).to.be.true;
          expect(heading.classList.contains('spectrum-Heading--sizeS')).to.be.true;
          expect(heading.classList.contains('card-heading')).to.be.true;
          expect(heading.textContent).to.equal(headingElement.textContent.trim());
          expect(anchor.href).to.equal(headingElement.href || anchor.href);
        }
        else {
            expect(headingElement.classList.contains('spectrum-Heading')).to.be.true;
            expect(headingElement.classList.contains('spectrum-Heading--sizeS')).to.be.true;
            expect(headingElement.classList.contains('card-heading')).to.be.true;
        }
      }

      // description 
      const description = textDiv.querySelector('p') || textDiv.querySelector('.info-card > div > div:last-child');
      if (description && description.textContent.trim() !== '') {
        expect(description).to.exist;
        expect(description.style.color).to.equal('rgb(110, 110, 110)');
      }
    });
  });

  //TODO: Test icon class

  //TODO: Test primarybutton class
});