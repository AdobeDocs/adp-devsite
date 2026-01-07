import {
  sampleRUM,
  buildBlock,
  decorateBlock,
  loadBlock,
  decoratePictures,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForLCP,
  loadBlocks,
  loadCSS,
  addFavIcon,
  getMetadata,
  IS_DEV_DOCS,
  toCamelCase,
  toClassName,
  githubActionsBlock,
} from './lib-helix.js';

import {
  buildBreadcrumbs,
  buildCodes,
  buildEmbeds,
  buildGrid,
  buildHero,
  buildHeadings,
  buildSideNav,
  buildSiteWideBanner,
  buildAside,
  buildOnThisPage,
  createTag,
  toggleScale,
  decorateAnchorLink,
  decorateInlineCodes,
  decorateNestedCodes,
  isHlxPath,
  decorateProfile,
  isLocalHostEnvironment,
  isStageEnvironment,
  isProdEnvironment,
  addExtraScript,
  addExtraScriptWithLoad,
  decorateHR,
  buildNextPrev,
  buildResources,
  checkExternalLink,
  LoadingState,
  imsReady,
  imsError,
  imsGetProfile,
  imsGetProfileSuccess,
  imsGetProfileError,
  scrollWithLayoutAdjustment,
} from './lib-adobeio.js';

export {
  sampleRUM,
  toCamelCase,
  toClassName,
  getMetadata,
  loadCSS,
};

/*
 * ------------------------------------------------------------
 * Edit above at your own risk
 * ------------------------------------------------------------
 */

window.hlx = window.hlx || {};
window.adobeid = window.adobeid || {};
window.adp = window.adp || {};


const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here

sampleRUM('top');

window.addEventListener('load', () => sampleRUM('load'));

window.addEventListener('unhandledrejection', (event) => {
  sampleRUM('error', { source: event.reason.sourceURL, target: event.reason.line });
});

window.addEventListener('error', (event) => {
  sampleRUM('error', { source: event.filename, target: event.lineno });
});

window.addEventListener('imsReady', () => {
  window.adp.imsStatus = LoadingState.SUCCESS;
});

window.addEventListener('imsError', () => {
  window.adp.imsStatus = LoadingState.ERROR;
});

window.addEventListener('imsGetProfile', () => {
  window.adp.imsProfile = LoadingState.LOADING;
});

window.addEventListener('imsGetProfileSuccess', () => {
  window.adp.imsProfile = LoadingState.SUCCESS;
});

window.addEventListener('imsGetProfileError', () => {
  window.adp.imsProfile = LoadingState.ERROR;
});

window.addEventListener('resize', toggleScale);

const range = document.createRange();

function loadHeader(header) {
  const headerBlock = buildBlock('header', '');
  header.append(headerBlock);
  decorateBlock(headerBlock);
  loadBlock(headerBlock);
  const contentHeader = document.querySelector('.content-header');
  if (document.querySelector('.breadcrumbs')?.clientWidth > 750) {
    contentHeader.classList.add('block-display');
  }

}

function loadFooter(footer) {
  const footerBlock = buildBlock('footer', '');
  footer.append(footerBlock);
  decorateBlock(footerBlock);
  loadBlock(footerBlock);
}

function loadOnThisPage(onthispage) {
  const onthispageBlock = buildBlock('onthispage', '');
  onthispage.append(onthispageBlock);
  decorateBlock(onthispageBlock);
  loadBlock(onthispageBlock);
}

function loadNextPrev(nextPrev) {
  const nextPrevBlock = buildBlock('next-prev', '');
  nextPrev.append(nextPrevBlock);
  decorateBlock(nextPrevBlock);
  loadBlock(nextPrevBlock);
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */

function buildAutoBlocks(main) {
  try {
    buildCodes(main);
    buildEmbeds(main);
    buildHeadings(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  if(!IS_DEV_DOCS) {
    decoratePictures(main);
  }
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateInlineCodes(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateNestedCodes(main);
  decorateHR(main);
  checkExternalLink(main);
}

/**
 * Decorates the html element.
 * @param {*} html The html element
 */
function decorateHTML(html) {
  html.className = 'spectrum spectrum--light spectrum--medium';
  html.dir = 'ltr';
  html.lang = 'en';
}

/**
 * Overwrites image optimization done by EDS on image URLs.
 *
 * For example, it replaces:
 * "./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?width=2000&format=webply&optimize=medium"
 *
 * with:
 * "./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?format=webply&optimize=low"
 *
 * @param {string} url The image URL
 */
function optimizeImageUrl(url) {
  if (!url || !url.includes('?')) {
    return url;
  }

  const [baseUrl, queryString] = url.split('?');
  const searchParams = new URLSearchParams(queryString);
  searchParams.delete('width');
  searchParams.set('optimize', 'low');

  return baseUrl + '?' + searchParams.toString();
}

/**
 * Overwrites image optimization done by EDS on hero blocks.
 *
 * For example, it replaces:
 *  <picture>
 *    <source type="image/webp" srcset="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?width=2000&amp;format=webply&amp;optimize=medium" media="(min-width: 600px)">
 *    <source type="image/webp" srcset="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?width=750&amp;format=webply&amp;optimize=medium">
 *    <source type="image/png" srcset="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?width=2000&amp;format=png&amp;optimize=medium" media="(min-width: 600px)">
 *    <img loading="lazy" alt="" src="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?width=750&amp;format=png&amp;optimize=medium" width="1600" height="492">
 *  </picture>
 *
 * with:
 *  <picture>
 *    <source type="image/webp" srcset="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?format=webply&amp;optimize=low">
 *    <source type="image/png" srcset="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?format=png&amp;optimize=low">
 *    <img loading="eager" alt="" src="./media_1ca86c84d7c76bbfc48281a85ab4ab2e301692ad7.png?format=png&amp;optimize=low">
 *  </picture>
 */
function optimizeHeroPictures() {
  const heroes = ['hero', 'herosimple', 'site-hero', 'superhero'];
  const selector = heroes.map(hero => `div.${hero} picture`).join(', ');
  const pictures = document.querySelectorAll(selector);
  pictures.forEach(picture => {

    const sources = picture.querySelectorAll('source');
    sources.forEach(source => {
      source.removeAttribute('media');
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        source.setAttribute('srcset', optimizeImageUrl(srcset));
      }
    });

    const imgs = picture.querySelectorAll('img');
    imgs.forEach(img => {
      img.removeAttribute('width');
      img.removeAttribute('height');
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('src', optimizeImageUrl(src));
      }
    });

    // Remove duplicate elements that may have resulted after attribute modifications
    const seen = new Set();
    const children = Array.from(picture.children);
    children.forEach(child => {
      const outerHtml = child.outerHTML;
      if (seen.has(outerHtml)) {
        child.remove();
      } else {
        seen.add(outerHtml);
      }
    });

  });
}

/**
 * loads everything needed to get to LCP.
 */
async function loadEager(doc) {
  const experiment = getMetadata('experiment');
  const instantExperiment = getMetadata('instant-experiment');
  if (instantExperiment || experiment) {
    // eslint-disable-next-line import/no-cycle
    const { runExperiment } = await import('./experimentation.js');
    await runExperiment(experiment, instantExperiment);
  }

  optimizeHeroPictures();

  decorateTemplateAndTheme();
  const html = doc.querySelector('html');
  if (html) {
    decorateHTML(html);
  }
  toggleScale();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await waitForLCP(LCP_BLOCKS);
  }

  const mainContainer = document.querySelector('main');
  if (IS_DEV_DOCS) {
    // check if this page is from dev docs, then change the main container to white background.
    mainContainer.classList.add('dev-docs', 'white-background');

    buildGrid(main);
    buildBreadcrumbs(main);
  } else {
    mainContainer.classList.add('dev-biz');
  }

  buildSideNav(main);
  buildSiteWideBanner(main);

  document.body.classList.add('appear');
  loadConfig();
}

function setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout) {
  window.adobeid = {
    client_id: client_id,
    scope: scope,
    locale: 'en_US',
    environment: environment,
    useLocalStorage: false,
    logsEnabled: logsEnabled,
    redirect_uri: window.location.href,
    autoValidateToken: true,
    alwaysRemoveTokenFromUrl: true,
    onReady: () => {
      window.adp = window.adp || {};
      window.dispatchEvent(imsReady);
      window.dispatchEvent(imsGetProfile);
      if (window.adobeIMS.isSignedInUser()) {
        window.adobeIMS.getProfile().then((profile) => {
          window.adobeid.profile = profile;
          window.adobeid.profile.avatarUrl = '/hlx_statics/icons/avatar.svg';
          window.dispatchEvent(imsGetProfileSuccess);
        })
        .catch((ex) => {
          window.dispatchEvent(imsGetProfileError, ex);
        });
      } else {
        window.dispatchEvent(imsGetProfileError);
      }
      resolve(); // resolve the promise, consumers can now use window.adobeIMS
      clearTimeout(timeout);
    },
    onError: (error) => {
      window.dispatchEvent(imsError);
      reject(error);
    },
  };
}

export async function loadAep() {
  addExtraScript(document.body, 'https://www.adobe.com/marketingtech/main.standard.min.js');

  const intervalId = setInterval(watchVariable, 1000);
  function watchVariable() {
    // wait for _satellite to become available and track page
    // eslint-disable-next-line no-undef
    if (typeof window._satellite !== 'undefined') {
      console.log(`Route tracking page name as: ${location.href}`);

      // eslint-disable-next-line no-undef
      _satellite.track('state',
        {
          xdm: {},
          data: {
            _adobe_corpnew: {
              web: {
                webPageDetails: {
                  customPageName: location.href
                }
              }
            }
          }
        }
      );

      clearInterval(intervalId);
    }
  }
}

export async function loadIms() {
  window.imsLoaded =
    window.imsLoaded ||
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IMS timeout')), 5000);

      // different IMS clients
      if (isHlxPath(window.location.host)) {
        const client_id = 'helix_adobeio';
        const scope = 'AdobeID,openid,read_organizations,additional_info.projectedProductContext,additional_info.roles,gnav,read_pc.dma_bullseye,creative_sdk';
        const environment = 'stg1';
        const logsEnabled = true;

        setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout);
      } else if (!isHlxPath(window.location.host) && isStageEnvironment(window.location.host)) {
        if (window.location.pathname.includes('/photoshop/api')) {
          const client_id = 'cis_easybake';
          const scope = 'AdobeID,openid,creative_sdk,creative_cloud,unified_dev_portal,read_organizations,additional_info.projectedProductContext,additional_info.roles,gnav,read_pc.dma_bullseye';
          const environment = 'stg1';
          const logsEnabled = true;

          setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout);
        } else {
          const client_id = 'stage_adobe_io';
          const scope = 'AdobeID,openid,unified_dev_portal,read_organizations,additional_info.projectedProductContext,additional_info.roles,gnav,read_pc.dma_bullseye,creative_sdk';
          const environment = 'stg1';
          const logsEnabled = true;

          setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout);
        }
      } else if (!isHlxPath(window.location.host) && !isStageEnvironment(window.location.host)) {
        if (window.location.pathname.includes('/photoshop/api')) {
          const client_id = 'cis_easybake';
          const scope = 'AdobeID,openid,creative_sdk,creative_cloud,unified_dev_portal,read_organizations,additional_info.projectedProductContext,additional_info.roles,gnav,read_pc.dma_bullseye';
          const environment = 'prod';
          const logsEnabled = false;

          setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout);
        } else {
          const client_id = 'adobe_io';
          const scope = 'AdobeID,openid,unified_dev_portal,read_organizations,additional_info.projectedProductContext,additional_info.roles,gnav,read_pc.dma_bullseye,creative_sdk';
          const environment = 'prod';
          const logsEnabled = false;

          setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout);
        }
      }

      if (isHlxPath(window.location.host) || isStageEnvironment(window.location.host)) {
        addExtraScript(document.body, 'https://auth-stg1.services.adobe.com/imslib/imslib.js');
      } else {
        addExtraScript(document.body, 'https://auth.services.adobe.com/imslib/imslib.min.js');
      }
    });
  return window.imsLoaded;
}

/**
 * Load config items into the window for use
 */
function loadConfig() {

  window.REDOCLY = `eyJ0IjpmYWxzZSwiaSI6MTc1OTI2MDMzNiwiZSI6MTc5MDgwMTQxNywiaCI6WyJyZWRvYy5seSIsImRldmVsb3Blci5hZG9iZS5jb20iLCJkZXZlbG9wZXItc3RhZ2UuYWRvYmUuY29tIiwiZGV2ZWxvcGVyLmZyYW1lLmlvIiwiZGV2ZWxvcGVyLmRldi5mcmFtZS5pbyIsImxvY2FsaG9zdC5jb3JwLmFkb2JlLmNvbSIsInJlZG9jbHktYXBpLWJsb2NrLS1hZHAtZGV2c2l0ZS0tYWRvYmVkb2NzLmFlbS5wYWdlIiwiZGV2ZWxvcGVyLWRldi5hZG9iZS5jb20iLCJkZXZob21lLmNvcnAuYWRvYmUuY29tIiwiZGV2LmRldmhvbWUuY29ycC5hZG9iZS5jb20iLCJzdGFnZS0tYWRwLWRldnNpdGUtc3RhZ2UtLWFkb2JlZG9jcy5hZW0ucGFnZSJdLCJzIjoicG9ydGFsIn0=.bz4A/pSTnw14pUI64iQ3i/xiPkh2TosUpUJg4C0W/K7ZeyIPB7K9TTX1zo+cr7GZN6eqaAKv6gBGoG4xWL1rxw==`;

  // cookie preference
  window.fedsConfig = {
    privacy: {
      // TODO config from adobe.com
      otDomainId: '7a5eb705-95ed-4cc4-a11d-0cc5760e93db',
      footerLinkSelector: '#openPrivacy',
    },
  };

  window.alloy_all = window.alloy_all || {};
  window.alloy_all.data = window.alloy_all.data || {};
  window.alloy_all.data._adobe_corpnew = window.alloy_all.data._adobe_corpnew || {};
  window.alloy_all.data._adobe_corpnew.digitalData = window.alloy_all.data._adobe_corpnew.digitalData || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page = window.alloy_all.data._adobe_corpnew.digitalData.page || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo = window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo || {};
  window.alloy_all.data._adobe_corpnew.digitalData.page.pageInfo.language = 'en-US';

  let launchURL;
  let edgeConfigId;

  // if on stage, dev or on .page - set analytics to dev
  isProdEnvironment
  if (isProdEnvironment(window.location.host)) {
    edgeConfigId = '57c20bab-94c3-425e-95cb-0b9948b1fdd4';
    launchURL = 'https://assets.adobedtm.com/d4d114c60e50/a0e989131fd5/launch-5dd5dd2177e6.min.js';

  } else {
    edgeConfigId = 'a44f0037-2ada-441f-a012-243832ce5ff9';
    launchURL = 'https://assets.adobedtm.com/d4d114c60e50/a0e989131fd5/launch-2c94beadc94f-development.min.js';
  }

  window.marketingtech = {
    adobe: {
      launch: {
        url: launchURL,
        controlPageLoad: true,
      },
      alloy: {
        edgeConfigId: edgeConfigId,
      },
      target: false,
      audienceManager: false,
    }
  };
}

/**
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');

  // Check for C0002 (Performance/Analytics) consent before loading AEP
  function checkConsent() {
    // Check if adobePrivacy is available
    console.log('test: check cookie consent');
    if (!window.adobePrivacy || typeof window.adobePrivacy.activeCookieGroups !== 'function') {
      console.log('Privacy library not loaded yet, waiting for consent events');
      return;
    }

    const activeGroups = window.adobePrivacy.activeCookieGroups();
    console.log('Active consent groups:', activeGroups);
    
    // Check if user gave permission for performance/analytics tracking (C0002)
    if (activeGroups.indexOf('C0002') !== -1) {
      console.log('Performance consent granted - loading Adobe Experience Platform');
      loadAep();
    } else {
      console.log('Performance consent not granted - Adobe Experience Platform will not be loaded');
    }
  }

  if (activeGroups.indexOf('C0002') !== -1) {
    console.log('Performance consent granted - loading Adobe Experience Platform');
  } else {
    console.log('Performance consent not granted - Adobe Experience Platform will not be loaded');
  }

  // Listen for consent events from the privacy library
  window.addEventListener('adobePrivacy:PrivacyConsent', () => {
    console.log('Event: User accepted all consent');
    checkConsent();
  });

  window.addEventListener('adobePrivacy:PrivacyCustom', () => {
    console.log('Event: User customized consent preferences');
    checkConsent();
  });

  window.addEventListener('adobePrivacy:PrivacyReject', () => {
    console.log('Event: User rejected optional consent');
    checkConsent();
  });

  // Check immediately if privacy library already loaded (return visitor)
  if (window.adobePrivacy && typeof window.adobePrivacy.activeCookieGroups === 'function') {
    console.log('Privacy library already available, checking consent immediately');
    checkConsent();
  }

  loadIms();
  
  // Load Algolia search scripts
  addExtraScriptWithLoad(
    document.body,
    "https://cdn.jsdelivr.net/npm/algoliasearch@5.20.1/dist/lite/builds/browser.umd.js",
    () => {
      addExtraScriptWithLoad(
        document.body,
        "https://cdn.jsdelivr.net/npm/instantsearch.js@4.77.3/dist/instantsearch.production.min.js",
        () => {
          const { liteClient: algoliasearch } = window["algoliasearch/lite"];

          if (!algoliasearch || !instantsearch) {
            console.error("Required search libraries not loaded");
            return;
          }else{
            console.log("Algolia InstantSearch loaded successfully!")
          }

          // Trigger index validation after Algolia is loaded
          if (window.adp_search && window.adp_search.triggerIndexValidation) {
            window.adp_search.triggerIndexValidation();
          }
        }
      );
    }
  );

  //load search and product map
  window.adp_search = {};
  
  try {
    const resp = await fetch('/franklin_assets/product-index-map.json');
    if (!resp.ok) {
      // Server responded but with an error status
      console.error(`Failed to load product map: ${resp.status} ${resp.statusText}`);
      window.adp_search.completeProductMap = null;
    } else {
      const json = await resp.json();
      window.adp_search.product_index_map = json.data;

      // Create a new Map to hold the indexName and productName pairs
      window.adp_search.index_mapping = new Map();

      // Iterate over the product_index_map array and populate the Map
      window.adp_search.product_index_map.forEach((product) => {
        window.adp_search.index_mapping.set(product.indexName, {
            productName: product.productName,
            indexPathPrefix: product.indexPathPrefix
        });
      });
      window.adp_search.completeProductMap = Object.fromEntries(window.adp_search.index_mapping);
    }
  } catch (error) {
    // Network error or JSON parsing error
    window.adp_search.completeProductMap = null;
    console.error('Error fetching product map:', error);
  }

  window.adp_search.APP_KEY = 'E642SEDTHL';
  window.adp_search.API_KEY = '424b546ba7ae75391585a10c6ea38dab';
  window.adp_search.map_found = true;

  //if no map found then don't initialze search at all
  if(!window.adp_search.completeProductMap){
    window.adp_search.map_found = false;
  }else{
    // Create initial mappings (will be updated after validation)
    const allIndices = Object.keys(window.adp_search.completeProductMap);
    window.adp_search.indices = allIndices;
    window.adp_search.index_to_product = Object.fromEntries(
      Object.entries(window.adp_search.completeProductMap).map(([indexName, { productName }]) => [indexName, productName])
    );
    window.adp_search.path_prefix_to_product = Object.fromEntries(
        Object.values(window.adp_search.completeProductMap).map(({ indexPathPrefix, productName }) => [indexPathPrefix, productName])
    );
    window.adp_search.products = Array.from(
        new Set(Object.values(window.adp_search.completeProductMap).map(data => data.productName))
    );

    // Function to validate if an index exists in Algolia
    async function validateIndex(indexName, searchClient) {
      try {
        // Perform a search to validate the index exists
        const response = await searchClient.search({
          requests: [{
            indexName: indexName,
            query: '',
            hitsPerPage: 0
          }]
        });
        
        if (response && response.results && response.results.length > 0) {
          return { indexName, exists: true };
        } else {
          console.warn(`Index "${indexName}" returned empty results`);
          return { indexName, exists: false };
        }
      } catch (error) {
        console.warn(`Index "${indexName}" is not accessible or does not exist:`, error.message);
        return { indexName, exists: false };
      }
    }

    // Validate all indices in parallel
    async function validateAndFilterIndices() {
      if (!window["algoliasearch/lite"]) {
        console.error('Algolia not loaded, cannot validate indices');
        return allIndices;
      }

      const { liteClient: algoliasearch } = window["algoliasearch/lite"];
      const searchClient = algoliasearch(window.adp_search.APP_KEY, window.adp_search.API_KEY);

      // console.log(`Validating ${allIndices.length} indices...`);
      const validationResults = await Promise.allSettled(
        allIndices.map(indexName => validateIndex(indexName, searchClient))
      );

      // Filter to only include indices that exist
      const validIndices = validationResults
        .filter(result => result.status === 'fulfilled' && result.value.exists)
        .map(result => result.value.indexName);

      const removedIndices = allIndices.filter(idx => !validIndices.includes(idx));
      
      if (removedIndices.length > 0) {
        console.log(`Removed ${removedIndices.length} non-existent indices:`, removedIndices);
      }
      return validIndices;
    }

    window.adp_search.triggerIndexValidation = function() {
      window.adp_search.indicesValidationPromise = validateAndFilterIndices();

      window.adp_search.indicesValidationPromise.then(validIndices => {
        // Only update if validation actually removed some indices
        if (validIndices.length < allIndices.length) {
          const validProductMap = {};
          validIndices.forEach(indexName => {
            if (window.adp_search.completeProductMap[indexName]) {
              validProductMap[indexName] = window.adp_search.completeProductMap[indexName];
            }
          });

          // Update all maps with validated indices
          window.adp_search.completeProductMap = validProductMap;
          window.adp_search.indices = validIndices;
          window.adp_search.index_to_product = Object.fromEntries(
            Object.entries(validProductMap).map(([indexName, { productName }]) => [indexName, productName])
          );
          window.adp_search.path_prefix_to_product = Object.fromEntries(
            Object.values(validProductMap).map(({ indexPathPrefix, productName }) => [indexPathPrefix, productName])
          );
          window.adp_search.products = Array.from(
            new Set(Object.values(validProductMap).map(data => data.productName))
          );
        }
      }).catch(error => {
        console.error('Error during index validation:', error);
      });
    };

    // Initialize promise as unresolved
    window.adp_search.indicesValidationPromise = null;
  }

  if (window.adobeImsFactory && window.adobeImsFactory.createIMSLib) {
    window.adobeImsFactory.createIMSLib(window.adobeid);
  }

  if (window.adobeIMS && window.adobeIMS.initialize) {
    window.adobeIMS.initialize();
  }

  await loadBlocks(main);

  loadHeader(doc.querySelector('header'));
  await decorateIcons(main);
  loadFooter(doc.querySelector('footer'));

  if (IS_DEV_DOCS) {
    // rearrange footer and append to main when in doc mode
    const footer = doc.querySelector('footer');
    footer.style.gridArea = 'footer';
    main.append(footer);

    const hasHero = Boolean(document.querySelector('.herosimple, .superhero'));
    if (hasHero) {
      buildHero(main);
    }

    const hasResources = Boolean(document.querySelector('.resources-wrapper'));
    const hasHeading = main.querySelectorAll('h2:not(.side-nav h2):not(footer h2), h3:not(.side-nav h3):not(footer h3)').length !== 0;
    const hasOnThisPage = !hasHero && hasHeading;

    const hasAside = hasOnThisPage || hasResources;
    if (hasAside) {
      buildAside(main);
    } else {
      main.classList.add('no-aside');
    }

    if (hasOnThisPage) {
      buildOnThisPage(main);
      loadOnThisPage(doc.querySelector('.onthispage-wrapper'));
    }

    if(document.querySelector('.side-nav-subpages-section')) {
      buildNextPrev(main);
      loadNextPrev(doc.querySelector('.next-prev-wrapper'));
    }

    if (hasResources) {
      buildResources(main);
    }
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon('/hlx_statics/icons/adobe.svg');
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));

  scrollToHash(doc);

  if (window.location.hostname.endsWith('hlx.page') || window.location.hostname === ('localhost')) {
    // eslint-disable-next-line import/no-cycle
    import('../../tools/preview/experimentation-preview.js');
  }
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
  if (IS_DEV_DOCS) {
    githubActionsBlock(document);
  }

}

function loadTitle() {
    if (!IS_DEV_DOCS) {
      // Use the first H1 that doesn't contain an image as the title
      const h1Elements = document.querySelectorAll('h1');
      let titleFromH1 = null;

      for (const h1 of h1Elements) {
        // Check if this H1 contains an image
        const hasImage = h1.querySelector('img');
        if (!hasImage) {
          // Use the text content of this H1 (no HTML tags)
          titleFromH1 = h1.textContent.trim();
          break; // Use the first H1 without an image
        }
      }
      if (titleFromH1) {
        document.title = titleFromH1;
      }
    } else if (!document.title || document.title === '') {
      // Fallback to URL if no suitable H1 found
      document.title = window.location.href;
    }
}

function loadPrism(document) {
  const codeBlocks = document.querySelectorAll('code[class*="language-"], [class*="language-"] code');
  if (!codeBlocks.length) return;

  let prismLoaded = false;
  let firstCodeBlock = true;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;

      if (!prismLoaded) {
        prismLoaded = true;
        window.Prism = { manual: true };
        loadCSS(`${window.hlx.codeBasePath}/styles/prism.css`);
        import('./prism.js').then(() => {
          // Ensure Prism autoloader knows where to fetch language components
          if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
            window.Prism.plugins.autoloader.languages_path = '/hlx_statics/scripts/prism-grammars/';
            window.Prism.plugins.autoloader.use_minified = true;
          }
          // Run highlighting without Web Workers (avoids missing filename with dynamic import)
          window.Prism.highlightAll();
          // Re-highlight when tab panels become active (without modifying tab block)
          try {
            const observer = new MutationObserver((mutations) => {
              for (const m of mutations) {
                if (m.type === 'attributes') {
                  const el = m.target;
                  if (!(el instanceof HTMLElement)) continue;
                  if (!el.classList || m.attributeName !== 'class') continue;
                  const isActive = el.classList.contains('active');
                  const isPanel = el.matches && el.matches('.tab-content, .sub-tab-content');
                  const isCodeblockPanel = el.matches && el.matches('[role="tabpanel"]');
                  const isNowVisible = isCodeblockPanel && !el.classList.contains('hidden');

                  if (isActive && isPanel && window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
                    window.Prism.highlightAllUnder(el);
                  } else if (isNowVisible && window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
                    // Handle codeblock panels that become visible (not hidden)
                    window.Prism.highlightAllUnder(el);
                  } else if (isActive && el.matches && el.matches('.tabs-wrapper, .sub-content-wrapper')) {
                    // If a wrapper toggled, highlight any active panels inside
                    el.querySelectorAll('.tab-content.active, .sub-tab-content.active').forEach((panel) => {
                      window.Prism.highlightAllUnder(panel);
                    });
                  }
                } else if (m.type === 'childList') {
                  // New nodes added: only highlight if they contain code blocks with language classes
                  m.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;
                    const hasCodeBlocks = node.querySelector && node.querySelector('code[class*="language-"], [class*="language-"] code');
                    if (hasCodeBlocks && window.Prism && typeof window.Prism.highlightAllUnder === 'function') {
                      window.Prism.highlightAllUnder(node);
                    }
                  });
                }
              }
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
          } catch (e) {
            console.error('Error loading Prism:', e);
           }
        }).catch(console.error);
      }

      const pre = target.closest('pre');
      if (firstCodeBlock && pre) {
        pre.classList.add('prism-loading');
        setTimeout(() => pre.classList.remove('prism-loading'), 300);
        firstCodeBlock = false;
      }

      observer.unobserve(target);
    });
  }, { rootMargin: '200px 0px', threshold: 0.1 });

  codeBlocks.forEach((block) => observer.observe(block));
}

function scrollToHash(doc) {
  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (element) {    
    if (document.readyState === 'complete') {
      scrollWithLayoutAdjustment(element);
    } else {
      window.addEventListener('load', () => scrollWithLayoutAdjustment(element));
    }
  }
}

function fixLocalDev(document){
  if(isLocalHostEnvironment(window.location.host)){
    // replace all images with eds div structure
    document.querySelectorAll('img').forEach((img) => {
      if(img.src.includes('raw.githubusercontent.com')) {
        const lastDotIndex = img.src.lastIndexOf('.');
        let imageExtension = '';
        if (lastDotIndex !== -1) {
          imageExtension= img.src.substring(lastDotIndex + 1);
        }

        let picture = createTag('picture');
        let source = createTag('source', { type: `image/${imageExtension}`, srcset: `${img.src}?width=2000&amp;format=png&amp;optimize=medium`, media: `media="(min-width: 600px)`});
        let image = createTag('img', { alt: img.alt, src: img.src});

        picture.appendChild(source);
        picture.appendChild(image);
        img.replaceWith(picture);
      }
    });
  }
}
async function loadPage() {
  fixLocalDev(document);
  await loadEager(document);
  await loadLazy(document);
  loadPrism(document);
  loadTitle();
  loadDelayed(document);
}

loadPage();
