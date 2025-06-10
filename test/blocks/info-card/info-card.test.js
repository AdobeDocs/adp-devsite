import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'info-card.html' });

const infoCardBlock = document.querySelector('div.info-card');
const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
await decorateBlock(infoCardBlock);
await loadBlock(infoCardBlock);

describe('Info card block', () => {
    it('Builds info card block', async () => {
        expect(infoCardBlock).to.exist;
        expect(infoCardBlock.getAttribute('daa-lh')).to.equal('info-card');
    });

    //todo: block.classList does not contain primarybutton

    describe('Card content variations', () => {
        let listItems;
        
        beforeEach(() => {
            listItems = infoCardBlock.querySelectorAll('ul > li');
        });

        it('Should handle cards with complete content', () => {
            // Find a card that has all elements
            const completeCard = Array.from(listItems).find(li => 
                li.querySelector('.cards-card-image') && 
                li.querySelector('.card-heading') &&
                li.querySelector('p')
            );
            
            if (completeCard) {
                expect(completeCard.querySelector('.cards-card-image')).to.exist;
                expect(completeCard.querySelector('.card-heading').textContent.trim()).to.not.be.empty;
                expect(completeCard.querySelector('p').textContent.trim()).to.not.be.empty;
            }
        });

        it('Should handle cards without images', () => {
            //todo: is image a required field?
            const noImageCard = Array.from(listItems).find(li => 
                !li.querySelector('.cards-card-image')
            );
            
            if (noImageCard) {
                expect(noImageCard.querySelector('.cards-card-body')).to.exist;
                expect(noImageCard.querySelector('.card-heading')).to.exist;
            }
        });

        it('Should properly set up anchor links', () => {
            listItems.forEach(li => {
                const anchor = li.querySelector('a');
                expect(anchor).to.exist;
                if (anchor.href) {
                    expect(anchor.href).to.not.be.empty;
                }
            });
        });

        it('Should handle heading variations', () => {
            listItems.forEach(li => {
                const heading = li.querySelector('.card-heading');
                if (heading) {
                    expect(heading.classList.contains('spectrum-Heading')).to.be.true;
                    expect(heading.classList.contains('spectrum-Heading--sizeS')).to.be.true;
                    expect(heading.textContent.trim()).to.not.be.empty;
                }
            });
        });

        it('Should style description paragraphs correctly', () => {
            listItems.forEach(li => {
                const description = li.querySelector('.cards-card-body > p');
                if (description) {
                    expect(description.style.color).to.equal('rgb(110, 110, 110)');
                    expect(description.textContent.trim()).to.not.be.empty;
                }
            });
        });

        it('Should maintain proper card structure', () => {
            listItems.forEach(li => {
                const cardBody = li.querySelector('.cards-card-body');
                expect(cardBody).to.exist;
                
                // Verify basic structure
                expect(li.querySelector('a')).to.exist;
                
                // Check content order
                if (li.querySelector('.cards-card-image')) {
                    expect(li.querySelector('a > .cards-card-image')).to.exist;
                }
                expect(li.querySelector('a > .cards-card-body')).to.exist;
            });
        });
    });
});