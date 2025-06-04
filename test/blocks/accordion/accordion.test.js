/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'accordion.html' });
const { buildBlock, decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const accordionBlock = document.querySelector('div.accordion');
await loadBlock(accordionBlock);

describe('Accordion block', () => {
  it('Builds accordion block', async () => {
    expect(accordionBlock).to.exist;
    expect(accordionBlock.classList.contains('block')).to.be.true;
    expect(accordionBlock.classList.contains('accordion')).to.be.true;
    expect(accordionBlock.getAttribute('daa-lh')).to.equal('accordion');
  });

  it('accordion > general title', async () => {
    const title = accordionBlock.querySelector('h1, h2');
    expect(title).to.exist;
  });

  it('accordion > accordion title', async () => {
    const accordion_title = accordionBlock.querySelector('.accordion-title');
    expect(accordion_title.querySelector('h1')).to.exist;
  });

  it('accordion > accordion div', async () => {
    const accordion_div = accordionBlock.querySelector('.accordion-div');
    expect(accordion_div).to.exist;
  });

  it('accordion > accordion items', async () => {
    const accordion_items = accordionBlock.querySelectorAll('.accordion-item');
    accordion_items.forEach((item) => {
      const heading = item.querySelector('h3, h4, h5, h6');
      expect(heading).to.exist;

      //accordion item header
      const accordion_item_header = item.querySelector('.accordion-itemHeader');
      expect(accordion_item_header).to.exist;
      expect(accordion_item_header.classList.contains('active')).to.be.false;
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronRight100')).to.exist;
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronDown100')).to.exist;

      //accordion item content
      const accordion_item_content = item.querySelector('.accordion-itemContent');
      expect(accordion_item_content).to.exist;
      const p = accordion_item_content.querySelector('p');
      expect(p).to.exist;

      //before click
      expect(accordion_item_header .classList.contains('active')).to.be.false;
      
      //heading click
      item.click();
      expect(accordion_item_header .classList.contains('active')).to.be.true;
      expect(accordion_item_content.style.display).to.equal('block');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronRight100').style.display).to.equal('none');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronDown100').style.display).to.equal('block');

      //heading click again
      item.click();
      expect(accordion_item_header .classList.contains('active')).to.be.false;
      expect(accordion_item_content.style.display).to.equal('none');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronRight100').style.display).to.equal('block');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronDown100').style.display).to.equal('none');

    });
  });
});
