/**
 * @param {Element} block
 */

export default async function decorate(block) {
  [...block.children].forEach((item) => {
    const children = [...item.children];

    children.forEach((child) => {
      const picture = child.querySelector('picture');
      const heading = child.querySelector('h1, h2, h3, h4, h5, h6');
      const text = child.textContent.trim();

      if (picture) {
        child.classList.add('actionteaser-image');
      } else if (heading) {
        child.classList.add('actionteaser-heading');
      } else if (text.length > 0) {
        child.classList.add('actionteaser-description');
      }
    });
  });
}
