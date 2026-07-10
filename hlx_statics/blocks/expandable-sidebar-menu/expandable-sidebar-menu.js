export default async function decorate(block) {
  const rows = [...block.children];
  console.log("rows", rows);

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
          width="12"
          height="12"
          viewBox="0 0 24 24"
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

      const content = document.createElement('span');
      content.className = 'sidebar-accordion-title';

      const picture = titleEl.querySelector('picture');

      if (picture) {
        content.append(picture.cloneNode(true));
      }

      const text = document.createElement('span');
      text.textContent = titleEl.textContent.trim();

      content.append(text);

      header.append(icon, content);

      currentList = document.createElement('ul');
      currentList.className = 'sidebar-accordion-list';

      currentAccordion.append(header, currentList);
      sidebar.append(currentAccordion);

      const accordion = currentAccordion;

      header.addEventListener('click', () => {
        const isOpen = accordion.classList.contains('open');

        // Close all accordions
        sidebar.querySelectorAll('.sidebar-accordion').forEach((item) => {
          item.classList.remove('open');
        });

        // Open the clicked accordion if it was closed
        if (!isOpen) {
          accordion.classList.add('open');
        }
      });
    }


    // If no accordion exists yet, skip
    if (!currentList) {
      return;
    }

    // Determine child title and content
    const childTitle = hasParent ? cols[1] : cols[0];
    const childContent = hasParent ? cols[2] : cols[1];

    if (!childTitle || !childContent) {
      return;
    }

    const item = document.createElement('li');
    item.textContent = childTitle.textContent.trim();
    currentList.append(item);

    const panel = document.createElement('div');
    panel.className = 'expandable-panel';
    panel.append(childContent);

    if (firstContent) {
      item.classList.add('active');
      panel.classList.add('active');
      currentAccordion.classList.add('open');
      firstContent = false;
    }

    contentArea.append(panel);

    item.addEventListener('click', () => {
      sidebar.querySelectorAll('li').forEach((li) => {
        li.classList.remove('active');
      });

      contentArea.querySelectorAll('.expandable-panel').forEach((el) => {
        el.classList.remove('active');
      });

      item.classList.add('active');
      panel.classList.add('active');
    });
  });

  wrapper.append(sidebar, contentArea);

  block.innerHTML = '';
  block.append(wrapper);
}
