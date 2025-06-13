import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'banner.html' });


const bannerBlock = document.querySelector('div.banner');
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
await decorateBlock(bannerBlock);
await loadBlock(bannerBlock);

describe('Banner block', () => {
    it('Builds banner block', async () => {
        expect(bannerBlock).to.exist;
        expect(bannerBlock.getAttribute('daa-lh')).to.equal('banner');
    });

    it('banner > heading 1', async () => {
        bannerBlock.querySelectorAll('h1').forEach((h1) => {
            expect(h1.classList.contains('spectrum-Heading')).to.be.true;
            expect(h1.classList.contains('spectrum-Heading--sizeXL')).to.be.true;
        });
    });
});