import decoratePreformattedCode from "../../components/code.js";

/**
 * Decorates the tab block 
 * @param {*} block The text block element
 */
export default async function decorate(block) {

  const orientation = block.getAttribute('data-orientation');
  block.classList.add(orientation)
  block.setAttribute('daa-lh', 'tab');

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'tabs-wrapper';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'content-wrapper';

  let tabCount = 0;

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

      contentDiv.querySelectorAll('table').forEach((table) => {
        const subTabsWrapper = document.createElement('div');
        subTabsWrapper.className = 'sub-tabs-wrapper';

        const subContentWrapper = document.createElement('div');
        subContentWrapper.className = 'sub-content-wrapper';

        let subTabCount = 0;

        table.querySelectorAll('tbody tr').forEach((row) => {
          const subTabTitle = row.querySelector('td:first-child')?.textContent.trim();
          const codeBlock = row.querySelector('pre code');
          const language = row.querySelector('p')?.textContent.trim() || 'none';

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

            const preContainer = document.createElement('div');
            preContainer.className = 'code-toolbar';
            const pre = document.createElement('pre');
            pre.className = `language-${language.toLowerCase()}`;
            pre.innerHTML = codeBlock.outerHTML;

            preContainer.appendChild(pre);
            subContentDiv.appendChild(preContainer);

            decoratePreformattedCode(preContainer);

            if (subTabCount === 1) {
              subContentDiv.classList.add('active');
            }

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

        contentDiv.appendChild(subTabsWrapper);
        contentDiv.appendChild(subContentWrapper);
        table.remove();
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
