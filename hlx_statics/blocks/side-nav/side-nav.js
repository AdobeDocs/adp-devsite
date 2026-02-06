import {
  createTag,
  getClosestFranklinSubfolder,
  isTopLevelNav,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSideNavHtml,
  fetchTopNavHtml,
  fetchTopButtonsNavHtml,
  IS_DEV_DOCS
} from "../../scripts/lib-helix.js";
import { loadFragment } from '../fragment/fragment.js';

/**
 * Helper function to create a navigation section with a label
 */
function createNavSection(className, labelText) {
  const section = createTag("div", { class: className });
  const label = createTag("h2", { class: "side-nav-section-label" });
  label.textContent = labelText;
  section.appendChild(label);
  return section;
}

/**
 * Decorates the side-nav
 * @param {Element} block The site-nav block element
 */
export default async function decorate(block) {
  // Hide side nav during processing to avoid visible updates
  const sideNavContainer = document.querySelector(".side-nav-container");
  if (sideNavContainer) {
    sideNavContainer.style.visibility = "hidden";
  }

  const navigationLinks = createTag("nav", { role: "navigation" });
  navigationLinks.setAttribute("aria-label", "Primary");

  const navigationLinksContainer = createTag("div");
  navigationLinks.append(navigationLinksContainer);

  // Create main menu section (needed for all templates)
  const mainMenuSection = createNavSection("side-nav-menu-section", "Global Navigation");
  navigationLinksContainer.append(mainMenuSection);

  // Create navigation links UL that will be used in both cases
  const navigationLinksUl = createTag("ul", {
    role: "tree",
    class: "spectrum-SideNav spectrum-SideNav--multiLevel",
  });
  navigationLinksUl.setAttribute("aria-label", "Table of contents");

  if(IS_DEV_DOCS) {
    // Create subpages section (only for documentation template)
    const subPagesSection = createNavSection("side-nav-subpages-section", "Table of Contents");
    navigationLinksContainer.append(subPagesSection);
    subPagesSection.append(navigationLinksUl);
  }
  const rightIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
    <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
    <path class="fill" d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
  </svg>`;

  const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
    <rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" />
    <path class="fill" d="M4,7.01a1,1,0,0,1,1.7055-.7055l3.289,3.286,3.289-3.286a1,1,0,0,1,1.437,1.3865l-.0245.0245L9.7,11.7075a1,1,0,0,1-1.4125,0L4.293,7.716A.9945.9945,0,0,1,4,7.01Z" />
  </svg>`;

  // Create menu list
  let menuUl = createTag("ul", {
    role: "tree",
    class: "spectrum-SideNav spectrum-SideNav--multiLevel main-menu",
  });

  function processNestedNavigation(menuUl) {
    menuUl.querySelectorAll('li').forEach((li) => {
      const nestedUl = li.querySelector('ul');
      if (nestedUl) {
        // Get the text node or link that precedes the nested ul
        const label = li.childNodes[0];
        const text = label.nodeType === Node.TEXT_NODE ? label.textContent.trim() : label.textContent;

        // Create the expandable link
        const expandableLink = createTag('button', {
          class: 'spectrum-SideNav-itemLink',
          type: 'button',
          'aria-expanded': 'false'
        });
        expandableLink.innerHTML = text;

        // Replace the text/link with the expandable link
        li.removeChild(label);
        li.insertBefore(expandableLink, nestedUl);

        // Set up proper nesting structure
        li.setAttribute('role', 'treeitem');
        li.classList.add('header');
        nestedUl.setAttribute('role', 'group');
        nestedUl.classList.add('spectrum-SideNav');
        nestedUl.style.display = 'none';

        // Process nested links
        nestedUl.querySelectorAll('li').forEach(nestedLi => {
          const nestedLink = nestedLi.querySelector('a');
          if (nestedLink) {
            nestedLink.style.fontWeight = '400';
            const linkText = nestedLink.textContent.trim();
            const description = nestedLi.textContent.replace(linkText, '').trim();
            Array.from(nestedLi.childNodes).forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                node.remove();
              }
            });
            if (!nestedLi.querySelector('ul')) {
              nestedLi.classList.add('no-chevron');
              if (description) {
                const descSpan = createTag('span', { class: 'nav-dropdown-description' });
                descSpan.textContent = description;
                nestedLi.appendChild(descSpan);
              }
            }
          }
        });

        // Add click handler
        expandableLink.onclick = (e) => {
          e.preventDefault();
          const isExpanded = li.getAttribute('aria-expanded') === 'true';
          const newState = !isExpanded;

          li.setAttribute('aria-expanded', newState);
          li.classList.toggle('is-expanded', newState);
          nestedUl.style.display = newState ? 'block' : 'none';
          updateIcon(expandableLink, newState, true);
        };

        // Initialize icon
        updateIcon(expandableLink, false, true);
      } else {
        // For non-expandable items, ensure they don't get chevrons
        li.classList.add('no-chevron');
      }
    });
  }


  // Add Products link first
  const productLi = createTag('li');
  productLi.innerHTML = '<a href="https://developer.adobe.com/apis">Products</a>';
  menuUl.append(productLi);

  if(IS_DEV_DOCS) {
    const topNavHtml = await fetchTopNavHtml();
    if (topNavHtml) {
      menuUl.innerHTML += topNavHtml;
      processNestedNavigation(menuUl);
    }
  } else {
    const navPath = getClosestFranklinSubfolder(window.location.origin,'nav');
    let fragment = await loadFragment(navPath);
    if (!fragment) {
      // load the default nav in franklin_assets folder nav
      fragment = await loadFragment(getClosestFranklinSubfolder(window.location.origin, 'nav', true));
    }
    const ul = fragment.querySelector("ul");
    ul.classList.add("menu");
    ul.setAttribute("id", "navigation-links");
    const firstLi = fragment.querySelector("li");
    if (firstLi) {
      if (isTopLevelNav(window.location.pathname)) {
        ul.querySelector('li:first-child').className = 'navigation-home';
      } else {
        firstLi.classList.add("navigation-products");
      }
    }
    menuUl.innerHTML = ul.innerHTML;
    processNestedNavigation(menuUl);
  }

  // Add dynamic buttons from config, or fall back to console button
  let topButtonsNavHtml = null;
  if (IS_DEV_DOCS) {
    try {
      topButtonsNavHtml = await fetchTopButtonsNavHtml();
    } catch (e) {
      // No buttons config found, will fallback to console button
    }
  }

  // Parse buttons from config or use default console button
  const buttons = [];
  if (topButtonsNavHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = topButtonsNavHtml;
    tempDiv.querySelectorAll('li a').forEach((link) => {
      buttons.push({ href: link.getAttribute('href'), title: link.getAttribute('title') || link.textContent });
    });
  }
  if (!buttons.length) {
    buttons.push({ href: 'https://developer.adobe.com/console/', title: 'Console' });
  }

  buttons.forEach(({ href, title }, index) => {
    const style = index === 0 && buttons.length > 1 ? 'accent' : 'secondary';
    const buttonLi = createTag("li", { class: "spectrum-SideNav-item" });
    buttonLi.innerHTML = `<div class="nav-buttons-container">
      <a href="${href}" class="spectrum-Button spectrum-Button--outline spectrum-Button--${style} spectrum-Button--sizeM">
        <span class="spectrum-Button-label">${title}</span>
      </a>
    </div>`;
    menuUl.appendChild(buttonLi);
  });

  mainMenuSection.append(menuUl);

  // Fetch and populate subpages
  if (IS_DEV_DOCS) {
    const sideNavHtml = await fetchSideNavHtml();
    if (sideNavHtml) {
      navigationLinksUl.innerHTML = sideNavHtml;
    }
  }
  block.append(navigationLinks);

  // Add spectrum classes to navigation items (exclude button anchors)
  block.querySelectorAll("li").forEach((li) => li.classList.add("spectrum-SideNav-item"));
  block.querySelectorAll("a:not(.spectrum-Button)").forEach((a) => a.classList.add("spectrum-SideNav-itemLink"));

  function assignLayerNumbers(ul, layer = 1) {
    const listItems = ul.children;

    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];

      const getAnchorTag = li.querySelector("a");
      const childUl = li.querySelector("ul");

      // Check if this item contains "header"
      const directText = Array.from(li.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join('');
      const isHeaderLabel = directText.includes('header');

      if (layer === 1 && childUl) {
        li.classList.add("header");
      }

      li.setAttribute("role", "treeitem");
      li.setAttribute("aria-level", layer);

      const currentUrl = window.location.href.split('#')[0];

      // Handle header labels (items with "header")
      if (isHeaderLabel) {
        // Convert to non-clickable span
        const textContent = getAnchorTag
          ? getAnchorTag.textContent.replace('header', '').trim()
          : li.textContent.replace('header', '').trim();

        const label = document.createElement('h2');
        label.className = 'spectrum-SideNav-itemLink';
        label.textContent = textContent;
        label.style.paddingLeft = `calc(${layer} * 12px)`;

        const childUl = li.querySelector('ul');
        li.textContent = '';
        li.appendChild(label);
        li.classList.add('nav-header-label');
        if (childUl){
          if (!li.contains(childUl)){
            li.appendChild(childUl);
          }
          childUl.setAttribute("role", "group");
          childUl.classList.add("spectrum-SideNav");
          assignLayerNumbers(childUl, layer + 1);
        }


      } else if (getAnchorTag) {
        // Normal anchor behavior (existing code unchanged)
        getAnchorTag.style.paddingLeft = `calc(${layer} * 12px)`;

        getAnchorTag.onclick = (e) => {
          e.preventDefault();
          const isExpanded = li.getAttribute("aria-expanded") === "true";

          // Toggle expanded state if it has children
          if (childUl) {
            toggleNavItem(li, !isExpanded, childUl, getAnchorTag);
          }

          // Handle navigation and selection
          if (currentUrl === getAnchorTag.href) {
            getAnchorTag.setAttribute("aria-current", "page");
            document.querySelectorAll('.is-selected').forEach(el => {
              el.classList.remove('is-selected');
            });
            li.classList.add("is-selected");
            toggleParent(li, true);
          } else if (!childUl || !isExpanded) {
            // Only navigate if it has no children or we're opening it
            window.location.href = getAnchorTag.href;
          }
        };

        if (currentUrl === getAnchorTag.href) {
          li.setAttribute("aria-expanded", true);
          getAnchorTag.setAttribute("aria-current", "page");
          // Check to make sure only the child is selected and not the parent
          const header = li.parentElement.closest("li");
          header?.classList.remove("is-selected");
          li.classList.add("is-expanded", "is-selected");
          toggleParent(li, true);
        } else {
          updateState(li, childUl);
        }

        if (childUl) {
          childUl.setAttribute("role", "group");
          childUl.classList.add("spectrum-SideNav");
          assignLayerNumbers(childUl, layer + 1);
          updateIcon(getAnchorTag, li.classList.contains("is-expanded"), true);
        }
      }
    }
  }

  // Session storage helpers for tracking opened toggleParent elements
  function getOpenedPaths() {
    const stored = sessionStorage.getItem('sideNavOpenedPaths');
    return stored ? JSON.parse(stored) : [];
  }

  function updateOpenedPath(pathname, shouldAdd) {
    const paths = getOpenedPaths();
    const newPaths = shouldAdd
      ? (paths.includes(pathname) ? paths : [...paths, pathname])
      : paths.filter(path => path !== pathname);
    sessionStorage.setItem('sideNavOpenedPaths', JSON.stringify(newPaths));
  }

  // Unified function to toggle navigation item state
  function toggleNavItem(li, isExpanded, childUl, anchorTag) {
    li.setAttribute("aria-expanded", isExpanded);
    li.classList.toggle("is-expanded", isExpanded);

    if (childUl) {
      childUl.style.display = isExpanded ? "block" : "none";
      updateIcon(anchorTag, isExpanded, true);

      // Update session storage
      if (anchorTag?.href) {
        //const pathname = new URL(anchorTag.href).pathname;
        const pathname = anchorTag.getAttribute("href");
        updateOpenedPath(pathname, isExpanded);
      }
    }
  }

  function toggleParent(li, isExpanded) {
    let parentLi = li.parentElement.closest("li");

    while (parentLi) {
      const parentAnchor = parentLi.querySelector("a");
      const parentUl = parentLi.querySelector("ul");

      toggleNavItem(parentLi, isExpanded, parentUl, parentAnchor);
      parentLi = parentLi.parentElement.closest("li");
    }
  }

  function updateState(li, childUl) {
    const shouldExpand = childUl?.querySelector(".is-expanded");
    const anchorTag = li.querySelector("a");

    if (shouldExpand) {
      toggleNavItem(li, true, childUl, anchorTag);
    } else {
      li.setAttribute("aria-expanded", false);
      anchorTag?.removeAttribute("aria-current");
      li.classList.remove("is-expanded", "is-selected");
      if (childUl) childUl.style.display = "none";
    }
  }

  function updateIcon(anchorTag, isExpanded, hasChildren) {
    const existingIcon = anchorTag.querySelector("svg");
    if (existingIcon) {
      existingIcon.remove();
    }

    if (hasChildren) {
      const icon = isExpanded ? downIcon : rightIcon;
      anchorTag.insertAdjacentHTML('beforeend', icon);
    }
  }

  assignLayerNumbers(navigationLinksUl);

  // Restore opened state from session storage
  function restoreOpenedState() {
    const openedPaths = getOpenedPaths();

    openedPaths.forEach(pathname => {
      // Find ALL anchors with this href (multiple items can have the same href)
      const anchors = Array.from(navigationLinksUl.querySelectorAll("a"))
        .filter(a => a.href && a.getAttribute("href") === pathname);

      // Expand all matching items
      anchors.forEach(anchor => {
        const li = anchor.closest("li");
        const childUl = li?.querySelector("ul");
        if (li && childUl) {
          toggleNavItem(li, true, childUl, anchor);
        }
      });
    });
  }

  restoreOpenedState();

  const sideNav = document.querySelector(".side-nav>nav>div");
  sideNav.addEventListener('scroll', () => {
    sessionStorage.setItem('sidenavScrollPos', sideNav.scrollTop);
  });

  // Store scroll restoration function for later use
  const savedPos = sessionStorage.getItem('sidenavScrollPos');
  if (savedPos !== null) {
    window.restoreSideNavScroll = () => {
      sideNav.scrollTop = parseInt(savedPos, 10);
    };
  }
}
