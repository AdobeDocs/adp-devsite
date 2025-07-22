import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';


describe('Cards block - three cards', () => {
    let cardsBlock;

    before(async () => {
        let observerCallback;
        let disconnectCalled = false;
        
        // Mock IntersectionObserver before loading block
        window.IntersectionObserver = class {
            constructor(callback) {
                observerCallback = callback;
                this.disconnect = () => {
                    disconnectCalled = true;
                };
            }
            observe() {} 
        };

        document.body.innerHTML = await readFile({ path: 'cards-threeCards.html' });
        cardsBlock = document.querySelector('div.cards');
        const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        await decorateBlock(cardsBlock);
        await loadBlock(cardsBlock);

        // Store the callback and disconnect function for tests
        cardsBlock.testHelpers = {
            triggerIntersection: () => observerCallback([{ isIntersecting: true }]),
            wasDisconnected: () => disconnectCalled
        };
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
        });
    });

    it('Processes images when scrolled into view', async () => {
        // Get initial image state
        const initialImages = cardsBlock.querySelectorAll('picture > img');
        const initialSrcs = Array.from(initialImages).map(img => img.src);

        // Trigger intersection using stored callback
        cardsBlock.testHelpers.triggerIntersection();

        // Verify observer was disconnected
        expect(cardsBlock.testHelpers.wasDisconnected()).to.be.true;

        // Verify images were processed
        const processedImages = cardsBlock.querySelectorAll('picture > img');
        processedImages.forEach((img, index) => {
            expect(img.getAttribute('loading')).to.equal('lazy');
            // The width and height are not preserved by createOptimizedPicture
            expect(img.src).to.equal(initialSrcs[index]);
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