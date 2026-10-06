import {
  createTag,
  isTopLevelNav,
  setExpectedOrigin,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSideNavHtml,
  fetchTopNavHtml,
  fetchTopButtonsNavHtml,
  loadNavFragment,
  IS_DEV_DOCS
} from "../../scripts/lib-helix.js";

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

  // Unique id generator for disclosure button -> panel aria-controls wiring
  let sideNavGroupId = 0;

  const navigationLinks = createTag("nav", { role: "navigation" });
  navigationLinks.setAttribute("aria-label", "Primary");
  navigationLinks.setAttribute("daa-lh", "side-nav");

  const navigationLinksContainer = createTag("div");
  navigationLinks.append(navigationLinksContainer);

  // Create main menu section (needed for all templates)
  const mainMenuSection = createNavSection("side-nav-menu-section", "Global Navigation");
  navigationLinksContainer.append(mainMenuSection);

  const navigationLinksUl = createTag("ul", {
    class: "spectrum-SideNav spectrum-SideNav--multiLevel",
  });
  navigationLinksUl.setAttribute("aria-label", "Table of contents");

  if(IS_DEV_DOCS) {
    // Create subpages section (only for documentation template) without visible heading text
    const subPagesSection = createTag("div", { class: "side-nav-subpages-section" });
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

  let menuUl = createTag("ul", {
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
        if (!nestedUl.id) {
          nestedUl.id = `side-nav-group-${sideNavGroupId++}`;
        }
        const expandableLink = createTag('button', {
          class: 'spectrum-SideNav-itemLink',
          type: 'button',
          'aria-expanded': 'false',
          'aria-controls': nestedUl.id,
        });
        expandableLink.innerHTML = text;

        // Replace the text/link with the expandable link
        li.removeChild(label);
        li.insertBefore(expandableLink, nestedUl);

        li.classList.add('header');
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
          const isExpanded = expandableLink.getAttribute('aria-expanded') === 'true';
          const newState = !isExpanded;

          expandableLink.setAttribute('aria-expanded', newState);
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
  productLi.innerHTML = `<a href="${setExpectedOrigin(window.location.origin, '/apis')}">Products</a>`;
  menuUl.append(productLi);

  if(IS_DEV_DOCS) {
    const topNavHtml = await fetchTopNavHtml();
    if (topNavHtml) {
      menuUl.innerHTML += topNavHtml;
      processNestedNavigation(menuUl);
    }
  } else {
    const fragment = await loadNavFragment();
    if (!fragment) return;
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
    buttons.push({ href: setExpectedOrigin(window.location.origin, '/console/'), title: 'Console' });
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
          childUl.classList.add("spectrum-SideNav");
          assignLayerNumbers(childUl, layer + 1);
        }


      } else if (getAnchorTag) {
        getAnchorTag.style.paddingLeft = `calc(${layer} * 12px)`;

        // Navigation only - expand/collapse is handled by a separate disclosure
        // button below, so a single control no longer both navigates AND
        // toggles
        getAnchorTag.onclick = (e) => {
          if (currentUrl === getAnchorTag.href) {
            e.preventDefault();
            getAnchorTag.setAttribute("aria-current", "page");
            document.querySelectorAll('.is-selected').forEach(el => {
              el.classList.remove('is-selected');
            });
            li.classList.add("is-selected");
            toggleParent(li, true);
          }
          // Otherwise let the link navigate normally.
        };

        if (currentUrl === getAnchorTag.href) {
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
          childUl.classList.add("spectrum-SideNav");
          assignLayerNumbers(childUl, layer + 1);

          const legacyIcon = getAnchorTag.querySelector('svg');
          if (legacyIcon) legacyIcon.remove();

          // Separate expand/collapse disclosure button (decoupled from the
          // navigation link) so expanding a section doesn't also navigate.
          // The li becomes a wrapping flex row so the button stays pinned
          // next to its own label instead of centering on the whole
          // (possibly expanded) subtree.
          if (!childUl.id) {
            childUl.id = `side-nav-group-${sideNavGroupId++}`;
          }
          const isExpanded = li.classList.contains("is-expanded");
          const toggleButton = createTag('button', {
            type: 'button',
            class: 'spectrum-SideNav-toggleButton',
            'aria-expanded': isExpanded ? 'true' : 'false',
            'aria-controls': childUl.id,
            'aria-label': `Toggle ${getAnchorTag.textContent.trim()}`,
          });
          toggleButton.onclick = (e) => {
            e.preventDefault();
            const expanded = li.classList.contains('is-expanded');
            toggleNavItem(li, !expanded, childUl, getAnchorTag);
          };
          li.classList.add('has-toggle-row');
          li.insertBefore(toggleButton, childUl);
          updateIcon(toggleButton, isExpanded, true);
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
    li.classList.toggle("is-expanded", isExpanded);

    if (childUl) {
      childUl.style.display = isExpanded ? "block" : "none";

      // Icon/aria-expanded live on the disclosure button (sibling of the
      // anchor), not the navigation link itself
      const toggleButton = li.querySelector(':scope > button.spectrum-SideNav-toggleButton');
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', isExpanded);
        updateIcon(toggleButton, isExpanded, true);
      }

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
