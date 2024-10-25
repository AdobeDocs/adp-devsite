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
  toCamelCase,
  toClassName,
  githubActionsBlock,
} from './lib-helix.js';

import {
  buildCodes,
  buildEmbeds,
  buildHeadings,
  createTag,
  toggleScale,
  decorateAnchorLink,
  decorateInlineCodes,
  isHlxPath,
  decorateProfile,
  isStageEnvironment,
  addExtraScript,
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

const downIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
<rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M4,7.01a1,1,0,0,1,1.7055-.7055l3.289,3.286,3.289-3.286a1,1,0,0,1,1.437,1.3865l-.0245.0245L9.7,11.7075a1,1,0,0,1-1.4125,0L4.293,7.716A.9945.9945,0,0,1,4,7.01Z" />
</svg>`;

const rightIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18">
<rect id="Canvas" fill="#ff13dc" opacity="0" width="18" height="18" /><path class="fill" d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
</svg>`

function loadHeader(header) {
  const headerBlock = buildBlock('header', '');
  header.append(headerBlock);
  decorateBlock(headerBlock);
  loadBlock(headerBlock);
}

function loadFooter(footer) {
  const footerBlock = buildBlock('footer', '');
  footer.append(footerBlock);
  decorateBlock(footerBlock);
  loadBlock(footerBlock);
}

async function loadConfig() {
  let navPath;
  let pathPrefix;

  if(getMetadata('source') === 'github') {
    pathPrefix = getMetadata('pathprefix').replace('/', '');
    navPath = `${window.location.origin}/${pathPrefix}/config`;
    const resp = await fetch(`${navPath}.plain.html`);

    if (resp.ok) {
      const html = await resp.text();

      const updatedData = html.replace(/href="([^"]+)"/g, (match, url) => {

        // Avoid updating URLs that already contain the pathPrefix
        if (!url.startsWith(pathPrefix)) {
          if (url.endsWith('index.md')) {
            return `href="/${pathPrefix}/${url.replaceAll('index.md', '')}"`;
          }
          else if (url.endsWith('.md')) {
            return `href="/${pathPrefix}/${url.replaceAll('.md', '')}"`;
          }
          else {
            return `href="/${pathPrefix}/${url}"`;
          }
        }
        return match;
      });


      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(updatedData, "text/html");
      let topNavItems, sideNavItems;

      // TODO: normalise paths
      [...htmlDocument.querySelectorAll("p")].forEach((item) => {
        if (item.innerText === 'pages:') {
          topNavItems = item.parentElement.querySelector('ul');
          topNavItems.innerHTML = topNavItems.innerHTML.replaceAll('<p>', '').replaceAll('</p>', '');
        }

        if (item.innerText === 'subPages:') {
          sideNavItems = item.parentElement.querySelector('ul');

          sideNavItems.innerHTML = sideNavItems.innerHTML.replaceAll('<p>', '').replaceAll('</p>', '');

          function assignLayerNumbers(ul, layer = 1) {
            const listItems = ul.children;

            for (let i = 0; i < listItems.length; i++) {
              const li = listItems[i];

              if (layer === 1) {
                li.classList.add('header');
              }

              const getAnchorTag = li.querySelector('a');
              const childUl = li.querySelector('ul');

              li.setAttribute("role", "treeitem");
              li.setAttribute("aria-level", layer);

              if (getAnchorTag) {
                getAnchorTag.style.paddingLeft = `calc(${layer} * 12px)`;

                getAnchorTag.onclick = (e) => {
                  console.log('e', e)
                  localStorage.setItem('e','test')
                  e.preventDefault();
                  e.stopPropagation();
                  const isExpanded = li.getAttribute('aria-expanded') === 'true';
                
                  if (isExpanded) {
                    li.setAttribute('aria-expanded', false);
                    li.classList.remove('is-expanded', 'is-selected');
                    if (childUl) {
                      childUl.style.display = 'none';
                    }
                  } else {
                    li.setAttribute('aria-expanded', true);
                    li.classList.add('is-expanded');
                    if (childUl) {
                      childUl.style.display = 'block';
                    }
                    if (window.location.href === getAnchorTag.href) {
                      getAnchorTag.setAttribute("aria-current", "page");
                      li.classList.add('is-selected');
                      toggleParent(li, true);
                    }     
                  }
                  return false;
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
                  updateIcon(getAnchorTag, li.classList.contains('is-expanded'));
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
            return false
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

          function updateIcon(anchorTag, isExpanded) {
            const icon = isExpanded ? downIcon : rightIcon;
            if (!anchorTag.classList.contains('icon-added')) {
              anchorTag.innerHTML += icon;
              anchorTag.classList.add('icon-added');
            } else {
              anchorTag.innerHTML = anchorTag.innerHTML.replace(isExpanded ? rightIcon : downIcon, icon);
            }
          }

          assignLayerNumbers(sideNavItems);

        }
      });

      sessionStorage.setItem('topNav', topNavItems.innerHTML);
      sessionStorage.setItem('sideNav', sideNavItems.innerHTML);
    } else {
      // TODO: figure out what to do when config not present?
    }
  }
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

  if (getMetadata('template') === 'documentation') {
    main.style.display = 'grid';
    main.style.gridTemplateAreas = '"sidenav main" "sidenav footer"';
    main.style.gridTemplateColumns = '256px auto';
    let sideNavDiv = createTag('div', { class: 'section side-nav-container', style: 'grid-area: sidenav' });
    let sideNavWrapper = createTag('div', { class: 'side-nav-wrapper' });
    let sideNavBlock = createTag('div', { class: 'side-nav block', 'data-block-name': 'side-nav' });
    sideNavWrapper.append(sideNavBlock);
    sideNavDiv.append(sideNavWrapper);
    main.prepend(sideNavDiv);
  }

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
        window.marketingtech = {
          adobe: {
            launch: {
              property: 'global',
              environment: 'dev',
            },
            analytics: {
              additionalAccounts: 'pgeo1xxpnwadobeio-qa',
            },
          },
        };
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
        
        window.marketingtech = {
          adobe: {
            launch: {
              property: 'global',
              environment: 'dev',
            },
            analytics: {
              additionalAccounts: 'pgeo1xxpnwadobeio-qa',
            },
          },
        };
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

        window.marketingtech = {
          adobe: {
            launch: {
              property: 'global',
              environment: 'production',
            },
            analytics: {
              additionalAccounts: 'pgeo1xxpnwadobeio-prod',
            },
          },
        };
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
 * loads everything that doesn't need to be delayed.
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  
  loadIms();
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

  if (getMetadata('template') === 'documentation') {
    const sidenav = main.querySelector('.side-nav-container');
    if (sidenav) {
      // set whatever is the next section next to sidenav to be the documentation main content area
      sidenav.nextElementSibling.style.gridArea = 'main';
    }

    // rearrange footer and append to main when in doc mode
    const footer = doc.querySelector('footer');
    main.append(footer);
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

  // cookie preference
  window.fedsConfig = {
    privacy: {
      // TODO config from adobe.com
      otDomainId: '7a5eb705-95ed-4cc4-a11d-0cc5760e93db',
      footerLinkSelector: '#openPrivacy',
    },
  };
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed(document);
  githubActionsBlock(document);
}

loadPage();