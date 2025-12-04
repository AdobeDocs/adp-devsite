import {
  createTag,
  decorateButtons,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSiteWideBanner,
  getMetadata,
  IS_DEV_DOCS,
} from "../../scripts/lib-helix.js";
import { getVariant } from "../inlinealert/inlinealert.js";

export default async function decorate(block) {
  const siteParent = block.parentElement.parentElement;
  // default setting this to none and then show it once it loads
  siteParent.style.display = 'none';

  const mainArea = document.querySelector('.grid-main-area');
  const sidenavArea = document.querySelector('.side-nav-container');
  const productName = getMetadata('product');
  const isMobile = window.innerWidth < 1025;
  const paddingTargets = IS_DEV_DOCS ? [mainArea, sidenavArea] : [siteParent.nextElementSibling?.nextElementSibling];
  block.setAttribute('daa-lh', 'site-wide-banner');
  const allowedColors = ["warning", "success", "info", "neutral", "notice", "light"];

  let banner;
  try {
    const url = `/franklin_assets/${productName ? `${productName}-` : ''}site-wide-banner.json`;
    const bannerSource = IS_DEV_DOCS
      ? await fetchSiteWideBanner()
      : await fetch(url).then(resp => {
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        return resp.json();
      }).then(({ data, ...meta }) => ({
        ...meta,
        data: [Object.fromEntries(data.map(({ key, value }) => {
          try {
            return [key, JSON.parse(value)];
          } catch {
            return [key, value];
          }
        }))]
      }));

    banner = bannerSource?.data?.[0];
    if (typeof banner?.isClose === 'string') {
      banner.isClose = banner.isClose.toLowerCase() === 'true';
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }

  if (banner && Object.keys(banner).length !== 0) {
    siteParent.style.display = null;

    const { text, icon, buttonLink, button, isClose, bgColor = "notice" } = banner;
    const padding = `${siteParent.getBoundingClientRect().height + (isMobile ? 180 : 16)}px`;
    paddingTargets.forEach(el => el && (el.style.paddingTop = padding));

    const wrapper = createTag("div", { class: "site-wide-banner-block-wrapper" });
    const content = createTag("div", { class: "site-wide-banner-content" });
    const textWrap = createTag("div", { class: "site-wide-banner-text" });
    const buttonWrap = createTag("p", { class: "site-wide-banner-button-container" });

    if (icon) {
      const iconEl = createTag("div", { class: `site-wide-banner-icon ${icon}` });
      const variant = getVariant(iconEl.classList);
      iconEl.classList.add(variant.class || "spectrum-InLineAlert--info");
      iconEl.insertAdjacentHTML("afterbegin", variant.icon || "");
      
      textWrap.appendChild(iconEl);
    }

    if (Array.isArray(text)) {
      const textBlock = createTag("div");
      text.forEach(t => textBlock.innerHTML += `<div class="spectrum-Body spectrum-Body--sizeS">${t}</div>`);
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
        paddingTargets.forEach(el => el && (el.style.paddingTop = "0px"));
        if (isMobile) {
          const sibling = siteParent.nextElementSibling;
          if (sibling) sibling.style.paddingTop = "0px";
        }
      });
      wrapper.appendChild(closeBtn);

      if (isMobile) {
        requestAnimationFrame(() => {
          const height = wrapper.getBoundingClientRect().height;
          closeBtn.style.height = `${height}px`;
          closeBtn.style.setProperty('--before-top', `${height / 2 - 25}px`);
        });
      }
    }

    if (allowedColors.includes(bgColor)) {
      siteParent.classList.add(`background-${bgColor}`);
    }

    block.appendChild(wrapper);
    decorateButtons(block);
  }
}
