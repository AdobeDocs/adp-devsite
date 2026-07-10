export default async function decorate(block) {
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
      header.textContent = titleEl.textContent.trim();

      currentList = document.createElement('ul');
      currentList.className = 'sidebar-accordion-list';

      currentAccordion.append(header, currentList);
      sidebar.append(currentAccordion);

      header.addEventListener('click', () => {
        currentAccordion.classList.toggle('open');
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
