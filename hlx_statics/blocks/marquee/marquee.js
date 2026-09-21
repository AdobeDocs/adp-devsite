import {
  createTag,
  removeEmptyPTags,
} from "../../scripts/lib-adobeio.js";

/**
 * decorates the marquee block
 * @param {Element} block The marquee block element
 */
export default async function decorate(block) {
  block.setAttribute("daa-lh", "marquee");
  removeEmptyPTags(block);

  const rows = [...block.querySelectorAll(":scope > div > div")];
  if (rows.length === 0) return;

  const items = [];

  rows.forEach((row) => {
    const pictures = row.querySelectorAll("picture");
    const images = row.querySelectorAll("img");

    if (pictures.length > 0) {
      pictures.forEach((pic) => {
        items.push({ type: "picture", element: pic });
      });
    } else if (images.length > 0) {
      images.forEach((img) => {
        items.push({ type: "image", element: img });
      });
    } else {
      const text = row.textContent.trim();
      if (text) {
        items.push({ type: "text", text });
      }
    }
  });

  block.innerHTML = "";

  const marqueeWrapper = createTag("div", { class: "marquee-wrapper-inner" });
  const marqueeContainer = createTag("div", { class: "marquee-container" });
  const marqueeTrack1 = createTag("ul", { class: "marquee-group", role: "list" });

  function createMarqueeItem(item) {
    const itemLi = createTag("li", { class: "marquee-item" });
    if (item.type === "picture" || item.type === "image") {
      const cloned = item.element.cloneNode(true);
      const img = cloned.tagName === "IMG" ? cloned : cloned.querySelector("img");
      if (img && !img.getAttribute("alt")) {
        img.setAttribute("alt", img.getAttribute("title") || "Partner logo");
      }
      itemLi.append(cloned);
    } else if (item.type === "text") {
      const span = createTag("span", { class: "marquee-text" });
      span.textContent = item.text;
      itemLi.append(span);
    }
    return itemLi;
  }

  // Ensure enough items in the group to span viewports smoothly
  const minItems = 8;
  const repeatCount = items.length > 0 && items.length < minItems
    ? Math.ceil(minItems / items.length)
    : 1;

  for (let r = 0; r < repeatCount; r += 1) {
    items.forEach((item) => {
      marqueeTrack1.append(createMarqueeItem(item));
    });
  }

  const marqueeTrack2 = marqueeTrack1.cloneNode(true);
  marqueeTrack2.setAttribute("aria-hidden", "true");

  marqueeContainer.append(marqueeTrack1, marqueeTrack2);
  marqueeWrapper.append(marqueeContainer);
  block.append(marqueeWrapper);
}
