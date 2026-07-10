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
      // icon.innerHTML = `
      //   <svg
      //     xmlns="http://www.w3.org/2000/svg"
      //     width="22"
      //     height="22"
      //     viewBox="0 0 34 34"
      //     fill="none"
      //   >
      //     <path
      //       d="M8 5L16 12L8 19"
      //       stroke="currentColor"
      //       stroke-width="3"
      //       stroke-linecap="round"
      //       stroke-linejoin="round"
      //     />
      //   </svg>
      // `;

      icon.innerHTML = `
      <svg aria-hidden="true" role="img" class="spectrum-Menu-itemIcon spectrum-Icon spectrum-UIIcon-ChevronDown100"><path d="M4.5 13.25a1.094 1.094 0 01-.773-1.868L8.109 7 3.727 2.618A1.094 1.094 0 015.273 1.07l5.157 5.156a1.094 1.094 0 010 1.546L5.273 12.93a1.091 1.091 0 01-.773.321z" class="spectrum-UIIcon--large"></path><path d="M3 9.95a.875.875 0 01-.615-1.498L5.88 5 2.385 1.547A.875.875 0 013.615.302L7.74 4.377a.876.876 0 010 1.246L3.615 9.698A.872.872 0 013 9.95z" class="spectrum-UIIcon--medium"></path></svg>
      `

      const title = document.createElement('span');
      title.className = 'sidebar-accordion-title';

      const picture = titleEl.querySelector('picture');
      if (picture) {
        title.append(picture.cloneNode(true));
        currentAccordion.classList.add('has-header-image');
      }

      const text = document.createElement('span');
      text.classList.add('spectrum-Heading', 'spectrum-Heading--sizeM');
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