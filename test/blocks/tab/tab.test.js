import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'tab.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const tabBlock = document.querySelector('div.tab');
await decorateBlock(tabBlock);
await loadBlock(tabBlock);

describe('Tab block', () => {
  describe('Basic Block Structure', () => {
    it('tab > block', () => {
      expect(tabBlock).to.exist;
      expect(tabBlock.getAttribute('daa-lh')).to.equal('tab');
      expect(tabBlock.classList.contains('tab')).to.be.true;
    });

    it('tab > wrapper', () => {
      const tabsWrapper = tabBlock.querySelector('.tabs-wrapper');
      const contentWrapper = tabBlock.querySelector('.content-wrapper');
      
      expect(tabsWrapper).to.exist;
      expect(contentWrapper).to.exist;
      expect(tabsWrapper.parentElement).to.equal(tabBlock);
      expect(contentWrapper.parentElement).to.equal(tabBlock);
    });

    it('tab > button count', () => {
      const tabButtons = tabBlock.querySelectorAll('.tab-button');
      const tabContents = tabBlock.querySelectorAll('.tab-content');
      
      expect(tabButtons.length).to.equal(tabContents.length);
    });

    it('tab > attributes', () => {
      const tabButtons = tabBlock.querySelectorAll('.tab-button');
      const tabContents = tabBlock.querySelectorAll('.tab-content');

      tabButtons.forEach((button, index) => {
        const tabId = `tab${index + 1}`;
        expect(button.getAttribute('data-tab')).to.equal(tabId);
        expect(tabContents[index].getAttribute('data-tab-content')).to.equal(tabId);
      });
    });
  });

  describe('Tab Button Structure', () => {
    it('tab > button', () => {
      const tabButton = tabBlock.querySelector('.tab-button');
      
      expect(tabButton.querySelector('.tab-icon')).to.exist;
      expect(tabButton.querySelector('.tab-title')).to.exist;
      expect(tabButton.hasAttribute('data-tab')).to.be.true;
    });

    it('tab > button load structure', () => {
      const tabButton = tabBlock.querySelector('.tab-button');
      
      expect(tabButton.className).to.equal('tab-button');
      
      const tabIcon = tabButton.querySelector('.tab-icon');
      const tabTitle = tabButton.querySelector('.tab-title');
      
      expect(tabIcon).to.exist;
      expect(tabTitle).to.exist;
      
      expect(tabButton.children.length).to.equal(2);
      expect(tabButton.children[0]).to.equal(tabIcon);
      expect(tabButton.children[1]).to.equal(tabTitle);
      
      const image = tabIcon.querySelector('picture');
      if (image) {
        expect(tabIcon.children[0]).to.equal(image);
      }
      
      expect(tabTitle.childNodes.length).to.equal(1);
      expect(tabTitle.firstChild.nodeType).to.equal(Node.TEXT_NODE);
    });
  });

  describe('Tab Clicks', () => {
    let tabButtons;
    let tabContents;

    beforeEach(() => {
      tabButtons = tabBlock.querySelectorAll('.tab-button');
      tabContents = tabBlock.querySelectorAll('.tab-content');
    });

    it('tab > default load', () => {
      expect(tabButtons[0].classList.contains('active')).to.be.true;
      expect(tabContents[0].classList.contains('active')).to.be.true;
    });

    it('tab > button clicks', () => {
      tabButtons[1].click();
      
      expect(tabButtons[0].classList.contains('active')).to.be.false;
      expect(tabContents[0].classList.contains('active')).to.be.false;
      expect(tabButtons[1].classList.contains('active')).to.be.true;
      expect(tabContents[1].classList.contains('active')).to.be.true;

      tabButtons[0].click();
      expect(tabButtons[0].classList.contains('active')).to.be.true;
      expect(tabContents[0].classList.contains('active')).to.be.true;
    });
  });

  describe('Sub-tabs', () => {
    let subTabButtons;
    let subTabContents;

    beforeEach(() => {
      subTabButtons = tabBlock.querySelectorAll('.sub-tab-button');
      subTabContents = tabBlock.querySelectorAll('.sub-tab-content');
    });

    it('sub-tab > load', () => {
      if (subTabButtons.length > 0) {
        const subTabsWrapper = tabBlock.querySelector('.sub-tabs-wrapper');
        const subContentWrapper = tabBlock.querySelector('.sub-content-wrapper');
        
        expect(subTabsWrapper).to.exist;
        expect(subContentWrapper).to.exist;
        expect(subTabButtons[0].hasAttribute('data-sub-tab')).to.be.true;
        expect(subTabContents[0].hasAttribute('data-sub-tab-content')).to.be.true;
      }
    });

    it('sub-tab > attributes', () => {
      if (subTabButtons.length > 0) {
        subTabButtons.forEach((button, index) => {
          const subTabId = `subTab${index + 1}`;
          expect(button.getAttribute('data-sub-tab')).to.equal(subTabId);
          expect(subTabContents[index].getAttribute('data-sub-tab-content')).to.equal(subTabId);
        });
      }
    });

    it('sub-tab > click event', () => {
      if (subTabButtons.length > 1) {
        expect(subTabButtons[0].classList.contains('active')).to.be.true;
        expect(subTabContents[0].classList.contains('active')).to.be.true;

        subTabButtons[1].click();
        expect(subTabButtons[0].classList.contains('active')).to.be.false;
        expect(subTabContents[0].classList.contains('active')).to.be.false;
        expect(subTabButtons[1].classList.contains('active')).to.be.true;
        expect(subTabContents[1].classList.contains('active')).to.be.true;
      }
    });
  });

  describe('function > handleCode', () => {
    it('code block > format', () => {
      const codeBlocks = tabBlock.querySelectorAll('pre code');
      if (codeBlocks.length > 0) {
        codeBlocks.forEach(codeBlock => {
          const pre = codeBlock.closest('pre');
          expect(pre).to.exist;
          if (pre.className) {
            expect(pre.className).to.match(/language-[a-z]+/);
            expect(pre.classList.contains('line-numbers')).to.be.true;
          }
        });
      }
    });
  });
});
