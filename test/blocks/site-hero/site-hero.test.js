/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'site-hero.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const siteHeroBlock = document.querySelector('div.site-hero');
await decorateBlock(siteHeroBlock);
await loadBlock(siteHeroBlock);

describe('Site Hero block', () => {
  it('Builds site hero block', async () => {
    expect(siteHeroBlock).to.exist;
    expect(siteHeroBlock.getAttribute('daa-lh')).to.equal('site-hero');
  });

  it('site-hero > heading', async () => {
    siteHeroBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      expect(h.classList.contains('spectrum-Heading')).to.be.true;
      expect(h.classList.contains('spectrum-Heading--sizeXXL')).to.be.true;
      expect(h.style.color).to.equal('white');
      expect(h.parentElement.classList.contains('site-hero-content')).to.be.true;
      expect(h.parentElement.querySelector('div.hero-button-container')).to.exist;
    });
  });

  it('site-hero > paragraphs', async () => {
    siteHeroBlock.querySelectorAll('p').forEach((p) => {
      if (!p.classList.contains('icon-container')) {
        expect(p.classList.contains('spectrum-Body')).to.be.true;
        expect(p.classList.contains('spectrum-Body--sizeL')).to.be.true;
        expect(p.style.color).to.equal('white');
      }
      if (p.classList.contains('button-container')) {
        expect(p.querySelector('button')).to.exist;
      }
    });
  });
});
