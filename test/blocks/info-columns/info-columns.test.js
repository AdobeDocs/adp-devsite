import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'info-columns.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const infoColumnsBlock = document.querySelector('div.info-columns');
await decorateBlock(infoColumnsBlock);
await loadBlock(infoColumnsBlock);

describe('Info-columns block', () => {
    it('should be a div with class info-columns', () => {
        expect(infoColumnsBlock).to.exist;
        expect(infoColumnsBlock.classList.contains('info-columns')).to.be.true;
        expect(infoColumnsBlock.getAttribute('daa-lh')).to.equal('info-columns');
    });

    it('info-columns > info-column', () => {
        infoColumnsBlock.querySelectorAll('.info-columns > div > div').forEach((column) => {
            expect(column.classList.contains('info-column')).to.be.true;
        });
    });

    it('info-column > h1, h2, h3, h4, h5, h6', () => {
        infoColumnsBlock.querySelectorAll('.info-column').forEach((column) => {
            column.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
                expect(h.classList.contains('spectrum-Heading')).to.be.true;
                expect(h.classList.contains('spectrum-Heading--sizeM')).to.be.true;
                expect(h.classList.contains('column-header')).to.be.true;
            });

            column.querySelectorAll('ul').forEach((ul) => {
                expect(ul.classList.contains('spectrum-Body')).to.be.true;
                expect(ul.classList.contains('spectrum-Body--sizeM')).to.be.true;
            });

            
            column.querySelectorAll('p').forEach((p) => {
                const hasLinks = p.querySelectorAll('a, button');
                if (!p.classList.contains('icon-container') && hasLinks.length === 0) {
                    expect(p.classList.contains('spectrum-Body')).to.be.true;
                    expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
                } else {
                    expect(p.classList.contains('icon-container')).to.be.true;
                }
            });

            column.querySelectorAll('a').forEach((a) => {
                expect(a.classList.contains('spectrum-Link')).to.be.true;
                expect(a.classList.contains('spectrum-Link--quiet')).to.be.true;
            });
        });

    });
});