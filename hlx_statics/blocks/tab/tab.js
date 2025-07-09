import decoratePreformattedCode from "../../components/code.js";
import { getMetadata } from "../../scripts/scripts.js";

/**
 * Decorates the tab block 
 * @param {*} block The text block element
 */

const createCodeBlock = (codeBlock, language) => {
  const preContainer = document.createElement('div');
  const pre = document.createElement('pre');
  const code = document.createElement('code');

  const lang = language.toLowerCase().trim();
  if (lang) {
    code.className = `language-${lang}`;
  }

  code.innerHTML = codeBlock.innerHTML;
  pre.appendChild(code);
  preContainer.appendChild(pre);
  decoratePreformattedCode(preContainer);

  return preContainer;
}

const handleCode = (contentDiv) => {
  const codeBlock = contentDiv.querySelector('pre code');
  const isTable = contentDiv.querySelector('table');

  if (codeBlock && !isTable) {
    const language = contentDiv.querySelector('p')?.textContent.trim();
    const preContainer = createCodeBlock(codeBlock, language);
    contentDiv.innerHTML = preContainer.innerHTML;
  }
}

const createSubTabs = (table) => {
  const subTabsWrapper = document.createElement('div');
  subTabsWrapper.className = 'sub-tabs-wrapper';

  const subContentWrapper = document.createElement('div');
  subContentWrapper.className = 'sub-content-wrapper';

  let subTabCount = 0;

  table.querySelectorAll('tbody tr').forEach((row) => {
    const subTabTitle = row.querySelector('td:first-child')?.textContent.trim();
    const codeBlock = row.querySelector('pre code');
    const language = row.querySelector('p')?.textContent.trim();

    if (subTabTitle && codeBlock) {
      subTabCount++;

      const subTabButton = document.createElement('button');
      subTabButton.className = 'sub-tab-button';
      subTabButton.textContent = subTabTitle;
      subTabButton.setAttribute('data-sub-tab', `subTab${subTabCount}`);
      if (subTabCount === 1) subTabButton.classList.add('active');

      const subContentDiv = document.createElement('div');
      subContentDiv.className = 'sub-tab-content';
      subContentDiv.setAttribute('data-sub-tab-content', `subTab${subTabCount}`);

      const preContainer = createCodeBlock(codeBlock, language);
      subContentDiv.appendChild(preContainer);

      if (subTabCount === 1) subContentDiv.classList.add('active');

      subTabButton.addEventListener('click', () => {
        subTabsWrapper.querySelectorAll('.sub-tab-button').forEach((btn) => btn.classList.remove('active'));
        subContentWrapper.querySelectorAll('.sub-tab-content').forEach((content) => content.classList.remove('active'));

        subTabButton.classList.add('active');
        subContentDiv.classList.add('active');
      });

      subTabsWrapper.appendChild(subTabButton);
      subContentWrapper.appendChild(subContentDiv);
    }
  });

  table.remove();
  return { subTabsWrapper, subContentWrapper };
}

export default async function decorate(block) {
  let orientation;
  if (getMetadata('template') === 'documentation') {
    orientation = block.getAttribute('data-orientation') || 'horizontal';
  }
  block.classList.add(orientation);
  block.setAttribute('daa-lh', 'tab');

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'tabs-wrapper';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'content-wrapper';

  let tabCount = 0;
  
  const blockClasses = Array.from(block.classList);
    
    blockClasses.forEach((cls) => {
    if (cls.startsWith('background-color-')) {
      block.classList.add(cls);
      block.closest('.tab-wrapper')?.classList.add(`${cls}-applied`);
    }

    if (cls.startsWith('tab-bg-')) {
      tabsWrapper.classList.add(`${cls}-applied`);
    }

    if (cls.startsWith('code-bg-')) {
      contentWrapper.classList.add(`${cls}-applied`);
    }
  });

  block.querySelectorAll('div').forEach((tab) => {
    const tabTitle = tab.querySelector('h2, h3, strong')?.textContent.trim();
    const tabImage = tab.querySelector('picture')?.outerHTML || '';
    const tabContent = tab.querySelector('div:last-child');

    if (tabTitle && tabContent) {
      tabCount++;

      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.innerHTML = `
        <div class="tab-icon">${tabImage}</div>
        <span class="tab-title">${tabTitle}</span>
      `;
      tabButton.setAttribute('data-tab', `tab${tabCount}`);
      if (tabCount === 1) tabButton.classList.add('active');

      const contentDiv = document.createElement('div');
      contentDiv.className = 'tab-content';
      contentDiv.setAttribute('data-tab-content', `tab${tabCount}`);
      contentDiv.innerHTML = tabContent.innerHTML;

      handleCode(contentDiv);

      contentDiv.querySelectorAll('table').forEach((table) => {
        const { subTabsWrapper, subContentWrapper } = createSubTabs(table);
        contentDiv.appendChild(subTabsWrapper);
        contentDiv.appendChild(subContentWrapper);
      });

      if (tabCount === 1) contentDiv.classList.add('active');

      tabButton.addEventListener('click', () => {
        tabsWrapper.querySelectorAll('.tab-button').forEach((btn) => btn.classList.remove('active'));
        contentWrapper.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

        tabButton.classList.add('active');
        contentDiv.classList.add('active');
      });

      tabsWrapper.appendChild(tabButton);
      contentWrapper.appendChild(contentDiv);
    }
  });

  block.innerHTML = '';
  block.appendChild(tabsWrapper);
  block.appendChild(contentWrapper);
}
