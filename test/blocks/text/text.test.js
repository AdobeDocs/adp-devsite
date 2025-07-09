import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

describe('Text Block', () => {
  let textBlock;

  beforeEach(async () => {
    document.body.innerHTML = await readFile({ path: 'text.html' });
    const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
    textBlock = document.querySelector('div.text');
    await decorateBlock(textBlock);
    await loadBlock(textBlock);
  });

  it('text > block load', () => {
    expect(textBlock).to.exist;
    expect(textBlock.getAttribute('daa-lh')).to.equal('text');
  });

  it('text > heading', () => {
    const headings = textBlock.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      expect(heading.classList.contains('spectrum-Heading')).to.be.true;
      expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
    });
  });

  it('text > paragraph', () => {
    const paragraphs = textBlock.querySelectorAll('p');
    paragraphs.forEach(paragraph => {
      expect(paragraph.classList.contains('spectrum-Body')).to.be.true;
      expect(paragraph.classList.contains('spectrum-Body--sizeL')).to.be.true;
    });
  });

  it('text > link', () => {
    textBlock.querySelectorAll('p a').forEach( p => {
      expect(p.classList.contains('text-block-link')).to.be.true;
    });
  });

  it('text > p > a:first-child', () => {
    const links = textBlock.querySelectorAll('p a:first-child');
    links.forEach(link => {
      expect(link.style.borderWidth).to.equal('2px');
    });
  });

  it('text > img', () => {
    const images = textBlock.querySelectorAll('img');
    images.forEach(image => {
      expect(image.classList.contains('textImg')).to.be.true;
    });
  });

  //TODO: test button (after decorateButtons() issue is fixed)
});

