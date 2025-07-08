import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const setup = async (path) => {
    document.body.innerHTML = await readFile({ path });
    const main = document.querySelector('main');
    const { loadBlock, decorateBlock, decorateSections, decorateButtons } = await import('../../../hlx_statics/scripts/lib-helix.js');
    await decorateSections(main);
    const columnsBlock = main.querySelector('div.columns');
    await decorateButtons(columnsBlock);
    await decorateBlock(columnsBlock);
    await loadBlock(columnsBlock);
    return columnsBlock;
}

describe('Columns block', () => {
    let columnsBlock;

    before(async () => {
        columnsBlock = await setup('columns.html');
    });

    it('Builds columns block', async () => {
        expect(columnsBlock).to.exist;
        expect(columnsBlock.getAttribute('daa-lh')).to.equal('columns');
    });

    it('Columns > columns-container', async () => {
        expect(columnsBlock.parentElement.parentElement.classList.contains('columns-container')).to.be.true;
    });

    it('Columns > headings', async () => {
        const headings = columnsBlock.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading) => {
            expect(heading.classList.contains('spectrum-Heading')).to.be.true;
            expect(heading.classList.contains('spectrum-Heading--sizeM')).to.be.true;
            expect(heading.classList.contains('column-header')).to.be.true;
        });
    });

    it('Columns > paragraphs', async () => {
        columnsBlock.querySelectorAll('p').forEach((p) => {
            if (p.classList.contains('icon-container')) {
                expect(p.querySelector('span.icon')).to.exist;
            } else {
                expect(p.classList.contains('spectrum-Body')).to.be.true;
                expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
            }
        });
    });

    it("Columns > div numbers", async () => {
        const columnList = columnsBlock.querySelectorAll('.columns > div');
        if (columnList.length > 0) {
            expect(columnList[0].classList.contains("first-column-div")).to.be.true;
            expect(columnList[columnList.length - 1].classList.contains("last-column-div")).to.be.true;
        }
    });

    it('Columns > button group container', async () => {
        columnsBlock.querySelectorAll('.columns > div > div').forEach((column) => {
            const buttonGroupContainer = column.querySelector('.button-group-container');
            const buttonContainers = column.querySelectorAll('.button-container');

            if (buttonContainers.length > 0) {
                expect(buttonGroupContainer).to.exist;
                buttonContainers.forEach((buttonContainer) => {
                    expect(buttonContainer.parentElement).to.equal(buttonGroupContainer);
                });
            }
        });
    });

    it('Columns > lists', async () => {
        columnsBlock.querySelectorAll('.columns > div > div').forEach((column) => {
            const lists = column.querySelectorAll('ul');
            lists.forEach((ul) => {
                expect(ul.parentElement.classList.contains('listing')).to.be.true;
                expect(ul.classList.contains('spectrum-Body')).to.be.true;
                expect(ul.classList.contains('spectrum-Body--sizeM')).to.be.true;
            });
        });
    });

    it('Columns > links', async () => {
        columnsBlock.querySelectorAll('a').forEach((a) => {
            if (!a.classList.contains('button') && !a.classList.contains('spectrum-Button')) {
                expect(a.classList.contains('spectrum-Link')).to.be.true;
                expect(a.classList.contains('spectrum-Link--quiet')).to.be.true;
            }
        });
    });

    it('Columns > buttons', async () => {
        columnsBlock.querySelectorAll('.button').forEach((button) => {
            expect(button.classList.contains('spectrum-Button')).to.be.true;
            expect(button.classList.contains('spectrum-Button--sizeM')).to.be.true;

            if (button.parentElement.tagName.toLowerCase() !== 'strong') {
                expect(button.classList.contains('spectrum-Button--secondary')).to.be.true;
                expect(button.classList.contains('spectrum-Button--outline')).to.be.true;
            } else {
                expect(button.classList.contains('spectrum-Button--fill')).to.be.true;
                expect(button.classList.contains('spectrum-Button--accent')).to.be.true;
            }
        });
    });

    it('Columns > child numbers', async () => {
        columnsBlock.querySelectorAll('.columns > div > div:first-child').forEach((column) => {
            expect(column.classList.contains('first-column')).to.be.true;
        });

        columnsBlock.querySelectorAll('.columns > div > div:nth-child(2)').forEach((column) => {
            expect(column.classList.contains('second-column')).to.be.true;

            const p = column.querySelector('p');
            expect(p).to.exist;
            expect(p.classList.contains('spectrum-Body')).to.be.true;
            expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
        });

        columnsBlock.querySelectorAll('div > div.second-column').forEach((secondColumn) => {
            const prevElement = secondColumn.querySelector('p.icon-container')?.previousElementSibling;
            if (prevElement) {
                const productLinkContainer = secondColumn.querySelector('.product-link-container');
                expect(productLinkContainer).to.exist;
            }
        });
    });
});

describe('Columns block - center', () => {
    let columnsBlock;

    before(async () => {
        columnsBlock = await setup('columns-center.html');
    });

    it('Columns > center style', async () => {
        if (columnsBlock.classList.contains('center')) {
            if (columnsBlock.classList.contains('text-align-center')) {
                columnsBlock.querySelectorAll('p').forEach(paragraph => {
                    if (paragraph.querySelector('img')) {
                        expect(paragraph.classList.contains('paragraph-wrapper')).to.be.true;
                    }
                });
            }

            const columnWrapper = columnsBlock.querySelector('.first-column-div.last-column-div');
            if (columnWrapper) {
                columnWrapper.querySelectorAll(':scope > div').forEach(section => {
                    if (!section.querySelector('h3')) {
                        const h3 = section.querySelector('h3');
                        expect(h3).to.exist;
                        expect(h3.classList.contains('spectrum-Heading')).to.be.true;
                        expect(h3.classList.contains('spectrum-Heading--sizeM')).to.be.true;
                        expect(h3.classList.contains('column-header')).to.be.true;
                        expect(h3.classList.contains('without-content')).to.be.true;
                    }
                });
            }
        }
    });
});

describe('Columns block - image processing', () => {
    it('Columns > processes images when intersecting', async () => {
        const originalIntersectionObserver = window.IntersectionObserver;
        let observerCallback;
        window.IntersectionObserver = class {
            constructor(callback) {
                observerCallback = callback;
                this.callback = callback;
            }
            observe() { }
            disconnect() { }
        };

        const columnsBlock = await setup('columns.html');
        const originalPictureCount = columnsBlock.querySelectorAll('p.spectrum-Body.spectrum-Body--sizeM picture').length;

        observerCallback([{
            isIntersecting: true,
            target: columnsBlock
        }]);

        window.IntersectionObserver = originalIntersectionObserver;

        const processedPictures = columnsBlock.querySelectorAll('p.spectrum-Body.spectrum-Body--sizeM picture');
        expect(processedPictures.length).to.equal(3);
        expect(processedPictures.length).to.be.greaterThan(originalPictureCount);
    });
});