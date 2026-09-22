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

  const items = [...block.querySelectorAll("picture")];
  if (!items.length) return;

  items.forEach((item) => {
    const img = item.querySelector("img");
    if (img && !img.alt) img.alt = img.title || "";
  });

  const wrapper = createTag("div", { class: "marquee-wrapper-inner" });
  const container = createTag("div", { class: "marquee-container" });
  const track1 = createTag("ul", { class: "marquee-group", role: "list" });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minItems = 8;
  const repeatCount = !prefersReducedMotion && items.length < minItems
    ? Math.ceil(minItems / items.length)
    : 1;

  for (let r = 0; r < repeatCount; r += 1) {
    items.forEach((element) => {
      const itemLi = createTag("li", { class: "marquee-item" });
      if (r > 0) itemLi.setAttribute("aria-hidden", "true");
      itemLi.append(element.cloneNode(true));
      track1.append(itemLi);
    });
  }

  container.append(track1);

  if (!prefersReducedMotion) {
    const track2 = track1.cloneNode(true);
    track2.setAttribute("aria-hidden", "true");
    container.append(track2);
  }

  wrapper.append(container);
  block.replaceChildren(wrapper);
}
