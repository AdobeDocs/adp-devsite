// eslint-disable-next-line import/no-cycle
import {
  sampleRUM,
  loadCSS
} from './lib-helix.js';
import {
  focusRing,
  isHlxPath,
  isStageEnvironment,
  decorateProfile,
  addExtraScript,
  addExtraScriptWithLoad,
  applyAnalytic
} from './lib-adobeio.js';

/**
 * Loads prism for syntax highlighting
 * @param {Document} document
 */

const preloaded = new Set();

async function preloadPage(href) {
  const hrefURL = new URL(href);
  if (hrefURL.origin === window.location.origin) {
    // use speculation rules to preload the page
    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify({
      prerender: [
        {
          urls: [`${hrefURL.pathname}${hrefURL.search}`],
        },
      ],
    });
    document.head.appendChild(script);
  }
}


function loadPrism(document) {
  const highlightable = document.querySelector(
    'code[class*="language-"], [class*="language-"] code',
  );
  if (!highlightable) return; // exit, no need to load prism if nothing to highlight

  // see: https://prismjs.com/docs/Prism.html#.manual
  window.Prism = window.Prism || {};
  window.Prism.manual = true;
  loadCSS(`${window.hlx.codeBasePath}/styles/prism.css`);
  import('./prism.js')
    .then(() => {
      // see: https://prismjs.com/plugins/autoloader/
      window.Prism.plugins.autoloader.languages_path = '/hlx_statics/scripts/prism-grammars/';
      // run prism in async mode; uses webworker.
      window.Prism.highlightAll(true);
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error(err));
}

// Core Web Vitals RUM collection
sampleRUM('cwv');

addExtraScript(document.body, 'https://www.adobe.com/marketingtech/main.min.js');
addExtraScript(document.body, 'https://wwwimages2.adobe.com/etc/beagle/public/globalnav/adobe-privacy/latest/privacy.min.js');

document.querySelectorAll('.embed').forEach((embed) => {
  const iframe = embed.querySelector('iframe');
  if (iframe == null) return;
  if (!iframe.src) {
    iframe.src = iframe?.getAttribute('data-src');
    iframe.onload = () => { iframe.style.opacity = 1; };
  }
});

const HPADDING = 50; // extend horizontal trigger area by 50px around the link
const VPADDING = 2; // extend vertical trigger area by 10px around the link

function getIsMouseOverForElement(el) {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;

  const rect = el.getBoundingClientRect();

  const top = rect.top + scrollTop - VPADDING;
  const left = rect.left + scrollLeft - HPADDING;
  const bottom = rect.bottom + scrollTop + VPADDING;
  const right = rect.right + HPADDING;

  return (x, y) => {
    const st = document.documentElement.scrollTop || document.body.scrollTop;
    const sl = document.documentElement.scrollLeft || document.body.scrollLeft;

    const xs = x + sl;
    const ys = y + st;

    if (xs >= left
      && xs <= right
      && ys >= top
      && ys <= bottom) {
      return el.href;
    }
    return null;
  };
}

const linksIsMouseOver = [];

document.querySelectorAll('.side-nav a[href]').forEach((a) => {
  const isMouseOver = getIsMouseOverForElement(a);
  linksIsMouseOver.push(isMouseOver);
});

document.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  linksIsMouseOver.forEach((isMouseOver) => {
    const href = isMouseOver(x, y);
    if (href && !preloaded.has(href)) {
      preloadPage(href);
      preloaded.add(href);
    }
  });
});


focusRing();
applyAnalytic();
loadPrism(document);
