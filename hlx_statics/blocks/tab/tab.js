import decoratePreformattedCode, { applyLanguageDirectives, extractLanguageDirectives } from "../../components/code.js";
import { decorateButtons } from "../../scripts/lib-adobeio.js";
import { IS_DEV_DOCS } from "../../scripts/lib-helix.js";

/**
 * Decorates the tab block 
 * @param {*} block The text block element
 */

const createCodeBlock = (codeBlock, language) => {
  const preContainer = document.createElement('div');
  const pre = document.createElement('pre');
  if (language) {
    applyLanguageDirectives(pre, codeBlock, language);
  } else {
    const extracted = extractLanguageDirectives(codeBlock.closest('.tab-content, .sub-tab-content') || preContainer);
    if (extracted) {
      applyLanguageDirectives(pre, codeBlock, extracted);
    }
  }

  pre.innerHTML = codeBlock.outerHTML;
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

/**
 * Detects whether a <strong> label represents a "(NEW)" style badge.
 * This is a generic pattern match (not a hardcoded product name).
 */
const isNewBadgeText = (text) => /^\(?\s*new\s*\)?$/i.test(text || '');

/**
 * Transforms a "products" authoring table into the product card layout:
 *   column 1 -> intro (heading + paragraph)
 *   column 2 -> media (picture)
 *   column 3 -> product list (heading + list of product links)
 *
 * The table is treated purely as source data - none of the original
 * table/row/cell markup is kept in the final DOM.
 */
const createProductContent = (table) => {
  const productsContent = document.createElement('div');
  productsContent.className = 'products-content';

  const card = document.createElement('div');
  card.className = 'products-card';
  productsContent.appendChild(card);

  const row = table.querySelector(':scope > tbody > tr') || table.querySelector('tr');
  if (!row) {
    table.remove();
    return productsContent;
  }

  const cells = row.querySelectorAll(':scope > td');
  const [introCell, mediaCell, listCell] = cells;

  // Column 1 - intro
  if (introCell) {
    const intro = document.createElement('div');
    intro.className = 'products-intro';

    const heading = introCell.querySelector('h1, h2, h3, h4');
    if (heading) intro.appendChild(heading.cloneNode(true));

    const paragraphs = introCell.querySelectorAll(':scope > p');
    paragraphs.forEach((p) => intro.appendChild(p.cloneNode(true)));

    card.appendChild(intro);
  }

  // Column 2 - media
  if (mediaCell) {
    const media = document.createElement('div');
    media.className = 'products-media';

    const picture = mediaCell.querySelector('picture');
    if (picture) {
      media.appendChild(picture.cloneNode(true));
    }

    card.appendChild(media);
  }

  // Column 3 - product list
  if (listCell) {
    const listSection = document.createElement('div');
    listSection.className = 'products-list';

    const listHeading = listCell.querySelector('h1, h2, h3, h4');
    if (listHeading) listSection.appendChild(listHeading.cloneNode(true));

    const ul = document.createElement('ul');
    ul.className = 'products-list-items';

    listCell.querySelectorAll(':scope > ul > li, ul > li').forEach((li) => {
      const link = li.querySelector('a');
      // A product entry needs at least a link/name to be meaningful.
      if (!link) return;

      const item = document.createElement('li');
      item.className = 'product-item';

      const picture = li.querySelector('picture');
      if (picture) {
        const icon = document.createElement('span');
        icon.className = 'product-icon';
        icon.appendChild(picture.cloneNode(true));
        item.appendChild(icon);
      }

      const info = document.createElement('div');
      info.className = 'product-info';
      info.appendChild(link.cloneNode(true));

      const newLabel = [...li.querySelectorAll('strong')]
        .map((strong) => strong.textContent.trim())
        .find(isNewBadgeText);

      if (newLabel) {
        const badge = document.createElement('span');
        badge.className = 'product-new';
        badge.textContent = newLabel;
        info.appendChild(badge);
      }

      item.appendChild(info);
      ul.appendChild(item);
    });

    listSection.appendChild(ul);
    card.appendChild(listSection);
  }

  // The grid was authored assuming 3 columns (intro / media / list), but any
  // of those columns can be missing from the source table. Size the grid to
  // however many card sections actually got appended instead of leaving a
  // static 3-column track that would leave an empty gap.
  const columnCount = card.children.length;
  if (columnCount > 0) {
    card.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
  }

  table.remove();
  return productsContent;
}

export default async function decorate(block) {
  block.querySelectorAll(':scope > div > div > pre > code').forEach((code) => {
    const match = code.textContent.trim().match(/^(data-[^=]+)=(.*)$/);
    if (!match) return;
    const [, attr, value] = match;
    if (attr === 'data-orientation') {
      block.setAttribute('data-orientation', value.trim());
    } else if (attr === 'data-classname') {
      value.trim().split(/\s+/).filter(Boolean).forEach((cls) => block.classList.add(cls));
    }
  });

  const isProducts = block.classList.contains('products');

  const dataOrientation = block.getAttribute('data-orientation');
  const orientation = dataOrientation || (block.classList.contains('vertical') ? 'vertical' : 'horizontal');
  if (!block.classList.contains(orientation)) {
    block.classList.add(orientation);
  }
  block.setAttribute('daa-lh', 'tab');

  const tabsWrapper = document.createElement('div');
  tabsWrapper.className = 'tabs-wrapper';

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'content-wrapper';

  let tabCount = 0;

  // Only the direct children of the block are tab containers. Using a
  // recursive selector here would also pick up nested elements (e.g. from
  // inside a products table) as if they were separate tabs.
  block.querySelectorAll(':scope > div').forEach((tab) => {
    const tabTitle = tab.querySelector('h2, h3, strong')?.textContent.trim();
    // Products tabs carry their own dedicated navbar/content structure, so
    // the content image (e.g. from inside the products table) must never
    // be picked up as the tab/header icon. Normal tabs keep the existing
    // behavior unchanged.
    const tabImage = isProducts ? '' : (tab.querySelector('picture')?.outerHTML || '');
    const tabContent = tab.querySelector(':scope > div:last-child');

    if (tabTitle && tabContent) {
      tabCount++;

      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.innerHTML = `
        ${tabImage ? `<div class="tab-icon">${tabImage}</div>` : ''}
        <span class="tab-title">${tabTitle}</span>
      `;
      tabButton.setAttribute('data-tab', `tab${tabCount}`);
      if (tabCount === 1) tabButton.classList.add('active');

      const contentDiv = document.createElement('div');
      contentDiv.className = 'tab-content';
      contentDiv.setAttribute('data-tab-content', `tab${tabCount}`);
      contentDiv.innerHTML = tabContent.innerHTML;

      decorateButtons(contentDiv);

      if (isProducts) {
        // Products tables are product data, not code/sub-tab data:
        // they get their own dedicated decoration path and must never
        // reach handleCode() or createSubTabs().
        contentDiv.querySelectorAll('table').forEach((table) => {
          const productContent = createProductContent(table);
          contentDiv.appendChild(productContent);
        });
      } else {
        handleCode(contentDiv);

        contentDiv.querySelectorAll('table').forEach((table) => {
          const { subTabsWrapper, subContentWrapper } = createSubTabs(table);
          contentDiv.appendChild(subTabsWrapper);
          contentDiv.appendChild(subContentWrapper);
        });
      }

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
