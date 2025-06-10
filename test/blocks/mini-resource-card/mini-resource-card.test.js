import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'mini-resource-card.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const miniResourceCardBlock = document.querySelector('div.mini-resource-card');
await decorateBlock(miniResourceCardBlock);
await loadBlock(miniResourceCardBlock);

describe('Mini resource card block', () => {
    it('Builds mini resource card block', () => {
        expect(miniResourceCardBlock).to.exist;
        expect(miniResourceCardBlock.getAttribute('daa-lh')).to.equal('mini resource card');
    });

    it('mini resource card > nobox design', () => {
        // todo:line 46 mini-resource-card.js: does not have nobox-design class
        if (miniResourceCardBlock.classList.contains('nobox-design')) {
            expect(miniResourceCardBlock.classList.contains('background-color-white')).to.be.true;
        }
    });

    it('mini resource card > primary button', () => {
        // todo:line 49 mini-resource-card.js: does not have primarybutton class
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

    it('mini resource card > card container', () => {
        const cardContainer = miniResourceCardBlock.querySelector('.card-container');
        expect(cardContainer).to.exist;

        miniResourceCardBlock.querySelectorAll('.mini-resource-card > div').forEach((resource) => {
            if (!resource.querySelector(".button-container")) {
                const linkHref = resource.querySelector('a')?.href;
                expect(linkHref).to.exist;

                const heading = resource.querySelector('a')?.innerText;
                expect(heading).to.exist;

                const text = resource.querySelector('p')?.innerText;
                const picture = resource.querySelector('picture');

                const img = resource.querySelector('img');
                if (img) {
                    expect(img.getAttribute('class')).to.equal('image-mini');
                }
                const resourceHTML = resource.innerHTML;
                expect(resourceHTML).to.exist;
                // todo: test mini resource card content is correct
            }
        });
    });
});