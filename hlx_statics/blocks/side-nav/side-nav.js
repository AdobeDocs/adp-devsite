import {
  createTag,
  getClosestFranklinSubfolder,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSideNavHtml,
  fetchTopNavHtml,
  getMetadata,
  readBlockConfig,
} from "../../scripts/lib-helix.js";
import { loadFragment } from '../fragment/fragment.js';

function isDocumentationTemplate() {
  return getMetadata("template") === "documentation";
}

function isSourceGithub() {
  return getMetadata('source') === 'github';
}

function isMobileView() {
  return window.innerWidth <= 768;
}

/**
 * Decorates the side-nav
 * @param {Element} block The site-nav block element
 */
export default async function decorate(block) {
  // Handle visibility of side nav container based on template and screen size
  const sideNavContainer = block.closest('.side-nav-container');
  if (!isDocumentationTemplate() && sideNavContainer) {
    // For non-documentation pages, only show on mobiles
    const updateVisibility = () => {
      sideNavContainer.style.display = isMobileView() ? 'block' : 'none';
    };
    
    // Initial visibility
    updateVisibility();
    
    // Update visibility on resize
    window.addEventListener('resize', updateVisibility);
  }

  const navigationLinks = createTag("nav", { role: "navigation" });
  navigationLinks.setAttribute("aria-label", "Primary");

  const navigationLinksContainer = createTag("div");
  navigationLinks.append(navigationLinksContainer);

  // Create main menu section (needed for all templates)
  const mainMenuSection = createTag("div", { class: "side-nav-menu-section" });
  const mainMenuLabel = createTag("h2", { class: "side-nav-section-label" });
  mainMenuLabel.textContent = "Global Navigation";
  mainMenuSection.appendChild(mainMenuLabel);
  navigationLinksContainer.append(mainMenuSection);

  // Create navigation links UL that will be used in both cases
  const navigationLinksUl = createTag("ul", {
    role: "tree",
    class: "spectrum-SideNav spectrum-SideNav--multiLevel",
  });
  navigationLinksUl.setAttribute("aria-label", "Table of contents");

  if (isSourceGithub()) {
    // Create subpages section (only for documentation template)
    const subPagesSection = createTag("div", {
      class: "side-nav-subpages-section",
    });
    const subPagesLabel = createTag("h2", { class: "side-nav-section-label" });
    subPagesLabel.textContent = "Table of Contents";
    subPagesSection.appendChild(subPagesLabel);
    
    navigationLinksContainer.append(subPagesSection);
    subPagesSection.append(navigationLinksUl);

    // Set grid layout based on screen size
    const main = document.querySelector("main");
    if (main) {
      const mainContent = document.querySelector("main > div:nth-child(2)");

      if (mainContent) {
        mainContent.style.margin = "0 64px";
        mainContent.style.maxWidth = "1280px";
      }

      if (window.innerWidth <= 768) {
        main.style.gridTemplateColumns = "0 100vw";
      } else {
        main.style.gridTemplateColumns = "256px auto";
      }

      // Update grid on window resize
      window.addEventListener("resize", () => {
        if (window.innerWidth <= 768) {
          main.style.gridTemplateColumns = "0 100vw";
        } else {
          main.style.gridTemplateColumns = "256px auto";
        }
      });
    }
  } else {
    // For non-documentation templates, just append the UL to the main menu section
    mainMenuSection.append(navigationLinksUl);
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
  const menuUl = createTag("ul", {
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
        if (label.nodeType === Node.TEXT_NODE) {
          li.removeChild(label);
        } else {
          li.removeChild(label);
        }
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
            if (!nestedLi.querySelector('ul')) {
              nestedLink.innerHTML = nestedLink.textContent.trim();
              nestedLi.classList.add('no-chevron');
            }
          }
        });
        
        // Add click handler
        expandableLink.onclick = (e) => {
          e.preventDefault();
          const isExpanded = li.getAttribute('aria-expanded') === 'true';
          
          li.setAttribute('aria-expanded', !isExpanded);
          li.classList.toggle('is-expanded', !isExpanded);
          nestedUl.style.display = isExpanded ? 'none' : 'block';
          
          updateIcon(expandableLink, !isExpanded, true);
        };
        
        // Initialize icon
        updateIcon(expandableLink, false, true);
      } else {
        // For non-expandable items, ensure they don't get chevrons
        li.classList.add('no-chevron');
      }
    });
  }


  if (isSourceGithub()) {
    // Fetch and populate main menu for documentation template
    // Add Products link first
    const productLi = createTag('li');
    const productA = createTag('a', {href: 'https://developer.adobe.com/apis'});
    productA.innerHTML = 'Products';
    productLi.append(productA);
    menuUl.append(productLi);

    const topNavHtml = await fetchTopNavHtml();
    if (topNavHtml) {
      menuUl.innerHTML += topNavHtml;
      processNestedNavigation(menuUl);
    }
  } else {
    // Handle regular pages
    const cfg = readBlockConfig(block);
    let fragment;
    
    if (getMetadata('source') === 'github') {
      const topNavHtml = await fetchTopNavHtml();
      if (topNavHtml) {
        menuUl.innerHTML = topNavHtml;
        processNestedNavigation(menuUl);
      }
    } else {
      const navPath = cfg.nav || getClosestFranklinSubfolder(window.location.origin, 'nav');
      fragment = await loadFragment(navPath);
      if (fragment == null) {
        // load the default nav in franklin_assets folder nav
        fragment = await loadFragment(getClosestFranklinSubfolder(window.location.origin, 'nav', true));
      }

      if (fragment) {
        // Clone and process the fragment's content
        const fragmentUl = fragment.querySelector("ul");
        if (fragmentUl) {
          menuUl.innerHTML = fragmentUl.innerHTML;
          processNestedNavigation(menuUl);

          // Apply the same layer numbering and styling as table of contents
          const originalUpdateIcon = updateIcon;
          updateIcon = (anchorTag, isExpanded, hasChildren) => {
            const li = anchorTag.closest('li');
            if (!li.classList.contains('no-chevron')) {
              originalUpdateIcon(anchorTag, isExpanded, hasChildren);
            }
          };
          assignLayerNumbers(menuUl);
          updateIcon = originalUpdateIcon;
        }
      }
    }
  }

  // Add console button
  const consoleButtonLi = createTag("li", {
    class: "spectrum-SideNav-item",
  });
  const consoleButtonDiv = createTag("div", {
    class: "nav-console-button",
  });
  const consoleButton = createTag("a", {
    href: "https://developer.adobe.com/console/",
    class:
      "spectrum-Button spectrum-Button--outline spectrum-Button--secondary spectrum-Button--sizeM",
  });
  const buttonLabel = createTag("span", { class: "spectrum-Button-label" });
  buttonLabel.textContent = "Console";
  consoleButton.appendChild(buttonLabel);
  consoleButtonDiv.appendChild(consoleButton);
  consoleButtonLi.appendChild(consoleButtonDiv);
  menuUl.appendChild(consoleButtonLi);

  mainMenuSection.append(menuUl);

  if (isSourceGithub()) {
    // Fetch and populate subpages
    const sideNavHtml = await fetchSideNavHtml();
    if (sideNavHtml) {
      navigationLinksUl.innerHTML = sideNavHtml;
    }
  }

  block.append(navigationLinks);

  block.querySelectorAll("li").forEach((li) => {
    li.classList.add("spectrum-SideNav-item");
  });

  block.querySelectorAll("a").forEach((a) => {
    a.classList.add("spectrum-SideNav-itemLink");
  });

  function assignLayerNumbers(ul, layer = 1) {
    const listItems = ul.children;

    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];

      const getAnchorTag = li.querySelector("a");
      const childUl = li.querySelector("ul");

      if (layer === 1 && childUl) {
        li.classList.add("header");
      }

      li.setAttribute("role", "treeitem");
      li.setAttribute("aria-level", layer);

      if (getAnchorTag) {
        getAnchorTag.style.paddingLeft = `calc(${layer} * 12px)`;

        getAnchorTag.onclick = (e) => {
          e.preventDefault();
          const isExpanded = li.getAttribute("aria-expanded") === "true";

          li.setAttribute("aria-expanded", !isExpanded);
          li.classList.toggle("is-expanded", !isExpanded);
          if (childUl) {
            childUl.style.display = isExpanded ? "none" : "block";
          }

          updateIcon(getAnchorTag, !isExpanded, Boolean(childUl));

          if (window.location.href === getAnchorTag.href) {
            getAnchorTag.setAttribute("aria-current", "page");
            li.classList.add("is-selected");
            toggleParent(li, true);
          } else {
            window.location.href = getAnchorTag.href;
          }
        };

        if (window.location.href === getAnchorTag.href) {
          li.setAttribute("aria-expanded", true);
          getAnchorTag.setAttribute("aria-current", "page");
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

  function toggleParent(li, isExpanded) {
    let parentLi = li.parentElement.closest("li");
    while (parentLi) {
      parentLi.classList.toggle("is-expanded", isExpanded);
      parentLi.setAttribute("aria-expanded", isExpanded);
      const parentUl = parentLi.querySelector("ul");
      if (parentUl) {
        parentUl.style.display = isExpanded ? "block" : "none";
      }
      parentLi = parentLi.parentElement.closest("li");
    }
  }

  function updateState(li, childUl) {
    if (childUl && childUl.querySelector(".is-expanded")) {
      li.setAttribute("aria-expanded", true);
      li.classList.add("is-expanded");
      childUl.style.display = "block";
    } else {
      li.setAttribute("aria-expanded", false);
      li.querySelector("a").removeAttribute("aria-current");
      li.classList.remove("is-expanded", "is-selected");
      if (childUl) childUl.style.display = "none";
    }
  }

  function updateIcon(anchorTag, isExpanded, hasChildren) {
    if (hasChildren) {
      const icon = isExpanded ? downIcon : rightIcon;
      const existingIcon = anchorTag.querySelector("svg");

      if (existingIcon) {
        existingIcon.remove();
      }

      anchorTag.innerHTML += icon;
    } else {
      anchorTag.innerHTML = anchorTag.innerHTML
        .replace(rightIcon, "")
        .replace(downIcon, "");
    }
  }

  assignLayerNumbers(navigationLinksUl);
}
