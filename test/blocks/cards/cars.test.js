import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';


describe('Cards block - three cards', () => {
    let cardsBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'cards-threeCards.html' });
        cardsBlock = document.querySelector('div.cards');
        const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        await decorateBlock(cardsBlock);
        await loadBlock(cardsBlock);
    });

    it('Builds cards block', async () => {
        expect(cardsBlock).to.exist;
        expect(cardsBlock.getAttribute('daa-lh')).to.equal('cards');
    });

    it('cards > card', async () => {
        cardsBlock.querySelectorAll('div.cards > div').forEach((card) => {
            card.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((header) => {
                expect(header.classList.contains('spectrum-Heading')).to.be.true;
                expect(header.classList.contains('spectrum-Heading--sizeM')).to.be.true;
            });

            card.querySelectorAll('p').forEach((p) => {
                expect(p.classList.contains('spectrum-Body')).to.be.true;
                expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
            });

            card.querySelectorAll('p > a').forEach((a) => {
                expect(a.classList.contains('spectrum-Link')).to.be.true;
                expect(a.classList.contains('spectrum-Button--secondary')).to.be.true;
            });

            expect(card.classList.contains('three-card')).to.be.true;
            // FIXME: the target div is located at .three-card > div > div
            // .three > div is their parent container and the length is 1
            card.querySelectorAll('.three-card > div').forEach((font, index) => {
                if (index === 1) {
                    expect(font.style.getPropertyValue('font-size')).to.equal('16px');
                }
            });
        });
    });

});

describe('Cards block - four cards', () => {
    let cardsBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'cards-fourCards.html' });
        cardsBlock = document.querySelector('div.cards');
        const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        await decorateBlock(cardsBlock);
        await loadBlock(cardsBlock);
    });

    it('Builds cards block', async () => {
        expect(cardsBlock).to.exist;
        expect(cardsBlock.getAttribute('daa-lh')).to.equal('cards');
    });

    it('cards > card', async () => {
        cardsBlock.querySelectorAll('div.card').forEach((card) => {
            expect(card.classList.contains('four-card')).to.be.true;
        });
    });
});