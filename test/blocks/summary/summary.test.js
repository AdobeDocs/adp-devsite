import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';




describe('Summary block', () => {
    let summaryBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'summary-withPicture.html' });
        summaryBlock = document.querySelector('div.summary');
        const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        await decorateBlock(summaryBlock);
        await loadBlock(summaryBlock);
    });

    it('Builds summary block', async () => {
        expect(summaryBlock).to.exist;
        expect(summaryBlock.getAttribute('daa-lh')).to.equal('summary');
        expect(summaryBlock.classList.contains('spectrum--dark')).to.be.true;
    });

    it('summary > heading', async () => {
        summaryBlock.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            expect(heading.classList.contains('spectrum-Heading')).to.be.true;
            expect(heading.classList.contains('spectrum-Heading--sizeL')).to.be.true;
        });
    });

    it('summary > paragraph', async () => {
        summaryBlock.querySelectorAll('p').forEach((p) => {
            const hasLinks = p.querySelectorAll('a, button');
            if (!p.classList.contains('icon-container') && hasLinks.length === 0) {
                expect(p.classList.contains('spectrum-Body')).to.be.true;
                expect(p.classList.contains('spectrum-Body--sizeL')).to.be.true;
            } else if (hasLinks.length > 0) {
                expect(p.classList.contains('button-container')).to.be.false;
            }
            hasLinks.forEach((button) => {
                //todo: line 45:classNames does not contain "primarybutton" 
                if (summaryBlock.classList.contains('primarybutton')) {
                    expect(button.classList.contains('spectrum-Button')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--fill')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--accent')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--sizeM')).to.be.true;
                } else {
                    expect(button.classList.contains('spectrum-Button')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--secondary')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--sizeM')).to.be.true;
                    expect(button.classList.contains('spectrumButton--overBackground')).to.be.true;
                    expect(button.classList.contains('spectrum-Button--outline')).to.be.true;
                    if (!summaryBlock.classList.contains('background-color-gray') && !summaryBlock.classList.contains('background-color-white')) {
                        expect(button.classList.contains('spectrum-Button--staticWhite')).to.be.true;
                    }
                }
            });
        });
    });

});

describe('Summary block no picture', () => {
    let summaryBlock;

    before(async () => {
        document.body.innerHTML = await readFile({ path: 'summary-noPicture.html' });
        summaryBlock = document.querySelector('div.summary');
        const { loadBlock, decorateBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
        await decorateBlock(summaryBlock);
        await loadBlock(summaryBlock);
    });

    it('summary > background', async () => {
        expect(summaryBlock.querySelector('picture')).to.not.exist;
        expect(summaryBlock.classList.contains('no-image')).to.be.true;

        //todo: how to test line 24 - 28? 
    });
});