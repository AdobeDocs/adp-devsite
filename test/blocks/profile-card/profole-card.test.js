import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'profile-card.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const profileCardBlock = document.querySelector('div.profile-card');
await decorateBlock(profileCardBlock);
await loadBlock(profileCardBlock);

describe('Profile card block', () => {
    it('Builds profile card block', () => {
        expect(profileCardBlock).to.exist;
        expect(profileCardBlock.getAttribute('daa-lh')).to.equal('profile-card');
    });

    it('profile card > heading', () => {
        const title = profileCardBlock.querySelector('h1, h2, h3, h4, h5, h6');
        expect(title).to.exist;
        expect(title.classList.contains('spectrum-Heading')).to.be.true;
        expect(title.classList.contains('spectrum-Heading--sizeL')).to.be.true;
        expect(title.classList.contains('title-heading')).to.be.true;
    });

    it('profile card > paragraph', () => {
        const paragraphs = profileCardBlock.querySelectorAll('p');
        paragraphs.forEach((p) => {
            expect(p.classList.contains('spectrum-Body')).to.be.true;
            expect(p.classList.contains('spectrum-Body--sizeL')).to.be.true;
        });
    });

    it('profile card > button container', () => {
        Array.from(profileCardBlock.children).forEach((child) => {
            const allButtonContainer = child.lastElementChild.querySelector('.all-button-container');
            expect(allButtonContainer).to.exist;

            child.lastElementChild.querySelectorAll('.button-container').forEach((buttonContainer) => {
                expect(allButtonContainer.contains(buttonContainer)).to.be.true;
            });

            expect(child.lastElementChild.contains(allButtonContainer)).to.be.true;
        });
    });
});