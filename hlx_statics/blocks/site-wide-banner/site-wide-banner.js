import {
  createTag,
  decorateButtons,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSiteWideBanner,
  getMetadata,
  readBlockConfig,
} from "../../scripts/lib-helix.js";
import { getVariant } from "../inlinealert/inlinealert.js";

/**
 * Decorates the site-wide banner block
 * @param {Element} block The site-wide-banner block element
 */
export default async function decorate(block) {
  const siteParent = block.parentElement.parentElement;
  const mainArea = document.querySelector('[style*="grid-area: main"]');
  const sidenavArea = document.querySelector('[style*="grid-area: sidenav"]');
  const isDocTemplate = getMetadata("template") === "documentation";
  const isMobile = window.innerWidth < 1025;
  let bannerData;

  block.setAttribute('daa-lh', 'site-wide-banner');

   const config = readBlockConfig(block);

  if (isDocTemplate) {
    bannerData = await fetchSiteWideBanner();
  } else {
    try {
      const resp = await fetch('https://main--adobe-io-website--adobe.hlx.page/franklin_assets/site-wide-banner.json');
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);

      const { data, ...meta } = await resp.json();

      const bannerObj = data.reduce((acc, { key, value }) => {
        try {
          acc[key] = JSON.parse(value);
        } catch {
          acc[key] = value;
        }
        return acc;
      }, {});

      if (typeof bannerObj.isClose === 'string') bannerObj.isClose = bannerObj.isClose.toLowerCase() === 'true';

      bannerData = { ...meta, data: [bannerObj] };
    } catch (e) { console.error('Fetch error:', e); };

  }

  if (!bannerData || !bannerData?.data[0]) {
    siteParent.style.display = "none";
    return;
  }

  const { text, icon, buttonLink, button, isClose, bgColor = "notice" } = bannerData?.data[0] || {};
  const parentHeight = siteParent.getBoundingClientRect().height;
  const paddingValue = `${parentHeight + (isMobile ? 50 : 0)}px`;
  const nextHeroSpan = siteParent.nextElementSibling?.nextElementSibling;

  if (isDocTemplate) {
    mainArea.style.paddingTop = paddingValue;
    sidenavArea.style.paddingTop = paddingValue;
  } else if (nextHeroSpan) {
    nextHeroSpan.style.paddingTop = paddingValue;
  }

  const wrapper = createTag("div", { class: "site-wide-banner-block-wrapper" });
  const content = createTag("div", { class: "site-wide-banner-content" });
  const textWrap = createTag("div", { class: "site-wide-banner-text" });
  const buttonWrap = createTag("p", { class: "site-wide-banner-button-container" });

  if (icon) {
    const iconContainer = createTag("div", { class: `site-wide-banner-icon ${icon} ` });
    const variant = getVariant(iconContainer.classList);
    if (variant) {
      iconContainer.classList.add(variant.class || "spectrum-InLineAlert--info");
      iconContainer.insertAdjacentHTML("afterbegin", variant.icon || "");
    }
    textWrap.appendChild(iconContainer);
  }

  if (Array.isArray(text)) {
    const textBlock = createTag("div");
    text.forEach(t => textBlock.innerHTML += `<div>${t}</div>`);
    textWrap.appendChild(textBlock);
  }

  if (button && buttonLink) {
    const anchor = createTag("a", { href: buttonLink });
    anchor.innerHTML = button;
    buttonWrap.appendChild(anchor);
  }

  content.append(textWrap, buttonWrap);
  wrapper.appendChild(content);

  if (isClose) {
    const closeBtn = createTag("div", { class: "site-wide-banner-close-button" });
    block.classList.add("closable");
    closeBtn.addEventListener("click", () => {
      siteParent.style.display = "none";
      if (isDocTemplate) {
        mainArea.style.paddingTop = "0px";
        sidenavArea.style.paddingTop = "0px";
      } else if (nextHeroSpan) {
        nextHeroSpan.style.paddingTop = "0px";
      }
      if (isMobile) {
        const sibling = siteParent.nextElementSibling;
        if (sibling) sibling.style.paddingTop = "0px";
      }
    });
    wrapper.appendChild(closeBtn);
  }

  if (bgColor) {
    const allowedColors = ["warning", "success", "info", "neutral", "notice", "light"];
    if (allowedColors.includes(bgColor))
      siteParent.classList.add(`background-${bgColor}`)

  }

  block.appendChild(wrapper);
  decorateButtons(block);

  if (isMobile && isClose) {
    requestAnimationFrame(() => {
      const closeBtn = block.querySelector(".site-wide-banner-close-button");
      if (closeBtn) {
        closeBtn.style.height = `${wrapper.getBoundingClientRect().height}px`;
      }
    });
  }
}
