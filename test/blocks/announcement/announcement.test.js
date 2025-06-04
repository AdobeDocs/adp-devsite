/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'announcement.html' });
const { loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const announcementBlock = document.querySelector('div.announcement');
await loadBlock(announcementBlock);
console.log(announcementBlock);

describe('Announcement block', () => {
  it('Builds announcement block', async () => {
    await import('../../../hlx_statics/scripts/scripts.js');
    
    expect(announcementBlock).to.exist;

    // headings
    const headings = announcementBlock.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings).to.exist;
    headings.forEach((heading) => {
    //   expect(heading.classList.contains('spectrum-Heading')).to.be.true;
    //   expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
    //   expect(heading.classList.contains('announcement-heading')).to.be.true;
    //   expect(heading.style.whiteSpace).to.equal('normal');
    });

    // paragraphs
    const paragraphs = announcementBlock.querySelectorAll('p');
    expect(paragraphs).to.exist;
    paragraphs.forEach((paragraph) => {
      // expect(paragraph.classList.contains('spectrum-Body')).to.be.true;
      // expect(paragraph.classList.contains('spectrum-Body--sizeL')).to.be.true;
      // expect(paragraph.style.whiteSpace).to.equal('normal');
    });

    //picture img
    const image = announcementBlock.querySelector('picture img');
    if(!image){
      if (!announcementBlock.classList.contains('background-color-white') && !announcementBlock.classList.contains('background-color-navy') && !announcementBlock.classList.contains('background-color-dark-gray')) {
        // expect(announcementBlock.classList.contains('background-color-gray')).to.be.true;
      }
    }

    //buttons
    // expect(buttonIsDecorated(announcementBlock)).to.be.true;
  });
});