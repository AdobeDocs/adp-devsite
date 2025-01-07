import {
  createTag
} from '../../scripts/lib-adobeio.js';
import { fetchSideNavHtml, fetchTopNavHtml, getMetadata } from '../../scripts/lib-helix.js';

function isDocumentationTemplate() {
  return getMetadata('template') === 'documentation';
}

/**
 * Decorates the side-nav
 * @param {Element} block The site-nav block element
 */
export default async function decorate(block) {
  const navigationLinks = createTag('nav', { role: 'navigation' });
  navigationLinks.setAttribute('aria-label', 'Primary');

  const navigationLinksContainer = createTag('div');
  navigationLinks.append(navigationLinksContainer);

  // Create separate sections for main menu and subpages
  const mainMenuSection = createTag('div', { class: 'side-nav-menu-section' });
  const mainMenuLabel = createTag('h2', { class: 'side-nav-section-label' });
  mainMenuLabel.textContent = 'Global Navigation';
  mainMenuSection.appendChild(mainMenuLabel);

  const subPagesSection = createTag('div', { class: 'side-nav-subpages-section' });
  const subPagesLabel = createTag('h2', { class: 'side-nav-section-label' });
  subPagesLabel.textContent = 'Table of Contents';
  subPagesSection.appendChild(subPagesLabel);

  navigationLinksContainer.append(mainMenuSection, subPagesSection);

  // Set grid layout based on screen size
  const main = document.querySelector('main');
  if (main && isDocumentationTemplate()) {
    if (window.innerWidth <= 768) {
      main.style.gridTemplateColumns = '0 1fr';
    } else {
      main.style.gridTemplateColumns = '256px 1fr';
    }

    // Update grid on window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        main.style.gridTemplateColumns = '0 1fr';
      } else {
        main.style.gridTemplateColumns = '256px 1fr';
      }
    });
  }

  // Icons for expandable items
  const rightIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
    <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
    <path class="fill" d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
  </svg>`;

  const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
    <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
    <path class="fill" d="M4,7.01a1,1,0,0,1,1.7055-.7055l3.289,3.286,3.289-3.286a1,1,0,0,1,1.437,1.3865l-.0245.0245L9.7,11.7075a1,1,0,0,1-1.4125,0L4.293,7.716A.9945.9945,0,0,1,4,7.01Z" />
  </svg>`;

  // Fetch and populate main menu for documentation template
  if (isDocumentationTemplate()) {
    const topNavHtml = await fetchTopNavHtml();
    if (topNavHtml) {
      // Create menu list
      const menuUl = createTag('ul', { 
        role: 'tree', 
        class: 'spectrum-SideNav spectrum-SideNav--multiLevel main-menu' 
      });
      menuUl.innerHTML = topNavHtml;

      // Add console button
      const consoleButtonLi = createTag('li', { class: 'spectrum-SideNav-item' });
      const consoleButtonDiv = createTag('div', { class: 'nav-console-button' });
      const consoleButton = createTag('a', {
        href: 'https://developer.adobe.com/console/',
        class: 'spectrum-Button spectrum-Button--outline spectrum-Button--secondary spectrum-Button--sizeM'
      });
      const buttonLabel = createTag('span', { class: 'spectrum-Button-label' });
      buttonLabel.textContent = 'Console';
      consoleButton.appendChild(buttonLabel);
      consoleButtonDiv.appendChild(consoleButton);
      consoleButtonLi.appendChild(consoleButtonDiv);
      menuUl.appendChild(consoleButtonLi);

      mainMenuSection.append(menuUl);
    }
  }

  // Fetch and populate subpages
  const sideNavHtml = await fetchSideNavHtml();
  if (sideNavHtml) {
    const subPagesUl = createTag('ul', { 
      role: 'tree', 
      class: 'spectrum-SideNav spectrum-SideNav--multiLevel sub-pages' 
    });
    subPagesUl.innerHTML = sideNavHtml;
    subPagesSection.append(subPagesUl);
  }

  block.append(navigationLinks);

  // Apply common styles to all navigation items
  block.querySelectorAll('li').forEach((li) => {
    li.classList.add('spectrum-SideNav-item');
  });

  block.querySelectorAll('a').forEach((a) => {
    a.classList.add('spectrum-SideNav-itemLink');
  });

  function assignLayerNumbers(ul, layer = 1) {
    const listItems = ul.children;

    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];

      const getAnchorTag = li.querySelector('a');
      const childUl = li.querySelector('ul');

      if (layer === 1 && childUl) {
        li.classList.add('header');
      }

      li.setAttribute("role", "treeitem");
      li.setAttribute("aria-level", layer);

      if (getAnchorTag) {
        getAnchorTag.style.paddingLeft = `calc(${layer} * 12px)`;

        getAnchorTag.onclick = (e) => {
          e.preventDefault();
          const isExpanded = li.getAttribute('aria-expanded') === 'true';

          li.setAttribute('aria-expanded', !isExpanded);
          li.classList.toggle('is-expanded', !isExpanded);
          if (childUl) {
            childUl.style.display = isExpanded ? 'none' : 'block';
          }

          updateIcon(getAnchorTag, !isExpanded, Boolean(childUl));

          if (window.location.href === getAnchorTag.href) {
            getAnchorTag.setAttribute("aria-current", "page");
            li.classList.add('is-selected');
            toggleParent(li, true);
          } else {
            window.location.href = getAnchorTag.href;
          }
        };

        if (window.location.href === getAnchorTag.href) {
          li.setAttribute('aria-expanded', true);
          getAnchorTag.setAttribute("aria-current", "page");
          li.classList.add('is-expanded', 'is-selected');
          toggleParent(li, true);
        } else {
          updateState(li, childUl);
        }

        if (childUl) {
          childUl.setAttribute('role', 'group');
          childUl.classList.add('spectrum-SideNav');
          assignLayerNumbers(childUl, layer + 1);
          updateIcon(getAnchorTag, li.classList.contains('is-expanded'), true);
        }
      }
    }
  }

  function toggleParent(li, isExpanded) {
    let parentLi = li.parentElement.closest('li');
    while (parentLi) {
      parentLi.classList.toggle('is-expanded', isExpanded);
      parentLi.setAttribute('aria-expanded', isExpanded);
      const parentUl = parentLi.querySelector('ul');
      if (parentUl) {
        parentUl.style.display = isExpanded ? 'block' : 'none';
      }
      parentLi = parentLi.parentElement.closest('li');
    }
  }

  function updateState(li, childUl) {
    if (childUl && childUl.querySelector('.is-expanded')) {
      li.setAttribute('aria-expanded', true);
      li.classList.add('is-expanded');
      childUl.style.display = 'block';
    } else {
      li.setAttribute('aria-expanded', false);
      li.querySelector('a').removeAttribute("aria-current");
      li.classList.remove('is-expanded', 'is-selected');
      if (childUl) childUl.style.display = 'none';
    }
  }

  function updateIcon(anchorTag, isExpanded, hasChildren) {
    if (hasChildren) {
      const icon = isExpanded ? downIcon : rightIcon;
      const existingIcon = anchorTag.querySelector('svg');

      if (existingIcon) {
        existingIcon.remove();
      }

      anchorTag.innerHTML += icon;
    } else {
      anchorTag.innerHTML = anchorTag.innerHTML.replace(rightIcon, '').replace(downIcon, '');
    }
  }

  // Initialize layer numbers for both sections
  mainMenuSection.querySelectorAll('ul').forEach(ul => assignLayerNumbers(ul));
  subPagesSection.querySelectorAll('ul').forEach(ul => assignLayerNumbers(ul));
}
