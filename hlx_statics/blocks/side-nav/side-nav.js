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
  // Create container for side navigation
  const sideNavContainer = createTag('div', { class: 'side-nav-container' });
  
  const navigationLinks = createTag('nav', { role: 'navigation' });
  navigationLinks.setAttribute('aria-label', 'Primary');

  const navigationLinksContainer = createTag('div');
  navigationLinks.append(navigationLinksContainer);

  const isDocTemplate = getMetadata('template') === 'documentation';
  document.body.setAttribute('data-template', getMetadata('template'));

  // Create main menu section for all pages
  const mainMenuSection = createTag('div', { class: 'side-nav-menu-section' });
  const mainMenuLabel = createTag('h2', { class: 'side-nav-section-label' });
  mainMenuLabel.textContent = 'Global Navigation';
  mainMenuSection.appendChild(mainMenuLabel);

  // Only create subpages section for documentation template
  let subPagesSection;
  if (isDocTemplate) {
    subPagesSection = createTag('div', { class: 'side-nav-subpages-section' });
    const subPagesLabel = createTag('h2', { class: 'side-nav-section-label' });
    subPagesLabel.textContent = 'Table of Contents';
    subPagesSection.appendChild(subPagesLabel);
  }

  // Append sections based on template
  if (isDocTemplate) {
    navigationLinksContainer.append(mainMenuSection, subPagesSection);
  } else {
    navigationLinksContainer.append(mainMenuSection);
  }

  // Set grid layout only for documentation template
  const main = document.querySelector('main');
  if (main && isDocTemplate) {
    if (window.innerWidth <= 768) {
      main.style.gridTemplateColumns = '0 1fr';
    } else {
      main.style.gridTemplateColumns = '256px 1fr';
    }

    // Update grid on window resize only for documentation template
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        main.style.gridTemplateColumns = '0 1fr';
      } else {
        main.style.gridTemplateColumns = '256px 1fr';
      }
    });
  }

  // Fetch and populate main menu for all pages
  const sideNavHtml = await fetchSideNavHtml();
  
  if (sideNavHtml) {
    const menuUl = createTag('ul', { 
      role: 'tree', 
      class: 'spectrum-SideNav spectrum-SideNav--multiLevel main-menu' 
    });
    
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sideNavHtml;
    
    // Extract just the links from the nav content
    const links = tempDiv.querySelectorAll('.nav ul > li > a');
    links.forEach(link => {
      const li = createTag('li', { class: 'spectrum-SideNav-item' });
      const a = createTag('a', { 
        href: link.href,
        class: 'spectrum-SideNav-itemLink',
        'daa-ll': link.textContent.trim()
      });
      a.textContent = link.textContent;
      li.appendChild(a);
      menuUl.appendChild(li);
    });

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
  } else {
    console.error('Failed to fetch side navigation');
  }

  // Fetch and populate subpages only for documentation template
  if (isDocTemplate) {
    const sideNavHtml = await fetchSideNavHtml();
    
    if (sideNavHtml) {
      const subPagesUl = createTag('ul', { 
        role: 'tree', 
        class: 'spectrum-SideNav spectrum-SideNav--multiLevel sub-pages' 
      });
      subPagesUl.innerHTML = sideNavHtml;
      subPagesSection.append(subPagesUl);
    }
  }

  // Append the navigation to the block
  block.append(navigationLinks);
  
  // Append the block to the container
  sideNavContainer.appendChild(block);
  
  // Insert the container into the document
  if (main) {
    main.insertBefore(sideNavContainer, main.firstChild);
  }

  // Apply common styles to all navigation items
  block.querySelectorAll('li').forEach((li) => {
    li.classList.add('spectrum-SideNav-item');
  });

  block.querySelectorAll('a').forEach((a) => {
    a.classList.add('spectrum-SideNav-itemLink');
  });
}
