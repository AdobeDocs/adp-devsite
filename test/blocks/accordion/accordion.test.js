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
    await import('../../../hlx_statics/scripts/scripts.js');
    
    const accordion = document.querySelector('.accordion');
    expect(accordion).to.exist;
    expect(accordion.classList.contains('block')).to.be.true;
    expect(accordion.classList.contains('accordion')).to.be.true;
    expect(accordion.getAttribute('daa-lh')).to.equal('accordion');

    //general title
    const title = accordion.querySelector('h1, h2');
    expect(title).to.exist;

    //accordion title
    const accordion_title = accordion.querySelector('.accordion-title');
    expect(accordion_title.querySelector('h1')).to.exist;

    //accordion div
    const accordion_div = accordion.querySelector('.accordion-div');
    expect(accordion_div).to.exist;

    //accordion items
    const accordion_items = accordion_div.querySelectorAll('.accordion-item');
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

      //heading click
      item.click();
      // expect(heading.classList.contains('active')).to.be.true;
      expect(accordion_item_content.style.display).to.equal('block');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronRight100').style.display).to.equal('none');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronDown100').style.display).to.equal('block');

      //heading click again
      item.click();
      expect(heading.classList.contains('active')).to.be.false;
      expect(accordion_item_content.style.display).to.equal('none');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronRight100').style.display).to.equal('block');
      expect(accordion_item_header.querySelector('.spectrum-UIIcon-ChevronDown100').style.display).to.equal('none');

    });
  });

});