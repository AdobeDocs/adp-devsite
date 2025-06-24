import {
  sampleRUM,
  buildBlock,
  decorateBlock,
  loadBlock,
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
  buildGridAreaMain,
  buildHeadings,
  buildSideNav,
  buildOnThisPage,
  createTag,
  toggleScale,
  decorateAnchorLink,
  decorateInlineCodes,
  decorateNestedCodes,
  isHlxPath,
  decorateProfile,
  isStageEnvironment,
  isProdEnvironment,
  addExtraScript,
  addExtraScriptWithLoad,
  decorateHR,
  buildNextPrev
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
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateInlineCodes(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateNestedCodes(main);
  decorateHR(main);
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

  if (IS_DEV_DOCS) {
    // check if this page is from dev docs, then change the main container to white background.
    const mainContainer = document.querySelector('main');
    mainContainer.classList.add('dev-docs', 'white-background');

    buildGrid(main);
    buildSideNav(main);
    buildBreadcrumbs(main);
  }

  document.body.classList.add('appear');
  loadConfig();
}

const imsSignIn = new Event('imsSignIn');

function setIMSParams(client_id, scope, environment, logsEnabled, resolve, reject, timeout) {
  window.adobeid = {
    client_id: client_id,
    scope: scope,
    locale: 'en_US',
    environment: environment,
    useLocalStorage: true,
    logsEnabled: logsEnabled,
    redirect_uri: window.location.href,
    isSignedIn: false,
    onReady: () => {
      if (window.adobeIMSMethods.isSignedIn()) {
        window.dispatchEvent(imsSignIn);
        window.adobeIMSMethods.getProfile();
      }
      console.log('Adobe IMS Ready!');
      resolve(); // resolve the promise, consumers can now use window.adobeIMS
      clearTimeout(timeout);
    },
    onError: reject,
  };
}

async function fetchProfileAvatar(userId) {
  try {
    const req = await fetch(`https://cc-api-behance.adobe.io/v2/users/${userId}?api_key=SUSI2`);
    if (req) {
      const res = await req.json();
      const avatarUrl = res?.user?.images?.['138'] ?? '/hlx_statics/icons/avatar.svg';
      if (document.querySelector('#nav-profile-popover-avatar-img')) {
        document.querySelector('#nav-profile-popover-avatar-img').src = avatarUrl;
      }

      const profileButton = document.querySelector('#nav-profile-dropdown-button');
      if (profileButton.querySelector('svg')) {
        profileButton.querySelector('svg').remove();
      }
      profileButton.innerHTML = `
        <div class="nav-profile-popover-avatar-button">
          <img alt="Avatar" src=${avatarUrl} alt="Profile avatar" />
        </div>
      `;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e);
  }
}

//is this the right place to add the IMS Methods?
window.adobeIMSMethods = {
  isSignedIn: () => window.adobeIMS.isSignedInUser(),
  signIn: () => {
    window.adobeIMS.signIn();
  },
  signOut() {
    window.adobeIMS.signOut({});
  },
  getProfile() {
    window.adobeIMS.getProfile().then((profile) => {
      window.adobeid.profile = profile;
      window.adobeid.profile.avatarUrl = '/hlx_statics/icons/avatar.svg';
      decorateProfile(window.adobeid.profile);
      fetchProfileAvatar(window.adobeid.profile.userId);
    })
      .catch((ex) => {
        window.adobeid.profile = ex;
      });
  },
};

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
  window.REDOCLY = `eyJ0IjpmYWxzZSwiaSI6MTczMjEzNzQzNSwiZSI6MTc1OTI2NTQxNywiaCI6WyJyZWRvYy5seSIsImRldmVsb3Blci5hZG9iZS5jb20iLCJkZXZlbG9wZXItc3RhZ2UuYWRvYmUuY29tIiwiZGV2ZWxvcGVyLmZyYW1lLmlvIiwiZGV2ZWxvcGVyLmRldi5mcmFtZS5pbyIsImxvY2FsaG9zdC5jb3JwLmFkb2JlLmNvbSIsInJlZG9jbHktYXBpLWJsb2NrLS1hZHAtZGV2c2l0ZS0tYWRvYmVkb2NzLmFlbS5wYWdlIiwiZGV2ZWxvcGVyLWRldi5hZG9iZS5jb20iXSwicyI6InBvcnRhbCJ9.gf0tCrK+ApckZEqbuOlYJFlt19NU6UEWpiruC4VIMg9ZYUojkyDGde2aEKpBK2cm57r6yNNFNWHyIRljWAQnsg==`;

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

  loadIms();
  loadAep();
  
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
          // const searchClient = algoliasearch("E642SEDTHL", "424b546ba7ae75391585a10c6ea38dab");

          if (!algoliasearch || !instantsearch) {
            console.error("Required search libraries not loaded");
            return;
          }else{
            console.log("Algolia InstantSearch loaded successfully!")
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
      window.adp_search.completeProductMap = {
        "after-effects": {
            "productName": "Adobe After Effects",
            "indexPathPrefix": "/after-effects/"
        },
        "analytics-2.0-apis": {
            "productName": "Adobe Analytics",
            "indexPathPrefix": "/analytics-apis/docs/2.0/"
        },
        "animate": {
            "productName": "Adobe Animate",
            "indexPathPrefix": "/animate/"
        },
        "audition": {
            "productName": "Adobe Audition",
            "indexPathPrefix": "/audition/"
        },
        "bridge": {
            "productName": "Adobe Bridge",
            "indexPathPrefix": "/bridge/"
        },
        "cloudmanager-api-docs": {
            "productName": "Adobe Cloud Manager",
            "indexPathPrefix": "/experience-cloud/cloud-manager/"
        },
        "experience-manager-apis": {
            "productName": "Adobe Cloud Manager",
            "indexPathPrefix": "/experience-cloud/experience-manager-apis/"
        },
        "adobe-assurance-public-apis": {
            "productName": "Adobe Cloud Manager",
            "indexPathPrefix": "/adobe-assurance-public-apis/"
        },
        "commerce-marketplace": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/marketplace/"
        },
        "commerce-contributor": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/contributor/"
        },
        "commerce-cloud-tools": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/cloud-tools/"
        },
        "commerce-webapi": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/webapi/"
        },
        "commerce-php": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/php/"
        },
        "commerce-services": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/services/"
        },
        "commerce-frontend-core": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/frontend-core/"
        },
        "commerce-admin-developer": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/admin-developer/"
        },
        "commerce-xd-kits": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce-xd-kits/"
        },
        "commerce-pwa-studio": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/pwa-studio/"
        },
        "franklin-commerce": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/"
        },
        "commerce-testing": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/testing/"
        },
        "commerce-extensibility": {
            "productName": "Adobe Commerce",
            "indexPathPrefix": "/commerce/extensibility/"
        },
        "cc-developer-platform-pages": {
            "productName": "Adobe Creative Cloud",
            "indexPathPrefix": "/creative-cloud/"
        },
        "creative-cloud-libraries": {
            "productName": "Adobe Creative Cloud",
            "indexPathPrefix": "/creative-cloud-libraries/"
        },
        "cc-libraries-api": {
            "productName": "Adobe Creative Cloud",
            "indexPathPrefix": "/creative-cloud-libraries/docs/"
        },
        "cja-apis": {
            "productName": "Adobe Customer Journey Analytics",
            "indexPathPrefix": "/cja-apis/docs/"
        },
        "cpp-at-adobe": {
            "productName": "Adobe C++",
            "indexPathPrefix": "/cpp/"
        },
        "app-builder": {
            "productName": "Adobe Developer App Builder",
            "indexPathPrefix": "/app-builder/docs/"
        },
        "app-builder-template-registry": {
            "productName": "Adobe Developer App Builder",
            "indexPathPrefix": "/app-builder-template-registry/"
        },
        "graphql-mesh-gateway": {
            "productName": "Adobe Developer App Builder",
            "indexPathPrefix": "/graphql-mesh-gateway/"
        },
        "franklin-app-builder": {
            "productName": "Adobe Developer App Builder",
            "indexPathPrefix": "/app-builder/"
        },
        "franklin-adobe-dev-console": {
            "productName": "Adobe Developer Console",
            "indexPathPrefix": "/developer-console/"
        },
        "franklin-developer-distribute": {
            "productName": "Adobe Developer Distribution",
            "indexPathPrefix": "/developer-distribution/creative-cloud/"
        },
        "developer-distribute": {
            "productName": "Adobe Developer Distribution",
            "indexPathPrefix": "/developer-distribution/creative-cloud/docs/"
        },
        "Developer-Distribution-Experience-Cloud": {
            "productName": "Adobe Developer Distribution",
            "indexPathPrefix": "/developer-distribution/experience-cloud/docs/"
        },
        "dep": {
            "productName": "Adobe Developer Enablement",
            "indexPathPrefix": "/dep/"
        },
        "franklin-sign-api": {
            "productName": "Adobe Document Services",
            "indexPathPrefix": "/adobesign-api/"
        },
        "document-services": {
            "productName": "Adobe Document Services",
            "indexPathPrefix": "/document-services/"
        },
        "pdfservices-api-documentation": {
            "productName": "Adobe Document Services",
            "indexPathPrefix": "/document-services/docs/"
        },
        "dreamweaver": {
            "productName": "Adobe Dreamweaver",
            "indexPathPrefix": "/dreamweaver/"
        },
        "franklin-umapi": {
            "productName": "Adobe Experience Manager",
            "indexPathPrefix": "/umapi/"
        },
        "franklin-audience-manager": {
            "productName": "Adobe Experience Manager",
            "indexPathPrefix": "/audience-manager/"
        },
        "aem-developer-materials": {
            "productName": "Adobe Experience Manager",
            "indexPathPrefix": "/experience-manager/reference-materials/"
        },
        "experience-manager-forms-cloud-service-developer-reference": {
            "productName": "Adobe Experience Manager",
            "indexPathPrefix": "/experience-manager-forms-cloud-service-developer-reference/"
        },
        "aep-mobile-sdkdocs": {
            "productName": "Adobe Experience Platform",
            "indexPathPrefix": "/client-sdks/"
        },
        "experience-platform-apis": {
            "productName": "Adobe Experience Platform",
            "indexPathPrefix": "/experience-platform-apis/"
        },
        "express-for-developers": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express/"
        },
        "create-embed-sdk": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express/embed-sdk/"
        },
        "cc-everywhere": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express/embed-sdk/docs/"
        },
        "express-add-ons": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express/add-ons/"
        },
        "express-add-ons-docs": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express/add-ons/docs/"
        },
        "express-add-on-apis": {
            "productName": "Adobe Express",
            "indexPathPrefix": "/express-add-on-apis/docs/"
        },
        "ff-services": {
            "productName": "Adobe Firefly",
            "indexPathPrefix": "/firefly-services/"
        },
        "ff-services-docs": {
            "productName": "Adobe Firefly",
            "indexPathPrefix": "/firefly-services/docs/"
        },
        "firefly-api-docs": {
            "productName": "Adobe Firefly",
            "indexPathPrefix": "/firefly-api/"
        },
        "frameio-api": {
            "productName": "Adobe Frame.io",
            "indexPathPrefix": "/frameio/"
        },
        "g11n-gcs": {
            "productName": "Adobe Globalization",
            "indexPathPrefix": "/gcs/"
        },
        "adobe-io-events": {
            "productName": "Adobe I/O",
            "indexPathPrefix": "/events/docs/"
        },
        "franklin-adobe-io-events": {
            "productName": "Adobe I/O",
            "indexPathPrefix": "/events/"
        },
        "adobe-io-runtime": {
            "productName": "Adobe I/O",
            "indexPathPrefix": "/runtime/docs"
        },
        "franklin-adobe-io-runtime": {
            "productName": "Adobe I/O",
            "indexPathPrefix": "/runtime/"
        },
        "illustrator": {
            "productName": "Adobe Illustrator",
            "indexPathPrefix": "/illustrator/"
        },
        "indesign": {
            "productName": "Adobe InDesign",
            "indexPathPrefix": "/indesign/"
        },
        "uxp-indesign": {
            "productName": "Adobe InDesign",
            "indexPathPrefix": "/indesign/uxp/"
        },
        "uxp-indesign-18-uxp": {
            "productName": "Adobe InDesign",
            "indexPathPrefix": "/indesign/uxp/reference/"
        },
        "indesign-18-dom": {
            "productName": "Adobe InDesign",
            "indexPathPrefix": "/indesign/dom/"
        },
        "journey-optimizer-apis": {
            "productName": "Adobe Journey Optimizer",
            "indexPathPrefix": "/journey-optimizer-apis/"
        },
        "franklin-lightroom": {
            "productName": "Adobe Lightroom",
            "indexPathPrefix": "/lightroom/"
        },
        "lightroom-public-apis": {
            "productName": "Adobe Lightroom",
            "indexPathPrefix": "/lightroom/lightroom-api-docs/"
        },
        "lightroom-classic": {
            "productName": "Adobe Lightroom",
            "indexPathPrefix": "/lightroom-classic/"
        },
        "marketo-apis": {
            "productName": "Adobe Marketo",
            "indexPathPrefix": "/marketo-apis/"
        },
        "photoshop": {
            "productName": "Adobe Photoshop",
            "indexPathPrefix": "/photoshop/"
        },
        "uxp-photoshop": {
            "productName": "Adobe Photoshop",
            "indexPathPrefix": "/photoshop/uxp/2022/"
        },
        "uxp-photoshop-2021": {
            "productName": "Adobe Photoshop",
            "indexPathPrefix": "/photoshop/uxp/2021/"
        },
        "cis-photoshop-api-docs": {
            "productName": "Adobe Photoshop",
            "indexPathPrefix": "/photoshop/photoshop-api-docs/"
        },
        "photoshop-api": {
            "productName": "Adobe Photoshop",
            "indexPathPrefix": "/photoshop/api/"
        },
        "premiere-pro": {
            "productName": "Adobe Premiere Pro",
            "indexPathPrefix": "/premiere-pro/"
        },
        "adobe-status": {
            "productName": "Adobe Status",
            "indexPathPrefix": "/adobe-status/"
        },
        "stock": {
            "productName": "Adobe Stock",
            "indexPathPrefix": "/stock/"
        },
        "stock-api-docs": {
            "productName": "Adobe Stock",
            "indexPathPrefix": "/stock/docs/"
        },
        "substance-3d-automation": {
            "productName": "Adobe Substance 3D",
            "indexPathPrefix": "/substance-3d-automation/docs/"
        },
        "franklin-substance-3d-automation": {
            "productName": "Adobe Substance 3D",
            "indexPathPrefix": "/substance-3d-automation/"
        },
        "franklin-substance-3d": {
            "productName": "Adobe Substance 3D",
            "indexPathPrefix": "/substance3d/"
        },
        "franklin-substance-3d-sdk": {
            "productName": "Adobe Substance 3D",
            "indexPathPrefix": "/substance3d-sdk/"
        },
        "target-developers": {
            "productName": "Adobe Target",
            "indexPathPrefix": "/target/"
        },
        "VIPMP": {
            "productName": "Adobe VIP Marketplace",
            "indexPathPrefix": "/vipmp/"
        },
        "workfront-api-explorer": {
            "productName": "Adobe Workfront",
            "indexPathPrefix": "/workfront/api-explorer/"
        },
        "xd": {
            "productName": "Adobe XD",
            "indexPathPrefix": "/xd/"
        },
        "uxp-xd": {
            "productName": "Adobe XD",
            "indexPathPrefix": "/xd/uxp/"
        },
        "xmp-docs": {
            "productName": "Adobe XMP",
            "indexPathPrefix": "/xmp/docs/"
        },
        "uix": {
            "productName": "Adobe UI Extensibility",
            "indexPathPrefix": "/uix/docs/"
        }
    };
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
    console.error('Error fetching product map:', error);
    window.adp_search.completeProductMap = {
      "after-effects": {
          "productName": "Adobe After Effects",
          "indexPathPrefix": "/after-effects/"
      },
      "analytics-2.0-apis": {
          "productName": "Adobe Analytics",
          "indexPathPrefix": "/analytics-apis/docs/2.0/"
      },
      "animate": {
          "productName": "Adobe Animate",
          "indexPathPrefix": "/animate/"
      },
      "audition": {
          "productName": "Adobe Audition",
          "indexPathPrefix": "/audition/"
      },
      "bridge": {
          "productName": "Adobe Bridge",
          "indexPathPrefix": "/bridge/"
      },
      "cloudmanager-api-docs": {
          "productName": "Adobe Cloud Manager",
          "indexPathPrefix": "/experience-cloud/cloud-manager/"
      },
      "experience-manager-apis": {
          "productName": "Adobe Cloud Manager",
          "indexPathPrefix": "/experience-cloud/experience-manager-apis/"
      },
      "adobe-assurance-public-apis": {
          "productName": "Adobe Cloud Manager",
          "indexPathPrefix": "/adobe-assurance-public-apis/"
      },
      "commerce-marketplace": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/marketplace/"
      },
      "commerce-contributor": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/contributor/"
      },
      "commerce-cloud-tools": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/cloud-tools/"
      },
      "commerce-webapi": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/webapi/"
      },
      "commerce-php": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/php/"
      },
      "commerce-services": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/services/"
      },
      "commerce-frontend-core": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/frontend-core/"
      },
      "commerce-admin-developer": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/admin-developer/"
      },
      "commerce-xd-kits": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce-xd-kits/"
      },
      "commerce-pwa-studio": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/pwa-studio/"
      },
      "franklin-commerce": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/"
      },
      "commerce-testing": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/testing/"
      },
      "commerce-extensibility": {
          "productName": "Adobe Commerce",
          "indexPathPrefix": "/commerce/extensibility/"
      },
      "cc-developer-platform-pages": {
          "productName": "Adobe Creative Cloud",
          "indexPathPrefix": "/creative-cloud/"
      },
      "creative-cloud-libraries": {
          "productName": "Adobe Creative Cloud",
          "indexPathPrefix": "/creative-cloud-libraries/"
      },
      "cc-libraries-api": {
          "productName": "Adobe Creative Cloud",
          "indexPathPrefix": "/creative-cloud-libraries/docs/"
      },
      "cja-apis": {
          "productName": "Adobe Customer Journey Analytics",
          "indexPathPrefix": "/cja-apis/docs/"
      },
      "cpp-at-adobe": {
          "productName": "Adobe C++",
          "indexPathPrefix": "/cpp/"
      },
      "app-builder": {
          "productName": "Adobe Developer App Builder",
          "indexPathPrefix": "/app-builder/docs/"
      },
      "app-builder-template-registry": {
          "productName": "Adobe Developer App Builder",
          "indexPathPrefix": "/app-builder-template-registry/"
      },
      "graphql-mesh-gateway": {
          "productName": "Adobe Developer App Builder",
          "indexPathPrefix": "/graphql-mesh-gateway/"
      },
      "franklin-app-builder": {
          "productName": "Adobe Developer App Builder",
          "indexPathPrefix": "/app-builder/"
      },
      "franklin-adobe-dev-console": {
          "productName": "Adobe Developer Console",
          "indexPathPrefix": "/developer-console/"
      },
      "franklin-developer-distribute": {
          "productName": "Adobe Developer Distribution",
          "indexPathPrefix": "/developer-distribution/creative-cloud/"
      },
      "developer-distribute": {
          "productName": "Adobe Developer Distribution",
          "indexPathPrefix": "/developer-distribution/creative-cloud/docs/"
      },
      "Developer-Distribution-Experience-Cloud": {
          "productName": "Adobe Developer Distribution",
          "indexPathPrefix": "/developer-distribution/experience-cloud/docs/"
      },
      "dep": {
          "productName": "Adobe Developer Enablement",
          "indexPathPrefix": "/dep/"
      },
      "franklin-sign-api": {
          "productName": "Adobe Document Services",
          "indexPathPrefix": "/adobesign-api/"
      },
      "document-services": {
          "productName": "Adobe Document Services",
          "indexPathPrefix": "/document-services/"
      },
      "pdfservices-api-documentation": {
          "productName": "Adobe Document Services",
          "indexPathPrefix": "/document-services/docs/"
      },
      "dreamweaver": {
          "productName": "Adobe Dreamweaver",
          "indexPathPrefix": "/dreamweaver/"
      },
      "franklin-umapi": {
          "productName": "Adobe Experience Manager",
          "indexPathPrefix": "/umapi/"
      },
      "franklin-audience-manager": {
          "productName": "Adobe Experience Manager",
          "indexPathPrefix": "/audience-manager/"
      },
      "aem-developer-materials": {
          "productName": "Adobe Experience Manager",
          "indexPathPrefix": "/experience-manager/reference-materials/"
      },
      "experience-manager-forms-cloud-service-developer-reference": {
          "productName": "Adobe Experience Manager",
          "indexPathPrefix": "/experience-manager-forms-cloud-service-developer-reference/"
      },
      "aep-mobile-sdkdocs": {
          "productName": "Adobe Experience Platform",
          "indexPathPrefix": "/client-sdks/"
      },
      "experience-platform-apis": {
          "productName": "Adobe Experience Platform",
          "indexPathPrefix": "/experience-platform-apis/"
      },
      "express-for-developers": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express/"
      },
      "create-embed-sdk": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express/embed-sdk/"
      },
      "cc-everywhere": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express/embed-sdk/docs/"
      },
      "express-add-ons": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express/add-ons/"
      },
      "express-add-ons-docs": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express/add-ons/docs/"
      },
      "express-add-on-apis": {
          "productName": "Adobe Express",
          "indexPathPrefix": "/express-add-on-apis/docs/"
      },
      "ff-services": {
          "productName": "Adobe Firefly",
          "indexPathPrefix": "/firefly-services/"
      },
      "ff-services-docs": {
          "productName": "Adobe Firefly",
          "indexPathPrefix": "/firefly-services/docs/"
      },
      "firefly-api-docs": {
          "productName": "Adobe Firefly",
          "indexPathPrefix": "/firefly-api/"
      },
      "frameio-api": {
          "productName": "Adobe Frame.io",
          "indexPathPrefix": "/frameio/"
      },
      "g11n-gcs": {
          "productName": "Adobe Globalization",
          "indexPathPrefix": "/gcs/"
      },
      "adobe-io-events": {
          "productName": "Adobe I/O",
          "indexPathPrefix": "/events/docs/"
      },
      "franklin-adobe-io-events": {
          "productName": "Adobe I/O",
          "indexPathPrefix": "/events/"
      },
      "adobe-io-runtime": {
          "productName": "Adobe I/O",
          "indexPathPrefix": "/runtime/docs"
      },
      "franklin-adobe-io-runtime": {
          "productName": "Adobe I/O",
          "indexPathPrefix": "/runtime/"
      },
      "illustrator": {
          "productName": "Adobe Illustrator",
          "indexPathPrefix": "/illustrator/"
      },
      "indesign": {
          "productName": "Adobe InDesign",
          "indexPathPrefix": "/indesign/"
      },
      "uxp-indesign": {
          "productName": "Adobe InDesign",
          "indexPathPrefix": "/indesign/uxp/"
      },
      "uxp-indesign-18-uxp": {
          "productName": "Adobe InDesign",
          "indexPathPrefix": "/indesign/uxp/reference/"
      },
      "indesign-18-dom": {
          "productName": "Adobe InDesign",
          "indexPathPrefix": "/indesign/dom/"
      },
      "journey-optimizer-apis": {
          "productName": "Adobe Journey Optimizer",
          "indexPathPrefix": "/journey-optimizer-apis/"
      },
      "franklin-lightroom": {
          "productName": "Adobe Lightroom",
          "indexPathPrefix": "/lightroom/"
      },
      "lightroom-public-apis": {
          "productName": "Adobe Lightroom",
          "indexPathPrefix": "/lightroom/lightroom-api-docs/"
      },
      "lightroom-classic": {
          "productName": "Adobe Lightroom",
          "indexPathPrefix": "/lightroom-classic/"
      },
      "marketo-apis": {
          "productName": "Adobe Marketo",
          "indexPathPrefix": "/marketo-apis/"
      },
      "photoshop": {
          "productName": "Adobe Photoshop",
          "indexPathPrefix": "/photoshop/"
      },
      "uxp-photoshop": {
          "productName": "Adobe Photoshop",
          "indexPathPrefix": "/photoshop/uxp/2022/"
      },
      "uxp-photoshop-2021": {
          "productName": "Adobe Photoshop",
          "indexPathPrefix": "/photoshop/uxp/2021/"
      },
      "cis-photoshop-api-docs": {
          "productName": "Adobe Photoshop",
          "indexPathPrefix": "/photoshop/photoshop-api-docs/"
      },
      "photoshop-api": {
          "productName": "Adobe Photoshop",
          "indexPathPrefix": "/photoshop/api/"
      },
      "premiere-pro": {
          "productName": "Adobe Premiere Pro",
          "indexPathPrefix": "/premiere-pro/"
      },
      "adobe-status": {
          "productName": "Adobe Status",
          "indexPathPrefix": "/adobe-status/"
      },
      "stock": {
          "productName": "Adobe Stock",
          "indexPathPrefix": "/stock/"
      },
      "stock-api-docs": {
          "productName": "Adobe Stock",
          "indexPathPrefix": "/stock/docs/"
      },
      "substance-3d-automation": {
          "productName": "Adobe Substance 3D",
          "indexPathPrefix": "/substance-3d-automation/docs/"
      },
      "franklin-substance-3d-automation": {
          "productName": "Adobe Substance 3D",
          "indexPathPrefix": "/substance-3d-automation/"
      },
      "franklin-substance-3d": {
          "productName": "Adobe Substance 3D",
          "indexPathPrefix": "/substance3d/"
      },
      "franklin-substance-3d-sdk": {
          "productName": "Adobe Substance 3D",
          "indexPathPrefix": "/substance3d-sdk/"
      },
      "target-developers": {
          "productName": "Adobe Target",
          "indexPathPrefix": "/target/"
      },
      "VIPMP": {
          "productName": "Adobe VIP Marketplace",
          "indexPathPrefix": "/vipmp/"
      },
      "workfront-api-explorer": {
          "productName": "Adobe Workfront",
          "indexPathPrefix": "/workfront/api-explorer/"
      },
      "xd": {
          "productName": "Adobe XD",
          "indexPathPrefix": "/xd/"
      },
      "uxp-xd": {
          "productName": "Adobe XD",
          "indexPathPrefix": "/xd/uxp/"
      },
      "xmp-docs": {
          "productName": "Adobe XMP",
          "indexPathPrefix": "/xmp/docs/"
      },
      "uix": {
          "productName": "Adobe UI Extensibility",
          "indexPathPrefix": "/uix/docs/"
      }
    };
  }

  window.adp_search.APP_KEY = 'E642SEDTHL';
  window.adp_search.API_KEY = '424b546ba7ae75391585a10c6ea38dab';

  // Extract indices
  window.adp_search.indices = Object.keys(window.adp_search.completeProductMap);

  // Create a mapping of indices to their respective products
  window.adp_search.index_to_product = Object.fromEntries(
    Object.entries(window.adp_search.completeProductMap).map(([indexName, { productName }]) => [indexName, productName])
  );

  // Create a mapping of path prefixes to their respective products
  window.adp_search.path_prefix_to_product = Object.fromEntries(
      Object.values(window.adp_search.completeProductMap).map(({ indexPathPrefix, productName }) => [indexPathPrefix, productName])
  );

  // Extract unique products
  window.adp_search.products = Array.from(
      new Set(Object.values(window.adp_search.completeProductMap).map(data => data.productName))
  );


  if (window.adobeImsFactory && window.adobeImsFactory.createIMSLib) {
    window.adobeImsFactory.createIMSLib(window.adobeid);
  }

  if (window.adobeIMS && window.adobeIMS.initialize) {
    window.adobeIMS.initialize();
  }

  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  decorateIcons(main);
  loadFooter(doc.querySelector('footer'));

  if (IS_DEV_DOCS) {
    // rearrange footer and append to main when in doc mode
    const footer = doc.querySelector('footer');
    footer.style.gridArea = 'footer';
    main.append(footer);

    const hasHero = Boolean(document.querySelector('.hero, .herosimple'));
    const hasHeading = main.querySelectorAll('h2:not(.side-nav h2):not(footer h2), h3:not(.side-nav h3):not(footer h3)').length !== 0;
    if (!hasHero && hasHeading) {
      buildOnThisPage(main);
      loadOnThisPage(doc.querySelector('.onthispage-wrapper'));
    } else {
      main.classList.add('no-onthispage');
    }

    if(document.querySelector('.side-nav-subpages-section')) {
      buildNextPrev(main);
      loadNextPrev(doc.querySelector('.next-prev-wrapper'));
    }

    buildGridAreaMain(main);
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon('/hlx_statics/icons/adobe.svg');
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));

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
  document.title = window.location.href;
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
          window.Prism.plugins.autoloader.languages_path = '/hlx_statics/scripts/prism-grammars/';
          window.Prism.highlightAll(true);
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

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadPrism(document);
  loadTitle();
  loadDelayed(document);
}

loadPage();
