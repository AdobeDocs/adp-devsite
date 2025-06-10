import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'product-card.html' });
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const productCardBlock = document.querySelector('div.product-card');
await decorateBlock(productCardBlock);
await loadBlock(productCardBlock);

describe('Product card block', () => {
    it('Builds product card block', () => {
        expect(productCardBlock).to.exist;
        expect(productCardBlock.getAttribute('daa-lh')).to.equal('product-card');

    });

    it('product card > headings', () => {
        productCardBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
            expect(h.classList.contains('spectrum-Heading')).to.be.true;
            expect(h.classList.contains('spectrum-Heading--sizeS')).to.be.true;
            expect(h.classList.contains('title-heading')).to.be.true;
        });
    });

    it('product card > paragraphs', () => {
        productCardBlock.querySelectorAll('p').forEach((p) => {
            expect(p.classList.contains('spectrum-Body')).to.be.true;
            expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
        });
    });

    it('product card > anchors', () => {
        productCardBlock.querySelectorAll('a').forEach((a) => {
            if (a.title === "View docs") { // todo: potential harm - html linter will insert \n between View docs
                expect(a.classList.length).to.equal(4);
                expect(a.classList.contains('spectrum-Button')).to.be.true;
                expect(a.classList.contains('spectrum-Button--outline')).to.be.true;
                expect(a.classList.contains('spectrum-Button--accent')).to.be.true;
                expect(a.classList.contains('spectrum-Button--sizeM')).to.be.true;
            }
        });
    });

    it('product card > width', () => {
        const width = productCardBlock?.parentElement?.parentElement?.getAttribute('data-width');
        if (width) { // todo: line 21 in product-card.js, if width is null, the div.style.width will be set to empty string, need check null?
            Array.from(productCardBlock.children).forEach((div) => {
                expect(div.style.width).to.equal(width);
            });
        }
        else {
            Array.from(productCardBlock.children).forEach((div) => {
                expect(div.style.width).to.equal('');
            });
        }
    });

    it('product card > all-button-container', () => {
        const allButtonContainer = productCardBlock.querySelector('.all-button-container');
        expect(allButtonContainer).to.exist;
        allButtonContainer.querySelectorAll('.button-container').forEach((buttonContainer) => {
            expect(buttonContainer.classList.contains('button-container')).to.be.true;
        });
    });

    it('product card > spectrum-Card', () => {
        const childDivs = productCardBlock.querySelectorAll(':scope > div');
        // console.log(childDivs.length);
        childDivs.forEach((child) => {
            expect(child.classList.contains('spectrum-Card')).to.be.true;
        });
    });

    it('product card > spectrum-Card-body', () => {
        const bodyDiv = document.getElementsByClassName('spectrum-Card');
        console.log(bodyDiv[0]);
        const childbody = bodyDiv[0].querySelectorAll(':scope > div');
        
        childbody.forEach((child, index) => {
            if (index === 0) {
                expect(child.classList.contains('spectrum-Card-body')).to.be.true;
            }
            else if (index === 1) { //todo: index == 1 not testable, all-button-container is directly placed card-body.
                expect(child.classList.contains('spectrum-Card-footer')).to.be.true;
            }
        });
    });
});
