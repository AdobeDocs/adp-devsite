import {
  createTag,
  setActiveTab,
  focusRing,
  isLocalHostEnvironment,
  isTopLevelNav,
  setSearchFrameOrigin,
  getClosestFranklinSubfolder,
  setQueryStringParameter,
  getQueryString,
} from '../../scripts/lib-adobeio.js';
import { readBlockConfig, getMetadata, fetchTopNavHtml } from '../../scripts/lib-helix.js';
import { loadFragment } from '../fragment/fragment.js';

function isSourceGithub() {
  return getMetadata('source') === 'github';
}

function fetchSearchURLParams() {
  // Get URL search parameters
  const params = new URLSearchParams(window.location.search);
  const queryFromURL = params.get("query") || "";
  const productsFromURL = params.get("products");
  return {
    query: queryFromURL,
    products: productsFromURL
  };
}

function initSearch() {
  const { liteClient: algoliasearch } = window["algoliasearch/lite"];
  const { connectAutocomplete } = instantsearch.connectors;

  const searchClient = algoliasearch('E642SEDTHL', '424b546ba7ae75391585a10c6ea38dab');

  // Convert window.adp_search.index_to_product_map to an object
  const indexMap = Object.fromEntries(window.adp_search.index_to_product_map);

  // Extract indices and products from window object
  const indices = Object.keys(indexMap);
  const all_products = Array.from(new Set(Object.values(indexMap))); // Unique products

  const urlParams = fetchSearchURLParams();

  // from url params set selected products
  let selectedProducts = (urlParams.products === "all" || !urlParams.products) 
  ? all_products.slice() // Select all products when "all" is in the URL or no products (a new search)
  : urlParams.products.split(",").filter(product => all_products.includes(product));

  // Get indices corresponding to selected products
  let selectedIndices = indices.filter(indexName => selectedProducts.includes(indexMap[indexName]));
  let initialIndex = selectedIndices[0] || indices[0];

  // Initialize InstantSearch
  let search = instantsearch({
    indexName: initialIndex, // Use the first valid index
    searchClient,
    });
  
  search.start();

  let results = new Map();

  // Function to initialize or update the search
  function updateSearch() {
    console.log("update search")
    // Get indices corresponding to selected products
    const selectedIndices = indices.filter((indexName) => {
      const product = indexMap[indexName];
      return selectedProducts.includes(product);
    });

    // Add common widgets
    search.addWidgets([
      instantsearch.widgets.configure({
        hitsPerPage: 1,
        attributesToSnippet: ['content:50'],
      }),
    ]);

    function customSearchBox() {
      return {
        init({ helper }) {
          const searchInput = document.querySelector("#search-box input");
          const clearButton = document.querySelector("button.clear-button");
          const searchResults = document.querySelector("div.search-results");
          const queryFromURL = urlParams.query;

          //detects query in url but no query in input so tab was reloaded
          if (queryFromURL && !searchInput.value) {
            searchInput.value = queryFromURL;
            helper.setQuery(queryFromURL).search();
            searchResults.style.visibility = "visible";
          } 

          searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
              helper.setQuery(searchInput.value).search();
              searchResults.style.visibility = "visible";
            }
          });

          clearButton.addEventListener('click', () => {
            helper.setQuery('').search();
          });
        },
        render() {
        },
      };
    };  

    function renderMergedHits({ indices, widgetParams }) {
      // console.log("Current InstantSearch state on render merged hits:", search.helper.state);
        if (!indices || !Array.isArray(indices)) {
          console.error("indices is undefined or not an array", indices);
          return;
        }
        results = new Map();
      
        // Filter the hits first, then iterate through them with forEach
        indices.flatMap(({ hits }) => hits || [])
          .filter((hit) => selectedProducts.includes(hit.product)) // Check if the product is selected
          .forEach((hit) => {
            // Process each hit
            results.set(instantsearch.highlight({ hit, attribute: "title" }), {
              url: hit.url,
              product: hit.product,
              content: instantsearch.snippet({ hit, attribute: 'content' }),
            });
          });
          
        updateSearchParams();
        renderResults(); // Call to render the filtered results
    }
    
    const customMergedHits = connectAutocomplete(renderMergedHits);
    search.addWidgets([
      customSearchBox(),
      customMergedHits({
        container: document.querySelector(".merged-results")
      }),
    ]);

    // Add indices
    selectedIndices.slice(1).forEach((indexName) => {
      search.addWidgets([
        instantsearch.widgets.index({
          indexName: indexName,
        }),
      ]);
    });
   
    // Start the search
    search.refresh();
  }

  function updateSearchParams() {
    // Preserve existing URL parameters
    const params = new URLSearchParams(window.location.search);
  
    // Get the current search query from the input box
    const searchInput = document.querySelector("#search-box input");
    const query = searchInput ? searchInput.value : null;
  
    // Determine if all products are selected
    const allProductsSelected = selectedProducts.length === all_products.length;
  
    // Update the products parameter
    if (allProductsSelected) {
      params.set("products", "all");
    } else if (selectedProducts.length > 0) {
      params.set("products", selectedProducts.join(","));
    } else {
      params.delete("products");
    }
  
    // Update the query parameter
    if (query) {
      params.set("query", query);
    } else {
      params.delete("query");
    }
    // Prevent clearing existing URL parameters
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  }

  function renderProductCheckboxes() {
    const container = document.querySelector('.filters');
    container.innerHTML = ''; // Clear existing content
  
    // Check if all products are selected
    const allSelected = selectedProducts.length === all_products.length;
  
    // Add "All Products" checkbox
    const allProductsCheckbox = document.createElement('input');
    allProductsCheckbox.type = 'checkbox';
    allProductsCheckbox.id = 'checkbox-all-products';
    allProductsCheckbox.value = 'all-products';
    allProductsCheckbox.checked = allSelected; // Check if all products are selected
  
    const allProductsLabel = document.createElement('label');
    allProductsLabel.htmlFor = 'checkbox-all-products';
    allProductsLabel.innerText = 'All Products';
  
    container.appendChild(allProductsCheckbox);
    container.appendChild(allProductsLabel);
    container.appendChild(document.createElement('br'));
  
    // Add individual product checkboxes
    all_products.forEach((product) => {
      const checkboxId = `checkbox-${product.replace(/\s+/g, '-')}`;
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = checkboxId;
      checkbox.value = product;
      // don't check products if new tab or if all products are se
      checkbox.checked = selectedProducts.includes(product) && urlParams.products !== "all" && urlParams.products !== null;
  
      const label = document.createElement('label');
      label.htmlFor = checkboxId;
      label.innerText = product;
  
      container.appendChild(checkbox);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    });
  }
 
  function attachCheckboxEventListeners() {
    const allProductsCheckbox = document.getElementById('checkbox-all-products');
    const productCheckboxes = document.querySelectorAll('.filters input[type="checkbox"]:not(#checkbox-all-products)');
  
    // Event listener for "All Products" checkbox
    allProductsCheckbox.addEventListener('change', () => {
      if (allProductsCheckbox.checked) {
        selectedProducts = all_products.slice(); // Select all products
        productCheckboxes.forEach((cb) => (cb.checked = false)); // Ensure all products appear checked
      } else {
        selectedProducts = [];
        productCheckboxes.forEach((cb) => (cb.checked = false)); // Uncheck all products
      }
      updateSearchParams();
      updateSearch();
    });
    
    // Event listeners for individual product checkboxes
    productCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        allProductsCheckbox.checked = false; // Uncheck "All Products"
        selectedProducts = Array.from(productCheckboxes)
          .filter((cb) => cb.checked) // Get checked product checkboxes
          .map((cb) => cb.value);
  
        if (selectedProducts.length === 0) {
          // If no products selected, revert to "All Products"
          allProductsCheckbox.checked = true;
          selectedProducts = all_products.slice();
        }
        updateSearchParams();
        updateSearch(); // Update the search
      });
    });
  }
  
  function renderResults() {
    const container = document.querySelector(".merged-results");
    const allProductsCheckbox = document.getElementById("checkbox-all-products");
  
    container.innerHTML = ""; // Clear previous results
  
    // Determine which products to display
    const productsToShow = allProductsCheckbox.checked ? all_products : selectedProducts;
  
    // Group results by product
    const productGroupedResults = new Map();
    results.forEach((value, key) => {
      if (!productGroupedResults.has(value.product)) {
        productGroupedResults.set(value.product, []);
      }
      productGroupedResults.get(value.product).push({ key, value });
    });
  
    // Separate products into two groups: those with results and those without
    const productsWithResults = [];
    const productsWithoutResults = [];
  
    productsToShow.forEach((product) => {
      if (productGroupedResults.has(product)) {
        productsWithResults.push(product);
      } else {
        productsWithoutResults.push(product);
      }
    });
  
    // Sort: Products with results appear first
    const sortedProducts = [...productsWithResults, ...productsWithoutResults];
  
    // Render results for each product
    sortedProducts.forEach((product) => {
      const productDiv = document.createElement("div");
      productDiv.classList.add("product-group");
      productDiv.innerHTML = `<h2>${product}</h2>`;
  
      if (productGroupedResults.has(product)) {
        // If there are results, render them
        productGroupedResults.get(product).forEach(({ key, value }) => {
          productDiv.innerHTML += `
            <div class="result-item">
              <h1 class="spectrum-Body spectrum-Body--sizeM css-1i3xfjj">
                <a href="${value.url}">${key}</a>
              </h1>
              <a class="result-url spectrum-Link spectrum-Link--quiet spectrum-Link--secondary">${value.url}</a>        
              <p class="result-content spectrum-Body spectrum-Body--sizeS">${value.content}</p>  
            </div>
            <hr>
          `;
        });
      } else {
        // Even if no results, still display the product section
        productDiv.innerHTML += `<p>No results found for this product.</p>`;
      }
  
      container.appendChild(productDiv);
    });
  
    // Ensure that at least something appears, even if no results are found
    if (sortedProducts.length === 0) {
      container.innerHTML = "<p>No products selected.</p>";
    }
  }
  
  // Initialize the search and render checkboxes
  renderProductCheckboxes();
  attachCheckboxEventListeners();
  updateSearch();
}

function globalNavSearchButton() {
  const div = createTag('div', { class: 'nav-console-search-button' });
  div.innerHTML = `<button class="nav-dropdown-search" aria-label="search" class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--emphasized spectrum-ActionButton--quiet">
      <svg class="spectrum-Icon spectrum-Icon--sizeL" focusable="false" aria-hidden="true" aria-label="Edit">
        <use href="/hlx_statics/icons/search.svg#spectrum-icon-24-Search"></use>
      </svg>
    </button>
    <button class="close-search-button" aria-label="Close Search" class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--emphasized spectrum-ActionButton--quiet">
      <svg class="spectrum-Icon spectrum-Icon--sizeL" focusable="false" aria-hidden="true">
        <use href="/hlx_statics/icons/close.svg#close-icon"></use>
      </svg>
    </button>`;
  return div;
}

const globalNavSearchDropDown = () => {
  const searchDropDown = createTag('div', { class: 'nav-console-search-frame' });
  searchDropDown.innerHTML = `
    <div id="search-box" class="search-box">
      <form onsubmit="return false;">
        <div>
          <svg aria-hidden="true" role="img" viewBox="0 0 36 36" class="spectrum-Icon spectrum-Icon--sizeMd icon-left">
            <path d="M33.173 30.215L25.4 22.443a12.826 12.826 0 10-2.957 2.957l7.772 7.772a2.1 2.1 0 002.958-2.958zM6 15a9 9 0 119 9 9 9 0 01-9-9z"></path>
          </svg>
          <input id="search-input" type="text" placeholder="Search..." autocomplete="off" class="search-input">
          <button type="reset" aria-label="Clear Search" class="clear-button spectrum-ClearButton spectrum-Search-clearButton spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet">
            <svg aria-hidden="true" role="img" viewBox="0 0 36 36" class="icon-right spectrum-Icon spectrum-Icon--sizeM">
              <path d="M26.485 6.686L18 15.172 9.515 6.686a1 1 0 0 0-1.414 0L6.686 8.1a1 1 0 0 0 0 1.414L15.172 18l-8.486 8.485a1 1 0 0 0 0 1.414L8.1 29.314a1 1 0 0 0 1.414 0L18 20.828l8.485 8.486a1 1 0 0 0 1.414 0l1.415-1.414a1 1 0 0 0 0-1.414L20.828 18l8.486-8.485a1 1 0 0 0 0-1.414L27.9 6.686a1 1 0 0 0-1.415 0z"></path>
            </svg>
          </button>
        </div>
        
      </form>
    </div>

    <div class="search-results">
      <div class="search-refinement">
        <h4 class="spectrum-Heading spectrum-Heading--sizeXS css-ctmjql">Filter by Products</h4>
        <div class="filters"></div>
      </div>
      <div class="merged-results"></div>
    </div>
    `;

  return searchDropDown;
};

const setSearchFrameSource = () => {
  const src = isLocalHostEnvironment(window.location.host) ? setSearchFrameOrigin(window.location.host) : `${setSearchFrameOrigin(window.location.host, '/search-frame')}`;
  const queryString = getQueryString();
  return queryString && queryString.toString().length > 0
    ? `${src}?${queryString.toString()}`
    : src;
};

// const searchFrameOnLoad = (renderedFrame, counter = 0, loaded) => {
//   renderedFrame.contentWindow.postMessage(JSON.stringify({ localPathName: window.location.pathname }), '*');
//   if (window.search_path_name_check !== window.location.pathname) {
//     if (counter > 30) {
//       console.warn('Loading Search iFrame timed out');
//       return;
//     }
//     window.setTimeout(() => { searchFrameOnLoad(renderedFrame, counter + 1, loaded); }, 100);
//   }
//   if (!loaded) {
//     const queryString = getQueryString();
//     if (queryString.has('query')) {
//       const searchIframeContainer = document.querySelector('div.nav-console-search-frame');
//       if (searchIframeContainer.length > 0) {
//         searchIframeContainer.style.visibility = 'visible';
//       }
//     }
//   }
//   loaded = true; 
// };

// // Referenced https://stackoverflow.com/a/10444444/15028986
// const checkIframeLoaded = (renderedFrame) => {
//   // Get a handle to the iframe element
//   const iframeDoc = renderedFrame.contentDocument || renderedFrame.contentWindow.document;

//   // Check if loading is complete
//   if (iframeDoc.readyState === 'complete') {
//     renderedFrame.onload = () => {
//       searchFrameOnLoad(renderedFrame);
//     };
//     // The loading is complete, call the function we want executed once the iframe is loaded
//     return;
//   }
//   // If we are here, it is not loaded.
//   // Set things up so we check the status again in 100 milliseconds
//   window.setTimeout(checkIframeLoaded, 100);
// };

// Referenced https://stackoverflow.com/a/10444444/15028986
const checkIframeLoaded = (renderedFrame) => {
  // Get a handle to the iframe element
  const iframeDoc = renderedFrame.contentDocument || renderedFrame.contentWindow.document;

  // Check if loading is complete
  if (iframeDoc.readyState === 'complete') {
    renderedFrame.onload = () => {
      searchFrameOnLoad(renderedFrame);
    };
    // The loading is complete, call the function we want executed once the iframe is loaded
    return;
  }
  // If we are here, it is not loaded.
  // Set things up so we check the status again in 100 milliseconds
  window.setTimeout(checkIframeLoaded, 100);
}

function decorateSearchIframeContainer(header) {
  const search_div = header.querySelector('div.nav-console-search-frame');
  const search_button = header.querySelector('button.nav-dropdown-search');
  const search_results = document.querySelector("div.search-results");

  // const escape_search_button = header.querySelector('button.spectrum-ClearButton');
  const urlParams = fetchSearchURLParams();
  console.log(window.location.pathname);
  console.log(getClosestFranklinSubfolder(window.location.origin));
  if (urlParams.products) {
    console.log("products here")
    initSearch();
    search_div.style.visibility = 'visible';
    search_button.classList.add('is-open');
  }

  search_button.addEventListener('click', (evt) => {
    if (!evt.currentTarget.classList.contains('is-open')) {
      initSearch();
      search_div.style.visibility = 'visible';
      search_button.classList.add('is-open');
    } else {
      search_button.classList.remove('is-open');
      search_div.style.visibility = 'hidden';
      search_results.style.visibility = 'hidden';
    }
  });
}

function globalDistributeButton() {
  const div = createTag('div', { class: 'nav-console-distribute-button' });
  div.innerHTML = `<a href="/distribute" class="spectrum-Button spectrum-Button--cta spectrum-Button--fill spectrum-Button--accent spectrum-Button--sizeM">
    <span class="spectrum-Button-label">
      Distribute
    </span>
  </a>`;
  return div;
}

function globalConsoleButton() {
  const div = createTag('div', { class: 'nav-console-button' });
  div.innerHTML = `<a href="https://developer.adobe.com/console/" class="spectrum-Button spectrum-Button--outline spectrum-Button--secondary  spectrum-Button--sizeM">
    <span class="spectrum-Button-label">
      Console
    </span>
  </a>`;
  return div;
}

function globalMobileDistributeButton() {
  const div = createTag('div', { class: 'nav-mobile-distribute-button' });
  div.innerHTML = `<a href="/distribute" class="spectrum-Button spectrum-Button--cta spectrum-Button-fill  spectrum-Button--sizeM">
    <span class="spectrum-Button-label">
      Distribute
    </span>
  </a>`;
  return div;
}

function globalMobileConsoleButton() {
  const div = createTag('li', { class: 'nav-mobile-console-button' });
  div.innerHTML = `<a href="https://developer.adobe.com/console/" class="spectrum-Button spectrum-Button--secondary  spectrum-Button--sizeM">
    <span class="spectrum-Button-label">
      Console
    </span>
  </a>`;
  return div;
}

function globalSignIn() {
  const div = createTag('div', { class: 'nav-sign-in' });
  div.innerHTML = `<button class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet">
    <span id="signIn" class="spectrum-ActionButton-label">Sign in</span>
  </button>`;
  return div;
}

function globalNavLinkItemDropdown(id, name, links) {
  return `
      <button id="nav-dropdown-button_${id}" class="spectrum-Picker spectrum-Picker--sizeM spectrum-Picker--quiet navigation-dropdown" aria-haspopup="listbox">
        <span class="spectrum-Picker-label nav-label">
          ${name}
        </span>
        <svg aria-hidden="true" role="img" focusable="false" class="spectrum-Icon spectrum-UIIcon-ChevronDown100 spectrum-Picker-menuIcon dropdown-icon">
          <path d="M4.5 13.25a1.094 1.094 0 01-.773-1.868L8.109 7 3.727 2.618A1.094 1.094 0 015.273 1.07l5.157 5.156a1.094 1.094 0 010 1.546L5.273 12.93a1.091 1.091 0 01-.773.321z" class="spectrum-UIIcon--large"></path>
          <path d="M3 9.95a.875.875 0 01-.615-1.498L5.88 5 2.385 1.547A.875.875 0 013.615.302L7.74 4.377a.876.876 0 010 1.246L3.615 9.698A.872.872 0 013 9.95z" class="spectrum-UIIcon--medium"></path>
         </svg>
      </button>
      <div id="nav-dropdown-popover_${id}" class="spectrum-Popover spectrum-Popover--bottom spectrum-Picker-popover spectrum-Picker-popover--quiet filter-by-popover nav-dropdown-popover">
        <ul class="spectrum-Menu" role="menu">
          ${links}
        </ul>
      </div>
      <div id="nav-dropdown-mobile-popover_${id}" class="nav-dropdown-mobile-popover">
        <ul class="nav-sub-menu spectrum-Menu" role="menu">
          ${links}
        </ul>
      </div>
    `;
}

function globalNavLinkItemDropdownItem(url, name) {
  return `
      <li class="spectrum-Menu-item menu-item">
        <span class="spectrum-Menu-itemLabel"><a href="${url}" class="nav-dropdown-links" daa-ll="${name}" >${name}</a></span>
      </li>
    `;
}

function handleButtons(header) {
  const closeAllDropdowns = () => {
    header.querySelectorAll('button.navigation-dropdown').forEach((button) => {
      button.classList.remove('is-open');
      const dropdownPopover = header.querySelector(`#nav-dropdown-popover_${button.id.split('_')[1]}`);
      const dropdownMobilePopover = header.querySelector(`#nav-dropdown-mobile-popover_${button.id.split('_')[1]}`);

      if (dropdownPopover) {
        dropdownPopover.classList.remove('is-open');
        dropdownPopover.ariaHidden = 'true';
      }
      if (dropdownMobilePopover) {
        dropdownMobilePopover.classList.remove('is-open');
        dropdownMobilePopover.ariaHidden = 'true';
      }
    });
  };

  header.querySelectorAll('button.navigation-dropdown').forEach((button) => {
    if (button.id.indexOf('nav-dropdown-button') >= 0) {
      button.addEventListener('click', (evt) => {
        const index = button.id.split('_')[1];
        const dropdownPopover = header.querySelector(`#nav-dropdown-popover_${index}`);
        const dropdownMobilePopover = header.querySelector(`#nav-dropdown-mobile-popover_${index}`);

        if (!button.classList.contains('is-open')) {
          closeAllDropdowns();
          button.classList.add('is-open');
          if (dropdownPopover) {
            dropdownPopover.classList.add('is-open');
            dropdownPopover.ariaHidden = 'false';
          }
          if (dropdownMobilePopover) {
            dropdownMobilePopover.classList.add('is-open');
            dropdownMobilePopover.ariaHidden = 'false';
          }
        } else {
          button.classList.remove('is-open');
          if (dropdownPopover) {
            dropdownPopover.classList.remove('is-open');
            dropdownPopover.ariaHidden = 'true';
          }
          if (dropdownMobilePopover) {
            dropdownMobilePopover.classList.remove('is-open');
            dropdownMobilePopover.ariaHidden = 'true';
          }
        }
      });
    } else if (button.id.indexOf('nav-profile-dropdown-button') >= 0) {
      const profileDropdownPopover = header.querySelector('div#nav-profile-dropdown-popover');
      button.addEventListener('click', (evt) => {
        if (!button.classList.contains('is-open')) {
          closeAllDropdowns();
          button.classList.add('is-open');
          profileDropdownPopover.classList.add('is-open');
          profileDropdownPopover.ariaHidden = 'false';
        } else {
          button.classList.remove('is-open');
          profileDropdownPopover.classList.remove('is-open');
          profileDropdownPopover.ariaHidden = 'true';
        }
      });
    }
  });
}

// To add svg for version switcher
function addCheckmarkSvg(ul) {
  const menuItems = ul.querySelectorAll('.spectrum-Menu-item');
  const svgMarkup = `
        <svg role="img" class="spectrum-Menu-checkmark spectrum-Menu-itemIcon css-1k96gx8-Item spectrum-Icon spectrum-UIIcon-Checkmark100 svgDisplay">
           <path d="M5.125 12.625a1.25 1.25 0 01-.96-.45L1.04 8.425a1.25 1.25 0 011.92-1.6l2.136 2.563 5.922-7.536a1.25 1.25 0 111.964 1.545l-6.874 8.75a1.25 1.25 0 01-.965.478z" class="spectrum-UIIcon--large"></path>
           <path d="M3.5 9.5a.999.999 0 01-.774-.368l-2.45-3a1 1 0 111.548-1.264l1.657 2.028 4.68-6.01A1 1 0 019.74 2.114l-5.45 7a1 1 0 01-.777.386z" class="spectrum-UIIcon--medium"></path>
        </svg>`;

  function addCheckmark(item) {
    menuItems.forEach((el) => {
      const existingSvg = el.querySelector('.spectrum-Menu-checkmark');
      if (existingSvg) {
        existingSvg.remove();
      }
      const spanElement = el.querySelector('.spectrum-Menu-itemLabel');
      if (el.textContent.trim() === "v1.4" || el.textContent.trim() === "v2.0") {
        if (el !== item) {
          spanElement.style.flexDirection = 'row-reverse';
        } else {
          spanElement.insertAdjacentHTML('afterbegin', svgMarkup);
          spanElement.style.flexDirection = '';
        }
      } else {
        spanElement.style.flexDirection = '';
      }
    });
  }

  const index = Array.from(menuItems).findIndex(item => item.textContent.trim() === "v2.0");
  if (index !== -1) {
    addCheckmark(menuItems[index]);
  }

  menuItems.forEach((item) => {
    item.addEventListener('click', function (event) {
      if (event.target.tagName !== 'A') {
        const link = this.querySelector('a');
        if (link) {
          link.click();
        }
      }
      if (item.textContent.trim() === "v1.4" || item.textContent.trim() === "v2.0") {
        addCheckmark(this);
      }
    });
  });
}

function handleMenuButton(header) {
  const menuBtn = header.querySelector('.menu-btn');
  if (!menuBtn) return;

  menuBtn.addEventListener('change', () => {
    const sideNav = document.querySelector('.side-nav');
    if (menuBtn.checked) {
      sideNav.classList.add('is-visible');
      document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    } else {
      sideNav.classList.remove('is-visible');
      document.body.style.overflow = ''; // Restore scrolling
    }
  });
}

/**
 * Decorates the header
 * @param {*} block The header
 */
export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  const header = block.parentElement;
  header.classList.add('main-header', 'global-nav-header');
  header.setAttribute('daa-lh', 'header');

  // Create menu button (moved outside of template condition)
  const mobileButton = createTag('input', { class: 'menu-btn', type: 'checkbox', id: 'menu-btn' });
  header.appendChild(mobileButton);
  const mobileMenu = createTag('label', { class: 'menu-icon', for: 'menu-btn' });
  mobileMenu.innerHTML = '<span class="navicon"></span>';
  header.appendChild(mobileMenu);

  // Add Adobe icon and title
  const iconContainer = createTag('p', { class: 'icon-adobe-container' });
  const title = "Adobe Developer";
  const siteLink = createTag('a', { class: 'na-console-adobeio-link', href: "https://developer.adobe.com/" });
  const iconLink = createTag('a', { class: 'na-console-adobeio-link', href: siteLink.href });
  iconLink.innerHTML = '<img class="icon icon-adobe" src="/hlx_statics/icons/adobe.svg" alt="adobe icon">';
  iconContainer.appendChild(iconLink);
  siteLink.className = 'nav-console-adobeio-link-text';
  siteLink.innerHTML = `<strong class="spectrum-Heading spectrum-Heading--sizeS icon-adobe-label">${title}</strong>`;
  iconContainer.appendChild(siteLink);
  header.append(iconContainer);

  // Handle navigation based on source
  if (isSourceGithub()) {
    // Create navigation for docs from github (desktop only)
    if (window.innerWidth > 768) {
      let navigationLinks = createTag('ul', { id: 'navigation-links', class: 'menu desktop-nav', style: 'list-style-type: none;'});

      // Add Products link for documentation template
      if (isTopLevelNav(window.location.pathname)) {
        const homeLinkLi = createTag('li', {class: 'navigation-home'});
        const homeLinkA = createTag('a', {href: 'https://developer.adobe.com', 'daa-ll': 'Home', 'fullPath': true});
        homeLinkA.innerHTML = 'Products';
        homeLinkLi.append(homeLinkA);
        navigationLinks.append(homeLinkLi);
      } else {
        const productLi = createTag('li', {class: 'navigation-products'});
        const productA = createTag('a', {href: 'https://developer.adobe.com/apis', 'daa-ll': 'Products',  'fullPath': true});
        productA.innerHTML = 'Products';
        productLi.append(productA);
        navigationLinks.append(productLi);
      }

      const topNavHtml = await fetchTopNavHtml();
      if (topNavHtml) {
        navigationLinks.innerHTML += topNavHtml;

        // Process dropdowns for documentation template navigation
        navigationLinks.querySelectorAll('li > ul').forEach((dropDownList, index) => {
          let dropdownLinkDropdownHTML = '';
          let dropdownLinksHTML = '';

          dropDownList.querySelectorAll('ul > li > a').forEach((dropdownLinks) => {
            dropdownLinksHTML
              += globalNavLinkItemDropdownItem(dropdownLinks.href, dropdownLinks.innerText);
          });

          dropdownLinkDropdownHTML = globalNavLinkItemDropdown(
            index,
            dropDownList.parentElement.firstChild.textContent.trim(),
            dropdownLinksHTML,
          );
          dropDownList.parentElement.innerHTML = dropdownLinkDropdownHTML;
        });

        header.append(navigationLinks);
      }
    }

    // Handle mobile menu button for side nav
    if (window.innerWidth <= 768) {
      handleMenuButton(header);
    }

    // Update navigation visibility on resize
    window.addEventListener('resize', async () => {
      let navigationLinks = header.querySelector('#navigation-links');
      if (window.innerWidth > 768) {
        if (!navigationLinks) {
          navigationLinks = createTag('ul', { id: 'navigation-links', class: 'menu desktop-nav', style: 'list-style-type: none;'});

          // Add Products link for documentation template
          if (isTopLevelNav(window.location.pathname)) {
            const homeLinkLi = createTag('li', {class: 'navigation-home'});
            const homeLinkA = createTag('a', {href: 'https://developer.adobe.com', 'daa-ll': 'Home'});
            homeLinkA.innerHTML = 'Products';
            homeLinkLi.append(homeLinkA);
            navigationLinks.append(homeLinkLi);
          } else {
            const productLi = createTag('li', {class: 'navigation-products'});
            const productA = createTag('a', {href: 'https://developer.adobe.com/apis', 'daa-ll': 'Products'});
            productA.innerHTML = 'Products';
            productLi.append(productA);
            navigationLinks.append(productLi);
          }

          const topNavHtml = await fetchTopNavHtml();
          if (topNavHtml) {
            navigationLinks.innerHTML += topNavHtml;
            header.append(navigationLinks);
          }
        }
      } else {
        if (navigationLinks) {
          navigationLinks.remove();
        }
      }
    });
  } else {
    // Create navigation for non-documentation pages
    let navigationLinks = createTag('ul', { id: 'navigation-links', class: 'menu', style: 'list-style-type: none;'});

    if (isTopLevelNav(window.location.pathname)) {
      const homeLinkLi = createTag('li', {class: 'navigation-home'});
      const homeLinkA = createTag('a', {href: 'https://developer.adobe.com', 'daa-ll': 'Home'});
      homeLinkA.innerHTML = 'Products';
      homeLinkLi.append(homeLinkA);
      navigationLinks.append(homeLinkLi);
    } else {
      const productLi = createTag('li', {class: 'navigation-products'});
      const productA = createTag('a', {href: 'https://developer.adobe.com/apis', 'daa-ll': 'Products'});
      productA.innerHTML = 'Products';
      productLi.append(productA);
      navigationLinks.append(productLi);
    }

    // check if there's a path prefix then retrieve it otherwise default back to google drive path
    let navPath;
    if(getMetadata('pathprefix')) {
      const topNavHtml = await fetchTopNavHtml();
      if (topNavHtml) {
        navigationLinks.innerHTML += topNavHtml;
      }
    } else {
      navPath = cfg.nav || getClosestFranklinSubfolder(window.location.origin,'nav');
      let fragment = await loadFragment(navPath);
      if (fragment == null) {
        // load the default nav in franklin_assets folder nav
        fragment = await loadFragment(getClosestFranklinSubfolder(window.location.origin, 'nav', true));
      }
      const ul = fragment.querySelector("ul");
      ul.classList.add("menu");
      ul.setAttribute("id", "navigation-links");
      fragment.querySelectorAll("li").forEach((li, index) => {
        if (index == 0) {
          if (isTopLevelNav(window.location.pathname)) {
            const homeLink = ul.querySelector('li:nth-child(1)');
            homeLink.className = 'navigation-home';
          } else {
            li.classList.add("navigation-products");
          }
        }
      });
      navigationLinks = ul;
    }

    navigationLinks.querySelectorAll('li > ul').forEach((dropDownList, index) => {
      let dropdownLinkDropdownHTML = '';
      let dropdownLinksHTML = '';

      dropDownList.querySelectorAll('ul > li > a').forEach((dropdownLinks) => {
        dropdownLinksHTML
          += globalNavLinkItemDropdownItem(dropdownLinks.href, dropdownLinks.innerText);
      });

      dropdownLinkDropdownHTML = globalNavLinkItemDropdown(
        index,
        dropDownList.parentElement.firstChild.textContent.trim(),
        dropdownLinksHTML,
      );
      dropDownList.parentElement.innerHTML = dropdownLinkDropdownHTML;
    });

    addCheckmarkSvg(navigationLinks);

    let buttonDiv;
    if (window.location.pathname.includes('/developer-distribution')) {
      buttonDiv = createTag('div');
      navigationLinks.appendChild(buttonDiv);
      buttonDiv.appendChild(globalMobileDistributeButton());
    } else {
      buttonDiv = createTag('li', { class: 'button-container' });
      navigationLinks.appendChild(buttonDiv);
    }
    buttonDiv.appendChild(globalMobileConsoleButton());
    navigationLinks.querySelectorAll('a').forEach((a) => {
      if (a.parentElement.tagName === 'STRONG') {
        a.className = 'spectrum-Button spectrum-Button--secondary  spectrum-Button--sizeM';
        const span = createTag('span', { class: 'spectrum-Button-label' });
        span.innerHTML = a.innerHTML;
        a.innerHTML = '';
        a.appendChild(span);
        const li = a.parentElement.parentElement;
        const div = createTag('li', { class: 'nav-view-docs-button' });
        div.appendChild(a);
        navigationLinks.removeChild(li);
        navigationLinks.appendChild(div);
      }
    });

    header.append(navigationLinks);
  }

  // Add right container for all templates
  const rightContainer = createTag('div', { class: 'nav-console-right-container' });

  rightContainer.appendChild(globalNavSearchButton());
  if (window.location.pathname.includes('/developer-distribution')) {
    rightContainer.appendChild(globalDistributeButton());
  }
  rightContainer.appendChild(globalConsoleButton());
  rightContainer.appendChild(globalSignIn());
  header.append(rightContainer);
  header.append(globalNavSearchDropDown());

  //initialize search
  decorateSearchIframeContainer(header);
  // initSearch();
  block.remove();

  handleButtons(header);

  const signIn = header.querySelector('#signIn');
  signIn?.addEventListener('click', () => {
    window.adobeIMSMethods?.signIn();
  });

  setActiveTab();
  focusRing(header);

  // Always handle menu button (removed template condition)
  handleMenuButton(header);
  }
