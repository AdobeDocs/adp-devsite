import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'title.html' });


const titleBlock = document.querySelector('div.title');
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
await decorateBlock(titleBlock);
await loadBlock(titleBlock);

describe('Title block', () => {
    it('Builds title block', async () => {
        expect(titleBlock).to.exist;
        expect(titleBlock.classList.contains('block')).to.be.true;
        expect(titleBlock.getAttribute('daa-lh')).to.equal('title');
    });

    it('title > heading', async () => {
        const heading = titleBlock.querySelector('h1, h2, h3, h4, h5, h6');
        expect(heading).to.exist;
        expect(heading.classList.contains('spectrum-Heading')).to.be.true;
        expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
        expect(heading.classList.contains('title-heading')).to.be.true;
    });

    it('title > padding', async () => {
        const padding = titleBlock.parentElement?.parentElement?.getAttribute('data-Padding');
        if (padding) {
            expect(titleBlock.parentElement?.parentElement.style.getPropertyValue("padding")).to.equal(padding);
            expect(titleBlock.parentElement?.parentElement.style.getPropertyPriority("padding")).to.equal("important");
        }
    });

    it('title > content align', async () => {
        const contentAlign = titleBlock.parentElement?.parentElement?.getAttribute('data-ContentAlign');
        if (contentAlign) {
            expect(titleBlock.parentElement?.parentElement.style.getPropertyValue("text-align")).to.equal(contentAlign);
            expect(titleBlock.parentElement?.parentElement.style.getPropertyPriority("text-align")).to.equal("important");
        }
    });

    it('title > paragraph', async () => {
        titleBlock.querySelectorAll('p').forEach((p) => {
            expect(p.classList.contains('spectrum-Body')).to.be.true;
            expect(p.classList.contains('spectrum-Body--sizeL')).to.be.true;
        });
    });
});