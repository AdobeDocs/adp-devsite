import {
  createTag,
  decorateButtons,
  getClosestFranklinSubfolder,
} from "../../scripts/lib-adobeio.js";
import {
  fetchSiteWideBanner,
  getMetadata,
} from "../../scripts/lib-helix.js";
import { loadFragment } from "../fragment/fragment.js";
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
  if (isDocTemplate) {
    bannerData = await fetchSiteWideBanner();
  } else {
    const bannerPath = getClosestFranklinSubfolder(window.location.origin, 'site-wide-banner');
    let fragment = await loadFragment(bannerPath) || await loadFragment(getClosestFranklinSubfolder(window.location.origin, 'site-wide-banner', true));
    if (fragment) {
      try {
        const jsonString = Array.from(fragment.querySelectorAll("main p")).map(p => p.innerText).join("");
        bannerData = JSON.parse(jsonString);
      } catch (err) {
        console.error("Invalid JSON format:", err.message);
      }
    }
  }

  if (!bannerData) {
    siteParent.style.display = "none";
    return;
  }

  const { text, icon, buttonLink, button, isClose } = bannerData.data[0] || {};
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
    const iconContainer = createTag("div", { class: `site-wide-banner-icon ${icon}` });
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

  block.appendChild(wrapper);
  decorateButtons(block);

  // Mobile-specific styling
  if (isMobile && isClose) {
    requestAnimationFrame(() => {
      const closeBtn = block.querySelector(".site-wide-banner-close-button");
      if (closeBtn) {
        closeBtn.style.height = `${wrapper.getBoundingClientRect().height}px`;
      }
    });
  }
}
