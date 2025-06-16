import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'image-text.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const imageTextBlock = document.querySelector('div.image-text');
await decorateBlock(imageTextBlock);
await loadBlock(imageTextBlock);

describe('Image-text block', () => {
    it('should be a div with class image-text', () => {
        expect(imageTextBlock).to.exist;
        expect(imageTextBlock.classList.contains('image-text')).to.be.true;
        expect(imageTextBlock.getAttribute('daa-lh')).to.equal('image-text');
    });

    it('image-text > heading', () => {
        imageTextBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            expect(heading).to.exist;
            expect(heading.classList.contains('spectrum-Heading')).to.be.true;
            expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
            expect(heading.classList.contains('title-heading')).to.be.true;
        });
    });

    it('image-text > paragraph', () => {
        imageTextBlock.querySelectorAll('p').forEach((p) => {
            expect(p).to.exist;
            expect(p.classList.contains('spectrum-Body')).to.be.true;
            expect(p.classList.contains('spectrum-Body--sizeL')).to.be.true;
        });
    });
    
    it('image-text > rearrange links', () => {
        const leftDiv = imageTextBlock.firstElementChild.lastElementChild;
        const leftButton = leftDiv.querySelector('div.image-text-button-container');
        const rightDiv = imageTextBlock.lastElementChild.lastElementChild;
        const rightButton = rightDiv.querySelector('div.image-text-button-container');
        expect(leftButton).to.exist;
        expect(rightButton).to.exist;

        leftDiv.querySelectorAll('p.button-container').forEach((p) => {
            expect(leftButton.contains(p)).to.be.true;
        });
        rightDiv.querySelectorAll('p.button-container').forEach((p) => {
            expect(rightButton.contains(p)).to.be.true;
        });
    });
});