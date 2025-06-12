
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'link-block.html' });
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const linkBlockBlock = document.querySelector('div.link-block');
await decorateBlock(linkBlockBlock);
await loadBlock(linkBlockBlock);


describe('Link block', () => {
  it('Builds link block', () => {
    expect(linkBlockBlock).to.exist;
    expect(linkBlockBlock.getAttribute('daa-lh')).to.equal('title');
  });

  it('link block > headings', () => {
    linkBlockBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        expect(h.classList.contains('spectrum-Heading')).to.be.true;
        expect(h.classList.contains('spectrum-Heading--sizeL')).to.be.true;
        expect(h.classList.contains('title-heading')).to.be.true;
    });
  });

  it('link block > links', () => {
    const icon = `<svg xmlns='http://www.w3.org/2000/svg' height="18" viewBox="0 0 18 18" width="18"><defs><style>.fill {fill: #464646;}</style> </defs><title>S LinkOut 18 N</title><rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M16.5,9h-1a.5.5,0,0,0-.5.5V15H3V3H8.5A.5.5,0,0,0,9,2.5v-1A.5.5,0,0,0,8.5,1h-7a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5v-7A.5.5,0,0,0,16.5,9Z" /><path class="fill" d="M16.75,1H11.377A.4.4,0,0,0,11,1.4a.392.392,0,0,0,.1175.28l1.893,1.895L9.4895,7.096a.5.5,0,0,0-.00039.70711l.00039.00039.707.707a.5.5,0,0,0,.707,0l3.5215-3.521L16.318,6.882A.39051.39051,0,0,0,16.6,7a.4.4,0,0,0,.4-.377V1.25A.25.25,0,0,0,16.75,1Z" /></svg>`;
    //todo: no longer using <li> tag -> not testable
    linkBlockBlock.querySelectorAll('li').forEach((li) => {
        li.querySelectorAll('a').forEach((a) => {
            if (!a.hasChildNodes()) {
                expect(a.remove()).to.be.true;
            }
        });
        expect(li.classList.contains('spectrum-Body')).to.be.true;
        expect(li.classList.contains('spectrum-Body--sizeL')).to.be.true;
        expect(li.classList.contains('link-icon')).to.be.true;
        const div = li.querySelector('div');
        expect(div).to.exist;
        expect(div.innerHTML).to.equal(icon);
    });
  });

  it("link block > sub parent", () => {
    const subParent = linkBlockBlock.querySelector('.sub-parent');
    const linkBlockWrapper = linkBlockBlock.querySelector('.link-block-wrapper');
    //FIXME: can not find subParent and linkBlockWrapper in google docs sample block
  });

});
