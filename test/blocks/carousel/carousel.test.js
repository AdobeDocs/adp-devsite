import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'carousel.html' });
const { decorateBlock, loadBlock, decorateButtons } = await import('../../../hlx_statics/scripts/lib-helix.js');


const carouselBlock = document.querySelector('div.carousel');
await decorateButtons(carouselBlock);
await decorateBlock(carouselBlock);
await loadBlock(carouselBlock);

describe('Carousel block', () => {
    it('Builds carouse block', async () => {
        expect(carouselBlock).to.exist;
        expect(carouselBlock.getAttribute('daa-lh')).to.equal('carousel');
    });

    it('Carousel >  block children', async () => {
        const block_container = carouselBlock.querySelector('.block-container');
        expect(block_container).to.exist;
        expect(carouselBlock.querySelector('.carousel-circle-div')).to.exist;

        const carousel_section = carouselBlock.querySelector('.slider-wrapper');
        expect(carousel_section).to.exist;
        expect(carousel_section.querySelector('.slides-container')).to.exist;

        const arrow_button_previous = carouselBlock.querySelector('.slide-arrow-previous');
        expect(arrow_button_previous).to.exist;
        expect(arrow_button_previous.classList.contains('slide-arrow')).to.be.true;
        expect(arrow_button_previous.innerHTML).to.equal('‹');
        expect(arrow_button_previous.ariaLabel).to.equal('backward arrow');

        const arrow_button_forward = carouselBlock.querySelector('.slide-arrow-forward');
        expect(arrow_button_forward).to.exist;
        expect(arrow_button_forward.classList.contains('slide-arrow')).to.be.true;
        expect(arrow_button_forward.innerHTML).to.equal('›');
        expect(arrow_button_forward.ariaLabel).to.equal('forward arrow');

        //check order of children
        expect(block_container.children[0]).to.equal(arrow_button_previous);
        expect(block_container.children[1]).to.equal(carousel_section);
        expect(block_container.children[2]).to.equal(arrow_button_forward);
    });

    it('Carousel > div:not([class]) > div:not([class])', async () => {
        carouselBlock.querySelectorAll(':scope > div:not([class]) > div:not([class])').forEach((innerDiv, index) => {
            expect(innerDiv.classList.contains('carousel-container')).to.be.true;
            expect(innerDiv.parentElement.classList.contains('carousel-container')).to.be.true;
            expect(innerDiv.getAttribute('id')).to.equal(`carouselTab-${index}`);

            const div_slide_circle = carouselBlock.querySelector('.carousel-circle-div');
            const circle_button = div_slide_circle.querySelector(`#${index + 1}`);
            expect(circle_button).to.exist;
            expect(circle_button.classList.contains('carousel-circle')).to.be.true;
            expect(circle_button.ariaLabel).to.equal(`Slide ${index + 1}`);

            const carousel_ul = carouselBlock.querySelector('.slides-container');
            const carousel_li = carousel_ul.children[index];
            expect(carousel_li).to.exist;
            expect(carousel_li.classList.contains('slide')).to.be.true;
            expect(carousel_li.firstElementChild).to.equal(innerDiv);

            const flex_div = innerDiv.querySelector(`#text-flex-div-carouselTab-${index}`);
            expect(flex_div).to.exist;
            expect(flex_div.classList.contains('text-container')).to.be.true;

            innerDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
                expect(h.classList.contains('spectrum-Heading')).to.be.true;
                expect(h.classList.contains('spectrum-Heading--sizeL')).to.be.true;
                expect(h.classList.contains('carousel-heading')).to.be.true;
            });

            const button_div = flex_div.querySelector(`#button-div-carouselTab-${index}`);
            expect(button_div).to.exist;
        })
    });

    it('Carousel > Img', async () => {
        carouselBlock.querySelectorAll("img").forEach((img) => {
            if (img.parentElement.parentElement.tagName === "A") { //FIXME: not tested yet
                img.parentElement.parentElement.parentElement.classList.add("IMAGE");
                const flex_div = carouselBlock.parentElement.parentElement.parentElement.parentElement.querySelector(`#media-flex-div-${img.parentElement.parentElement.parentElement.id}`);
                expect(flex_div).to.exist;
                expect(flex_div.contains(img.parentElement.parentElement)).to.be.true;
                expect(flex_div.classList.contains('media-container')).to.be.true;
            } else {
                expect(img.parentElement.parentElement.classList.contains('IMAGE')).to.be.true;
                const flex_div = carouselBlock.querySelector(`#${img.parentElement.parentElement.parentElement.id}`);
                expect(flex_div).to.exist;
                expect(flex_div.contains(img.parentElement.parentElement)).to.be.true;
                expect(flex_div.classList.contains('media-container')).to.be.true;
            }
        });
    });

    it('Carousel > video-element', async () => {
        carouselBlock.querySelectorAll('.video-element').forEach((video) => {
            expect(video.id).to.equal("media-flex-div-" + video.parentElement.id);
            expect(video.classList.contains('media-container')).to.be.true;
        });
    });

    it('Carousel > p', async () => {
        carouselBlock.querySelectorAll('p').forEach((p) => {
            if (p.classList.contains('IMAGE')) {
                expect(p.classList.contains('image-container')).to.be.true;
            } else {
                const button_div = carouselBlock.querySelector("[id=button-div-" + p.parentElement.parentElement.id + "]");
                if (p.classList.contains('button-container')) {
                    expect(button_div.classList.contains('carousel-button-container')).to.be.true;
                    expect(button_div.children.contains(p)).to.be.true;
                } else {
                    const flex_div = carouselBlock.querySelector("[id=text-flex-div-" + p.parentElement.parentElement.id + "]");
                    if (p.querySelector("span")) {
                        expect(p.classList.contains('icon-container')).to.be.true;
                        const icon_link = p.querySelector("a");
                        if (icon_link) {
                            expect(icon_link.classList.contains('spectrum-Link')).to.be.true;
                            expect(icon_link.classList.contains('spectrum-Link--quiet')).to.be.true;
                        }
                    } else {
                        expect(flex_div.getAttribute("class")).to.equal("text-container");
                        expect(p.classList.contains('spectrum-Body')).to.be.true;
                        expect(p.classList.contains('spectrum-Body--sizeM')).to.be.true;
                    }
                    expect(flex_div.contains(p)).to.be.true;
                }
            }
        });
    });

    it('Carousel > text-container', async () => {
        carouselBlock.querySelectorAll('div.text-container').forEach((text_container) => {
            const prevElement = text_container.querySelector('p.icon-container')?.previousElementSibling;
            const productLinkContainer = text_container.querySelector('div.product-link-container');

            if (prevElement) {
                text_container.querySelectorAll('p.icon-container').forEach((iconContainer) => {
                    expect(productLinkContainer.contains(iconContainer)).to.be.true;
                    expect(prevElement.nextElementSibling).to.equal(productLinkContainer);
                });
            }
        });
    });

    it('Carousel > arrow buttons', async () => {
        let count = 1;
        const slidesContainer = carouselBlock.querySelector(".slides-container");
        const slide = carouselBlock.querySelector(".slide");
        const prevButton = carouselBlock.querySelector(".slide-arrow-previous");
        const nextButton = carouselBlock.querySelector(".slide-arrow-forward");
        const initialSelectedCircle = carouselBlock.querySelector(".carousel-circle-selected");
        const initialCircleId = parseInt(initialSelectedCircle.id);

        // Test next button click
        nextButton.click();
        const nextCircleId = initialCircleId === count - 1 ? 1 : initialCircleId + 1;
        const nextSelectedCircle = carouselBlock.querySelector(`[id="${nextCircleId}"]`);
        expect(nextSelectedCircle.classList.contains('carousel-circle-selected')).to.be.true;
        expect(initialSelectedCircle.classList.contains('carousel-circle-selected')).to.be.false;
        expect(slidesContainer.scrollLeft).to.equal(slidesContainer.clientLeft + slide.clientWidth * (nextCircleId - 1));

        // Test previous button click
        prevButton.click();
        const prevCircleId = nextCircleId === 1 ? count - 1 : nextCircleId - 1;
        const prevSelectedCircle = carouselBlock.querySelector(`[id="${prevCircleId}"]`);
        expect(prevSelectedCircle.classList.contains('carousel-circle-selected')).to.be.true;
        expect(nextSelectedCircle.classList.contains('carousel-circle-selected')).to.be.false;
        expect(slidesContainer.scrollLeft).to.equal((prevCircleId - 1) * slide.clientWidth);
    });

    it('Carousel > circle buttons', async () => {
        const buttons = carouselBlock.querySelectorAll(".carousel-circle");
        const slidesContainer = carouselBlock.querySelector(".slides-container");
        const slide = carouselBlock.querySelector(".slide");

        expect(buttons[0].classList.contains('carousel-circle-selected')).to.be.true;

        buttons.forEach((button) => {
            button.click();

            expect(button.classList.contains('carousel-circle-selected')).to.be.true;

            buttons.forEach((otherButton) => {
                if (otherButton !== button) {
                    expect(otherButton.classList.contains('carousel-circle-selected')).to.be.false;
                }
            });

            const slideNum = parseInt(button.id);
            const expectedScrollLeft = slidesContainer.clientLeft + slide.clientWidth * (slideNum - 1);
            expect(slidesContainer.scrollLeft).to.equal(expectedScrollLeft);
        });
    });

    it('Carousel > mobile swipe detection', async () => {
        // Mock window.innerWidth for mobile screen
        const originalInnerWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 600
        });

        // Create touch events with required properties
        const touchStartEvent = new Event('touchstart');
        Object.defineProperty(touchStartEvent, 'changedTouches', {
            value: [{
                screenX: 500,
                clientX: 500,
                pageX: 500,
                target: carouselBlock,
                identifier: 0
            }]
        });

        const touchEndLeftEvent = new Event('touchend');
        Object.defineProperty(touchEndLeftEvent, 'changedTouches', {
            value: [{
                screenX: 300,
                clientX: 300,
                pageX: 300,
                target: carouselBlock,
                identifier: 0
            }]
        });

        // Test swipe left
        carouselBlock.dispatchEvent(touchStartEvent);
        carouselBlock.dispatchEvent(touchEndLeftEvent);

        const nextSelectedCircle = carouselBlock.querySelector(".carousel-circle-selected");
        expect(nextSelectedCircle).to.exist;

        // Test swipe right
        const touchEndRightEvent = new Event('touchend');
        Object.defineProperty(touchEndRightEvent, 'changedTouches', {
            value: [{
                screenX: 700,
                clientX: 700,
                pageX: 700,
                target: carouselBlock,
                identifier: 0
            }]
        });

        carouselBlock.dispatchEvent(touchStartEvent);
        carouselBlock.dispatchEvent(touchEndRightEvent);

        const prevSelectedCircle = carouselBlock.querySelector(".carousel-circle-selected");
        expect(prevSelectedCircle).to.exist;

        // Reset window.innerWidth
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth
        });
    });

    //FIXME: advanceSlide() not tested yet: isPaused is local variable in carousel block.

    // it('Tests automatic slide advancement', async function() {
    //     // Increase timeout to 15 seconds to accommodate the 9-second slide advancement + buffer
    //     this.timeout(15000);

    //     const initialCircle = carouselBlock.querySelector('.carousel-circle-selected');
    //     const initialId = parseInt(initialCircle.id);
    //     const count = carouselBlock.querySelectorAll('.carousel-circle').length;

    //     await new Promise(resolve => setTimeout(resolve, 10000));

    //     const newSelectedCircle = carouselBlock.querySelector('.carousel-circle-selected');
    //     const newId = parseInt(newSelectedCircle.id);

    //     if (initialId < count - 1) {
    //         expect(newId).to.equal(initialId + 1);
    //     } else {
    //         expect(newId).to.equal(1);
    //     }
    //     expect(initialCircle.classList.contains('carousel-circle-selected')).to.be.false;
    // });

});

