import { decorateLightOrDark } from '../../scripts/lib-helix.js';

const ALLOWED_BACKGROUND_COLORS = [
  'background-color-white',
  'background-color-navy',
  'background-color-dark-gray',
  'background-color-gray',
];

function applyBackgroundColor(block) {
  const backgroundColor = block.getAttribute('data-backgroundcolor');

  if (ALLOWED_BACKGROUND_COLORS.includes(backgroundColor)) {
    block.className = block.className.split(/\s+/).filter((c) => !c.startsWith('background-color-')).join(' ').trim();
    block.classList.add(backgroundColor);
  }
  if (!ALLOWED_BACKGROUND_COLORS.some((color) => block.classList.contains(color))) {
    block.classList.add('background-color-gray');
  }

  const bgClass = [...block.classList].find((c) => c.startsWith('background-color-'));
  const blockWrapper = block.parentElement;
  if (bgClass && blockWrapper?.classList.contains('expandable-sidebar-menu-wrapper')) {
    blockWrapper.classList.add(bgClass);
  }
}

export default async function decorate(block) {
  applyBackgroundColor(block);
  decorateLightOrDark(block);

  const rows = [...block.children];
  const wrapper = document.createElement('div');
  wrapper.className = 'expandable-sidebar-wrapper';

  const sidebar = document.createElement('div');
  sidebar.className = 'expandable-sidebar';

  const contentArea = document.createElement('div');
  contentArea.className = 'expandable-content';

  let currentAccordion;
  let currentList;
  let firstContent = true;

  rows.forEach((row) => {
    const cols = [...row.children];

    const titleEl = cols[0];
    const hasParent = titleEl.querySelector('strong');

    if (hasParent) {
      currentAccordion = document.createElement('div');
      currentAccordion.className = 'sidebar-accordion';

      const header = document.createElement('button');
      header.className = 'sidebar-accordion-header';

      const icon = document.createElement('span');
      icon.className = 'sidebar-accordion-icon';
      icon.innerHTML = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 34 34"
          fill="none"
        >
          <path
            d="M8 5L16 12L8 19"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `;

      const title = document.createElement('span');
      title.className = 'sidebar-accordion-title';

      const picture = titleEl.querySelector('picture');
      if (picture) {
        title.append(picture.cloneNode(true));
      }

      const text = document.createElement('span');
      text.textContent = titleEl.textContent.trim();
      title.append(text);

      header.append(icon, title);

      currentList = document.createElement('ul');
      currentList.className = 'sidebar-accordion-list';

      currentAccordion.append(header, currentList);
      sidebar.append(currentAccordion);

      const accordion = currentAccordion;

      header.addEventListener('click', () => {
        const isOpen = accordion.classList.contains('open');

        // close all accordions
        sidebar.querySelectorAll('.sidebar-accordion').forEach((item) => {
          item.classList.remove('open');
        });

        if (!isOpen) {
          accordion.classList.add('open');

          // Automatically select first child
          const firstItem = accordion.querySelector(
            '.sidebar-accordion-list li'
          );

          if (firstItem) {
            firstItem.click();
          }
        }
      });
    }

    if (!currentList) {
      return;
    }

    const childTitle = hasParent ? cols[1] : cols[0];
    const childContent = hasParent ? cols[2] : cols[1];

    if (!childTitle || !childContent) {
      return;
    }

    const item = document.createElement('li');
    item.className = 'sidebar-accordion-list-item';
    item.textContent = childTitle.textContent.trim();
    currentList.append(item);

    const panel = document.createElement('div');
    panel.className = 'expandable-panel';
    panel.append(childContent);

    contentArea.append(panel);

    item.addEventListener('click', () => {
      sidebar.querySelectorAll('.sidebar-accordion-list-item').forEach((li) => {
        li.classList.remove('active');
      });

      contentArea
        .querySelectorAll('.expandable-panel')
        .forEach((el) => {
          el.classList.remove('active');
        });

      item.classList.add('active');
      panel.classList.add('active');

      const parentAccordion = item.closest('.sidebar-accordion');
      if (parentAccordion) {
        sidebar.querySelectorAll('.sidebar-accordion').forEach((acc) => {
          acc.classList.remove('open');
        });

        parentAccordion.classList.add('open');
      }
    });

    // Initial state
    if (firstContent) {
      item.classList.add('active');
      panel.classList.add('active');
      currentAccordion.classList.add('open');
      firstContent = false;
    }
  });

  wrapper.append(sidebar, contentArea);

  block.innerHTML = '';
  block.append(wrapper);
  block.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
    h.style.whiteSpace = "normal";
  });
  block.querySelectorAll('h1').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeL', 'expandable-sidebar-menu-heading');
  });
  block.querySelectorAll('h2').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeM', 'expandable-sidebar-menu-heading');
  });
  block.querySelectorAll('h3, h4, h5, h6').forEach((h) => {
    h.classList.add('spectrum-Heading', 'spectrum-Heading--sizeS', 'expandable-sidebar-menu-heading');
  });
  block.querySelectorAll('p').forEach((p) => {
    p.classList.add('spectrum-Body', 'spectrum-Body--sizeM', 'expandable-sidebar-menu-body');
  });
  block.querySelectorAll('ul, ol').forEach((unorder) => {
    unorder.classList.add('spectrum-Body', 'spectrum-Body--sizeS');
  });
  block.querySelectorAll('li').forEach((li) => {
    li.classList.add('spectrum-Body', 'spectrum-Body--sizeM');
  });

  applyBackgroundColor(block);
}