/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

describe('Announcement block - no image', () => {
  let announcementBlock;

  before(async () => {
    document.body.innerHTML = await readFile({ path: 'announcement-noImage.html' });
    const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
    announcementBlock = document.querySelector('div.announcement');
    await decorateBlock(announcementBlock);
    await loadBlock(announcementBlock);
  });

  it('Builds announcement block', async () => {
    expect(announcementBlock).to.exist;
  });

  it("announcement > heading", () => {
    const headings = announcementBlock.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings).to.exist;
    headings.forEach((heading) => {
      expect(heading.classList.contains('spectrum-Heading')).to.be.true;
      expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
      expect(heading.classList.contains('announcement-heading')).to.be.true;
      expect(heading.style.whiteSpace).to.equal('normal');
    });
  });

  it("announcement > paragraphs", () => {
    const paragraphs = announcementBlock.querySelectorAll('p');
    expect(paragraphs).to.exist;
    paragraphs.forEach((paragraph) => {
      expect(paragraph.classList.contains('spectrum-Body')).to.be.true;
      expect(paragraph.classList.contains('spectrum-Body--sizeL')).to.be.true;
      expect(paragraph.style.whiteSpace).to.equal('normal');
    });
  });

  it("announcement > image", () => {
    const img = announcementBlock.querySelector('picture img');
    if (!img) {
      if (!announcementBlock.classList.contains('background-color-white') && !announcementBlock.classList.contains('background-color-navy') && !announcementBlock.classList.contains('background-color-dark-gray')) {
        expect(announcementBlock.classList.contains('background-color-gray')).to.be.true;
      }
    }
  });

});

describe('Announcement block - image', () => {
  let announcementBlock;

  before(async () => {
    document.body.innerHTML = await readFile({ path: 'announcement-image.html' });
    const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
    announcementBlock = document.querySelector('div.announcement');
    await decorateBlock(announcementBlock);
    await loadBlock(announcementBlock);
  });

  it("announcement > picture img", () => {
    const img = announcementBlock.querySelector('picture img');
    expect(img).to.exist;
  });
});