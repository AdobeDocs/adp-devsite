import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'contributors.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const contributorsBlock = document.querySelector('div.contributors');
await decorateBlock(contributorsBlock);
await loadBlock(contributorsBlock);

describe('Contributors block', () => {
    it('Builds contributors block', async () => {
      expect(contributorsBlock).to.exist;
      expect(contributorsBlock.classList.contains('contributors')).to.be.true;
    });

    it('contributors > isBorder', async () => {
        const isBorder = contributorsBlock?.parentElement?.parentElement?.getAttribute("data-isborder");
        if (isBorder) {
            expect(contributorsBlock.parentElement?.parentElement?.classList.contains('wrapper-border')).to.be.true;
        }
    });

    it('contributors > contributor-modal', async () => {
        const contributorModal = document.querySelector('div.contributor-modal');
        expect(contributorModal).to.exist;
    });

    it('contributors > firstDiv', async () => {
        const firstDiv = contributorsBlock.querySelector('div.contibutors-wrapper-comp');
        expect(firstDiv).to.exist;
    });

    it('contributors > remove p tags', async () => {
        const pTags = contributorsBlock.querySelectorAll('p');
        expect(pTags.length).to.equal(0);
    });

    it('contributors > remove divs without children', async () => {
        contributorsBlock.querySelectorAll('div').forEach(d => {
            expect(d.hasChildNodes()).to.be.true;
        });
    });

    it('contributors > last update div', async () => {
        // FIXME: contribution_date is hard coded
        const contribution_date = '2/21/2024';
        const lastUpdateDiv = contributorsBlock.querySelector('div.lastUpdateDetails');
        expect(lastUpdateDiv).to.exist;
        const lastUpdateLink = lastUpdateDiv.querySelector('a');
        expect(lastUpdateLink).to.exist;
        expect(lastUpdateLink.href).to.equal('https://github.com/AdobeDocs/express-add-ons-docs/commits/main/src/pages/references/index.md');
        expect(lastUpdateLink.target).to.equal('_blank');
        const span = lastUpdateLink.querySelector('span:not([class])');
        expect(span).to.exist;
        expect(span.innerText).to.equal(`Last updated ${contribution_date}`);
    });

    it('contributors > image list div', async () => {
        // FIXME: resources are hard coded
        const github_user_profile_pic = [
            "https://github.com/hollyschinsky.png",
            "https://github.com/vamshich13.png",
            "https://github.com/nimithajalal.png"
        ];
        const imageListDiv = contributorsBlock.querySelector('div.imageList');
        expect(imageListDiv).to.exist;
        github_user_profile_pic.forEach((src) => {
            const img = imageListDiv.querySelector(`img[src="${src}"]`);
            expect(img).to.exist;
            expect(img.classList.contains('image-contributor')).to.be.true;
            expect(img.parentElement.classList.contains('span-Image-contributor')).to.be.true;
            expect(img.parentElement.parentElement).to.equal(imageListDiv);
        });
    });

    it('contributors > feedback', async () => {
        const feedbackDiv = contributorsBlock.querySelector('div.feedback');
        expect(feedbackDiv).to.exist;
        
        const feedbackWrapper = feedbackDiv.querySelector('div.feedbackWrapper');
        expect(feedbackWrapper).to.exist;
        
        const helpfulText = feedbackWrapper.querySelector('span');
        expect(helpfulText).to.exist;
        expect(helpfulText.innerText).to.equal('Was this helpful?');
        
        const buttonWrapper = feedbackWrapper.querySelector('div.buttonWrapper');
        expect(buttonWrapper).to.exist;
        
        const yesButton = buttonWrapper.querySelector('button[daa-ll="Feedback-Yes"]');
        expect(yesButton).to.exist;
        expect(yesButton.innerText).to.equal('Yes');
        expect(yesButton.classList.contains('spectrum-Button')).to.be.true;
        
        const noButton = buttonWrapper.querySelector('button[daa-ll="Feedback-No"]');
        expect(noButton).to.exist;
        expect(noButton.innerText).to.equal('No');
        expect(noButton.classList.contains('spectrum-Button')).to.be.true;
    });

    it('contributors > click event > shows modal', async () => {
        const modal = document.querySelector('.contributor-modal');
        const yesButton = contributorsBlock.querySelector('button[daa-ll="Feedback-Yes"]');
        const noButton = contributorsBlock.querySelector('button[daa-ll="Feedback-No"]');
        
        // Test Yes button
        yesButton.click();
        expect(modal.style.display).to.equal('block');
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
        expect(modal.classList.contains('show')).to.be.true;
        
        // Close modal
        const closeButton = modal.querySelector('.close-button');
        closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
        expect(modal.classList.contains('show')).to.be.false;
        expect(modal.style.display).to.equal('none');
        
        // Test No button
        noButton.click();
        expect(modal.style.display).to.equal('block');
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
        expect(modal.classList.contains('show')).to.be.true;
    });

    it('contributors > click event > closes modal', async () => {
        const modal = document.querySelector('.contributor-modal');
        const modelCompContributors = modal.querySelector('.model-comp-contributors');
        
        // Show modal first
        const yesButton = contributorsBlock.querySelector('button[daa-ll="Feedback-Yes"]');
        yesButton.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
        
        // Test close button
        const closeButton = modal.querySelector('.close-button');
        closeButton.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
        expect(modal.classList.contains('show')).to.be.false;
        expect(modal.style.display).to.equal('none');
        
        // Show modal again
        yesButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Test clicking outside
        modelCompContributors.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(modal.classList.contains('show')).to.be.false;
        expect(modal.style.display).to.equal('none');
    });
   
});