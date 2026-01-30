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

/**
 * Adds speculation rules to the page
 */
function preloadPage() {
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prerender: [
      {
        where: {
          selector_matches: "[data-prefetch=prerender]"
        },
        eagerness: "immediate"
      },
    ],
    prefetch: [
      {
        where: {
          selector_matches: "[data-prefetch='']"
        },
        eagerness: "immediate"
      },
    ],
  });
  document.head.appendChild(script);
}

// Core Web Vitals RUM collection
sampleRUM('cwv');

addExtraScript(document.body, 'https://www.adobe.com/etc.clientlibs/globalnav/clientlibs/base/privacy-standalone.js');

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
const linkElements = [];

document.querySelectorAll('.side-nav a[href]').forEach((a) => {
  const isMouseOver = getIsMouseOverForElement(a);
  linksIsMouseOver.push(isMouseOver);
  linkElements.push(a);
});

document.addEventListener('mousemove', (e) => {
  const x = e.clientX;
  const y = e.clientY;

  linksIsMouseOver.forEach((isMouseOver, index) => {
    const href = isMouseOver(x, y);
    if (href) {
      const link = linkElements[index];
      // Add data-prefetch attribute on mouse over if it doesn't already exist
      if (!link.hasAttribute('data-prefetch')) {
        link.setAttribute('data-prefetch', 'prerender');
      }
    }
  });
});

focusRing();
applyAnalytic();
preloadPage();