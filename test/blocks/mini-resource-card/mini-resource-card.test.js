import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

describe('Mini resource card block - no primary button', () => {
    let miniResourceCardBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'mini-resource-card.html' });
        const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        miniResourceCardBlock = document.querySelector('div.mini-resource-card');
        await decorateBlock(miniResourceCardBlock);
        await loadBlock(miniResourceCardBlock);

    });

    it('Builds mini resource card block', () => {
        expect(miniResourceCardBlock).to.exist;
        expect(miniResourceCardBlock.getAttribute('daa-lh')).to.equal('mini-resource-card');
    });

    it('mini resource card > nobox design', () => {
        if (miniResourceCardBlock.classList.contains('nobox-design')) {
            expect(miniResourceCardBlock.classList.contains('background-color-white')).to.be.true;
        }
    });

    it('mini resource card > primary button', () => {
        if (miniResourceCardBlock.classList.contains('primarybutton')) {
            const primaryButton = miniResourceCardBlock.querySelectorAll('a')[0];
            const up = primaryButton.parentElement;
            const buttonContainer = miniResourceCardBlock.querySelector('.button-container');
            expect(buttonContainer).to.exist;
            expect(buttonContainer.contains(up)).to.be.true;
            if (!primaryButton.querySelector('img')) {
                if (up.childNodes.length === 1 && up.tagName === 'STRONG') {
                    expect(primaryButton.className).to.equal('button primary');
                }
            }
        }
    });
});

describe('Mini resource card block - with primary button', () => {
    let miniResourceCardBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'mini-resource-card-withPrimaryButton.html' });
        const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        miniResourceCardBlock = document.querySelector('div.mini-resource-card');
        await decorateBlock(miniResourceCardBlock);
        await loadBlock(miniResourceCardBlock);
    });

    it('mini resource card > primary button ', () => {
        expect(miniResourceCardBlock.classList.contains('primarybutton')).to.be.true;
        const primaryButton = miniResourceCardBlock.querySelectorAll('a')[0];
        const up = primaryButton.parentElement;
        const buttonContainer = miniResourceCardBlock.querySelector('.button-container');
        expect(buttonContainer).to.exist;
        // FIXME: can't be tested with: expect(buttonContainer.contains(up)).to.be.true;
        // since the parent-child relationship has been changed
        // should be able to test by storing the up and container element in a variable before decoration
        if (!primaryButton.querySelector('img')) {
            if (up.childNodes.length === 1 && up.tagName === 'STRONG') {
                expect(primaryButton.className).to.equal('button primary');
            }
        }
    });
});