import {
  createTag,
  setActiveTab,
  focusRing,
  isTopLevelNav,
  getClosestFranklinSubfolder,
} from '../../scripts/lib-adobeio.js';
import { readBlockConfig, getMetadata, fetchTopNavHtml } from '../../scripts/lib-helix.js';
import { loadFragment } from '../fragment/fragment.js';

const ALGOLIA_CONFIG = {
  APP_KEY: window.adp_search.APP_KEY || '',
  API_KEY: window.adp_search.API_KEY || ''
};

function isSourceGithub() {
  return getMetadata('source') === 'github';
}

// function to Get URL search parameters
function fetchSearchURLParams() {
  const params = new URLSearchParams(window.location.search);
  const queryFromURL = params.get("query") || "";
  const productsFromURL = params.get("products");
  return {
    query: queryFromURL,
    products: productsFromURL
  };
}

// function to find which index and product to search within
function localSearch() {
  // Remove leading/trailing slashes and split the pathname into segments
  const pathSegments = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
  
  // Limit to the first three levels
  const maxLevels = Math.min(pathSegments.length, 3);
  let bestMatch = null;

  // Check progressively up to three levels for a match
  for (let i = 0; i < maxLevels; i++) {
    const subfolderPath = `/${pathSegments.slice(0, i + 1).join('/')}/`; // Build path incrementally
    const matchingProduct = Object.entries(window.adp_search.completeProductMap).find(
      ([indexName, { indexPathPrefix }]) => indexPathPrefix === subfolderPath
    );
    if (matchingProduct) {
      bestMatch = { indexName: matchingProduct[0], productName: matchingProduct[1].productName };
    }
  }
  return bestMatch;
}

async function initSearch() {
  // Trigger validation if it hasn't been triggered yet
  if (window.adp_search.triggerIndexValidation && !window.adp_search.indicesValidationPromise) {
    window.adp_search.triggerIndexValidation();
  }

  // Wait for index validation to complete
  if (window.adp_search.indicesValidationPromise) {
    try {
      await window.adp_search.indicesValidationPromise;
      console.log('Index validation complete, initializing search');
    } catch (error) {
      console.warn('Index validation failed, proceeding with available indices:', error);
    }
  }

  const { liteClient: algoliasearch } = window["algoliasearch/lite"];
  const { connectAutocomplete } = instantsearch.connectors;

  const searchClient = algoliasearch(ALGOLIA_CONFIG.APP_KEY, ALGOLIA_CONFIG.API_KEY);
  const SUGGESTION_MAX_RESULTS = 50;
  const SEARCH_MAX_RESULTS = 100;

  const indices = window.adp_search.indices
  const indexToProduct = window.adp_search.index_to_product;
  const allProducts = window.adp_search.products;

  const urlParams = fetchSearchURLParams();
  const localElem = localSearch();

  // set flag to see if suggestions or actual results show
  let searchExecuted = false; // Flag to track if a full search has been done (enter key has been pressed)
  const searchResultsDiv = document.querySelector("div.merged-results")
  let suggestionsFlag = false;
  let searchCleared = false; // Flag to track if search was cleared
  if (getComputedStyle(searchResultsDiv).visibility === "hidden") {
    suggestionsFlag = true;
  }else{
    searchExecuted = true;
  }

  let selectedProducts;
  if (localElem && !urlParams.products){ // if no products selected in URL and in local search then just select local product (probably first search in product page)
    selectedProducts = [localElem.productName]
  }else{
    // from url params set selected products
    selectedProducts = (urlParams.products === "all" || !urlParams.products) 
    ? allProducts.slice() // Select all products when "all" is in the URL or no products (a new search)
    : urlParams.products.split(",").filter(product => allProducts.includes(product));
  }

  // Get indices corresponding to selected products
  let selectedIndices = indices.filter(indexName => selectedProducts.includes(indexToProduct[indexName]));
  let initialIndex;

  // Set initial index to initialize instant search instance
  if (localElem && !urlParams.products){ //the only unique case is when initially doing local search and not selecting other products
    initialIndex = localElem.indexName;
  }else{
    initialIndex = selectedIndices[0];
  }

  // Initialize InstantSearch
  let search = instantsearch({
    indexName: initialIndex, // Use the first valid index
    searchClient,
    });

  // Variable to keep track of results to modify how to render them later
  let results = new Map();
  
  search.start(); 

  // Function to initialize or update the search
  function updateSearch() {
    // Get indices corresponding to selected products
    const selectedIndices = indices.filter((indexName) => {
      const product = indexToProduct[indexName];
      return selectedProducts.includes(product);
    });

    let searchBoxContainer = ".merged-results";
    // // Number of results displayed per index changes depending on how many products are selected
    if (suggestionsFlag) {
      searchBoxContainer = ".suggestion-results"; 
    }

     // Calculate hits dynamically based number of selected indices
    const hits = Math.min(15, Math.max(4, Math.floor(SUGGESTION_MAX_RESULTS / selectedIndices.length)));
 
     // Add common widgets like hits per index and how long results are (content)
     search.addWidgets([
       instantsearch.widgets.configure({
         hitsPerPage: hits,
         attributesToHighlight: ['title', 'content'],
         attributesToSnippet: ['content:50'],
       }),
     ]);
   
    // Custom InstantSearch search box to deal with suggestions and full results which depends on user input
    function customSearchBox() { return { init({ helper }) {
      const searchInput = document.querySelector("#search-box input");
      const clearSearchQueryButton = document.querySelector("button.clear-search-query-button");
      const searchResults = document.querySelector("div.search-results");
      const searchSuggestions = document.querySelector("div.suggestion-results");
      const outerSearchSuggestions = document.querySelector("div.outer-suggestion-results");
      const queryFromURL = urlParams.query;

      // Function to toggle clear button visibility
      function toggleClearButton() {
        if (searchInput.value.trim() !== "") {
          clearSearchQueryButton.style.display = "block";
        } else {
          clearSearchQueryButton.style.display = "none";
        }
      }

      // Initialize clear button visibility
      toggleClearButton();

      // Detects query in URL but no input value (tab was reloaded)
      if (queryFromURL && !searchInput.value) {
        searchInput.value = queryFromURL;
        helper.setQuery(queryFromURL).search();
        suggestionsFlag = false;
        searchResults.style.visibility = "visible";
        outerSearchSuggestions.style.display = "none";              
        searchExecuted = true; // Mark search as executed
        toggleClearButton(); // Update clear button visibility
      }

      // Listen for user typing (suggestions appear before Enter is pressed)
      searchInput.addEventListener('input', () => {
        toggleClearButton(); // Update clear button visibility on input
        searchCleared = false; // Reset cleared flag when user starts typing
        if (!searchExecuted && searchInput.value.trim() !== "") {
            searchSuggestions.style.display = "block"; 
            helper.setQuery(searchInput.value).search(); 
        }
      });

      // When Enter is pressed, execute full search and prevent suggestions from reappearing
      searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          searchCleared = false; // Reset cleared flag when user presses Enter
          helper.setQuery(searchInput.value).search();
          outerSearchSuggestions.style.display = "none";  
          searchSuggestions.style.display = "none";            
          suggestionsFlag = false; // Prevent suggestions from overriding search results
          searchResults.style.visibility = "visible";
          searchResults.classList.add('has-results');
          searchExecuted = true; // Prevent suggestions from overriding search results
        }
      });

      // Clear search query when clear button is clicked
      clearSearchQueryButton.addEventListener('click', () => {
        outerSearchSuggestions.style.display = "flex"; 
        searchInput.value = "";
        helper.setQuery('').search();
        // which results are removed depends on which mode we are in
        if(suggestionsFlag){
          searchSuggestions.style.display = "none";    
        }else{
          searchResults.classList.remove('has-results');
          searchResults.style.visibility = "hidden";
        }
        searchCleared = true; // Mark that search was cleared
        toggleClearButton(); // Update clear button visibility after clearing
      });
    }, render() {}, };
  }
   
    // Custom InstantSearch function to merge hits from multiple indices
    function mergedHits({ indices }) {
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
          // 
          results.set(instantsearch.highlight({ hit, attribute: "title" }), {
            url: hit.url,
            product: hit.product,
            content: instantsearch.snippet({ hit, attribute: 'content' }),
          });
        });
      updateSearchParams();
      
      // Don't render results if search was cleared
      if (searchCleared) {
        searchCleared = false; // Reset the flag
        return;
      }
      
      if (suggestionsFlag){
        renderSuggestionResults();
      }else{
        renderMergedResults(); // Call to render the filtered results
      }
    }
    
    const customMergedHits = connectAutocomplete(mergedHits);
    search.addWidgets([
      customSearchBox(),
      customMergedHits({
        container: document.querySelector(searchBoxContainer)
      }),
    ]);

    // Loop through rest of indices
    selectedIndices.slice(1).forEach((indexName) => {
      search.addWidgets([
        instantsearch.widgets.index({
          indexName: indexName,
        }),
      ]);
    });
   
    search.refresh();
  }

  // Function to update search parameters in URL like products and query
  function updateSearchParams() {
    // Preserve existing URL parameters
    const params = new URLSearchParams(window.location.search);
  
    // Get the current search query from the input box
    const searchInput = document.querySelector("#search-box input");
    const query = searchInput ? searchInput.value : null;
  
    // Determine if all products are selected
    const allProductsSelected = selectedProducts.length === allProducts.length;
  
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

  // Function that renders the checkboxes
  function renderProductCheckboxes() {
    const container = document.querySelector('.filters');
    container.innerHTML = '';

    // "All Products" checkbox
    const allProductsDiv = document.createElement('div');
    allProductsDiv.classList.add('search-checkbox-div');

    // Add a data-all on the "All Products" wrapper (never hide All Products)
    allProductsDiv.dataset.all = 'true';

    const allProductsCheckbox = document.createElement('input');
    allProductsCheckbox.type = 'checkbox';
    allProductsCheckbox.id = 'checkbox-all-products';
    allProductsCheckbox.classList.add('search-checkbox');
    allProductsCheckbox.value = 'all-products';
    allProductsCheckbox.checked = selectedProducts.length === allProducts.length;

    const allProductsLabel = document.createElement('label');
    allProductsLabel.htmlFor = 'checkbox-all-products';
    allProductsLabel.classList.add('spectrum-Checkbox-label', 'search-label');
    allProductsLabel.innerText = 'All Products';

    allProductsDiv.appendChild(allProductsCheckbox);
    allProductsDiv.appendChild(allProductsLabel);
    container.appendChild(allProductsDiv);

    // individual product checkboxes
    allProducts.forEach((product) => {
      const productDiv = document.createElement('div');
      productDiv.classList.add('search-checkbox-div');
      // – add a data-product attribute on each wrapper for toggling it later
      productDiv.dataset.product = product;
      productDiv.id = `filter-wrapper-${product.replace(/\s+/g, '-')}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `checkbox-${product.replace(/\s+/g, '-')}`;
      checkbox.value = product;
      checkbox.classList.add('search-checkbox');

      // don't check products if new tab or if all products are selected
      checkbox.checked = selectedProducts.includes(product) && !allProductsCheckbox.checked;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.classList.add('spectrum-Checkbox-label', 'search-label');
      label.innerText = product;

      productDiv.appendChild(checkbox);
      productDiv.appendChild(label);
      container.appendChild(productDiv);
    });
  }

  // Function that is called after each search render to hide/show product checkboxes
  function updateCheckboxVisibility(productsWithResults) {
    const allSelected = selectedProducts.length === allProducts.length;

    // loop over each product‐wrapper
    document.querySelectorAll('.search-checkbox-div[data-product]').forEach((div) => {
      const product = div.dataset.product;
      if (allSelected) {
        // only show those with results
        div.style.display = productsWithResults.has(product) ? '' : 'none';
      } else {
        // specific‐product mode: show all product checkboxes
        div.style.display = '';
      }
    });
  }
 
  // Function that attaches event listeners to each checkbox
  function attachCheckboxEventListeners() {
    const allProductsCheckbox = document.getElementById('checkbox-all-products');
    const productCheckboxes = document.querySelectorAll('.filters input[type="checkbox"]:not(#checkbox-all-products)');
  
    // Event listener for "All Products" checkbox
    allProductsCheckbox.addEventListener('change', () => {
      if (allProductsCheckbox.checked) {
        selectedProducts = allProducts.slice(); // Select all products
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
          selectedProducts = allProducts.slice();
        }
        updateSearchParams();
        updateSearch();
      });
    });
  }
  
  // Function that sorts results and makes the custom html for each result
  function renderMergedResults() {
    const container = document.querySelector('.merged-results');
    container.innerHTML = '';

    // group hits by product
    const productGroupedResults = new Map();
    results.forEach((value, key) => {
      if (!productGroupedResults.has(value.product)) {
        productGroupedResults.set(value.product, []);
      }
      productGroupedResults.get(value.product).push({ key, value });
    });

    // figure out which products have at least one hit
    const productsWithResults = new Set(productGroupedResults.keys());

    // hide/show checkboxes based on current results + mode
    updateCheckboxVisibility(productsWithResults);

    // determine display order
    const allProductsCheckbox = document.getElementById('checkbox-all-products');
    const productsToShow = allProductsCheckbox.checked ? allProducts : selectedProducts;

    const productsWith = [], productsWithout = [];
    productsToShow.forEach((p) =>
      productsWithResults.has(p) ? productsWith.push(p) : productsWithout.push(p)
    );
    const sorted = [...productsWith, ...productsWithout];

    // render each group
    sorted.forEach((product) => {
      const section = document.createElement('div');
      section.classList.add('product-group');
      section.innerHTML = `<h2>${product}</h2>`;

      if (productGroupedResults.has(product)) {
        productGroupedResults.get(product).forEach(({ key, value }) => {
          section.innerHTML += `
            <div class="result-item">
              <h1 class="spectrum-Body spectrum-Body--sizeM css-1i3xfjj">
                <a href="${value.url}">${key}</a>
              </h1>
              <a href="${value.url} class="spectrum-Link spectrum-Link--quiet spectrum-Link--secondary">${value.url}</a>        
              <p class="result-content spectrum-Body spectrum-Body--sizeS">${value.content}</p>  
            </div>
            <hr>
          `;
        });
      } else {
        section.innerHTML += `<p class="no-merged-result">No results found for this product.</p> <hr>`;
      }
      container.appendChild(section);
    });

    // Ensure that at least something appears, even if no results are found
    if (sorted.length === 0) {
      container.innerHTML = '<p>No products selected.</p>';
    }
  }

  // Function that sorts results and makes the custom html for each result but for suggestions
  function renderSuggestionResults() {
    const ul = document.querySelector('ul.suggestion-results-list');
    ul.innerHTML = '';

    // group by product
    const productGroupedResults = new Map();
    results.forEach((value, key) => {
      if (!productGroupedResults.has(value.product)) {
        productGroupedResults.set(value.product, []);
      }
      productGroupedResults.get(value.product).push({ key, value });
    });

    // compute who has any suggestions
    const productsWithResults = new Set(productGroupedResults.keys());
    updateCheckboxVisibility(productsWithResults);

    const allProductsCheckbox = document.getElementById('checkbox-all-products');
    const productsToShow = allProductsCheckbox.checked
      ? allProducts
      : selectedProducts;

    const withHits = [], withoutHits = [];
    productsToShow.forEach((p) =>
      productsWithResults.has(p) ? withHits.push(p) : withoutHits.push(p)
    );
    const sorted = [...withHits, ...withoutHits];

    // render each section
    sorted.forEach((product) => {
      const productDiv = document.createElement("div");
        productDiv.classList.add("suggestion-product-group");

        // Add separator before each product section
        productDiv.innerHTML = `<hr class="search-suggestions-hr-top"><h4 class="search-suggestions-h4">${product}</h4><hr class="search-suggestions-hr-bottom">`;
        if (productGroupedResults.has(product)) {
          // If there are results, render them
          productGroupedResults.get(product).forEach(({ key, value }) => {
              productDiv.innerHTML += `
                  <a href="${value.url}" role="menuitem" tabindex="0" target="_top" class="spectrum-Menu-item search-suggestions-a">
                    <span class="spectrum-Menu-itemLabel">
                        <div>
                            <strong>${key}</strong>
                            <div class="search-suggestions-link">${value.url}</div>
                            <div>${value.content}</div>
                        </div>
                    </span>
                  </a>
              `;
          });
        } else {
            // Even if no results, still display the product section
            productDiv.innerHTML += `<p class="no-suggestions-result" >No results found for this product.</p>`;
        }
      ul.appendChild(productDiv);
    });

    // Ensure that at least something appears, even if no results are found
    if (sorted.length === 0) {
      ul.innerHTML = '<p>No products selected.</p>';
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
   <div class="outer-search-box">
    <div id="search-box" class="search-box">
      <form onsubmit="return false;">
        <div>
          <svg aria-hidden="true" role="img" viewBox="0 0 36 36" class="spectrum-Icon spectrum-Icon--sizeMd icon-left">
            <path d="M33.173 30.215L25.4 22.443a12.826 12.826 0 10-2.957 2.957l7.772 7.772a2.1 2.1 0 002.958-2.958zM6 15a9 9 0 119 9 9 9 0 01-9-9z"></path>
          </svg>
          <input id="search-input" type="text" placeholder="Search..." autocomplete="off" class="search-input">
          <button type="reset" aria-label="Clear Search" class="clear-search-query-button spectrum-ClearButton spectrum-Search-clearButton spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet">
            <svg aria-hidden="true" role="img" viewBox="0 0 36 36" class="icon-right spectrum-Icon spectrum-Icon--sizeM">
              <path d="M26.485 6.686L18 15.172 9.515 6.686a1 1 0 0 0-1.414 0L6.686 8.1a1 1 0 0 0 0 1.414L15.172 18l-8.486 8.485a1 1 0 0 0 0 1.414L8.1 29.314a1 1 0 0 0 1.414 0L18 20.828l8.485 8.486a1 1 0 0 0 1.414 0l1.415-1.414a1 1 0 0 0 0-1.414L20.828 18l8.486-8.485a1 1 0 0 0 0-1.414L27.9 6.686a1 1 0 0 0-1.415 0z"></path>
            </svg>
          </button>
        </div>
        </div>   
      </form>
      <div class="outer-suggestion-results">
        <div class="suggestion-results spectrum-Popover spectrum-Popover--bottom is-open" style="display: none;">
          <ul role="menubar" class="suggestion-results-list">
        </div>
      </div>
    </div>

    <div class="search-results">
      <div class="search-refinement">
        <h4 class="spectrum-Heading spectrum-Heading--sizeXS filter-heading">Filter by Products</h4>
        <div class="filters"></div>
      </div>
      <div class="merged-results"></div>
    </div>
    `;

  return searchDropDown;
};

function decorateSearchIframeContainer(header) {
  const searchDiv = header.querySelector('div.nav-console-search-frame');
  const searchButton = header.querySelector('button.nav-dropdown-search');
  const searchSuggestionsDiv = header.querySelector('div.suggestion-results');
  const outerSuggestionDiv = header.querySelector('div.outer-suggestion-results');
  const closeSearchButton = header.querySelector('button.close-search-button');
  const searchResultsDiv = document.querySelector("div.search-results");
  const searchBar = document.querySelector("div.outer-search-box");

  const urlParams = fetchSearchURLParams();

  // Function to hide suggestions
  function hideSuggestions() {
    outerSuggestionDiv.style.display = "none";              
    searchSuggestionsDiv.style.display = "none";
  }

  // Function to show search with semi-transparent background
  function showSearchBar() {
    searchBar.style.visibility = 'visible';
    outerSuggestionDiv.style.display = "flex"; 
    searchResultsDiv.classList.remove('has-results');
  }

  // Function to show search with results and white background
  function showSearchResults() {
    searchDiv.style.visibility = 'visible';
    searchResultsDiv.style.visibility = 'visible';
    searchResultsDiv.classList.add('has-results');
    hideSuggestions();
  }

  // Function to hide search completely
  function hideSearch() {
    searchBar.style.visibility = 'hidden';
    searchDiv.style.visibility = 'hidden';
    searchResultsDiv.style.visibility = 'hidden';
    searchResultsDiv.classList.remove('has-results');
    hideSuggestions();
  }

  // Initialize search based on URL parameters - had both products selected and a query
  if (urlParams.query) {
    initSearch();
    showSearchResults();
    searchButton.classList.add('is-open');
    searchButton.style.display = 'none';
    closeSearchButton.style.display = 'block';
  }

  // when there's no query but a search instance has been created - only show search bar instead of full search
  if (!urlParams.query && urlParams.products) {
    initSearch();
    showSearchBar();
    searchButton.classList.add('is-open');
    searchButton.style.display = 'none';
    closeSearchButton.style.display = 'block';
  }

  // open search with mag glass search button
  searchButton.addEventListener('click', (evt) => {
    if (!evt.currentTarget.classList.contains('is-open')) {
      initSearch();
      showSearchBar();
      searchButton.classList.add('is-open');
      searchButton.style.display = 'none';
      closeSearchButton.style.display = 'block';
    }
  });

  // close search
  closeSearchButton.addEventListener('click', () => {
    searchButton.classList.remove('is-open');
    closeSearchButton.classList.remove('is-open');
    hideSearch();
    searchButton.style.display = 'block';
    closeSearchButton.style.display = 'none';
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
    

    // Handle mobile menu button for side nav
    handleMenuButton(header);
    

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
  if(window.adp_search.map_found){
    decorateSearchIframeContainer(header);
  }
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
