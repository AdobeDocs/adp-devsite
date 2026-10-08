import { expect } from '@esm-bundle/chai';

await import('../../../hlx_statics/scripts/lib-helix.js');
const { default: decorateHeading } = await import('../../../hlx_statics/components/heading.js');

describe('Heading permalinks', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  [2, 3, 4, 5, 6].forEach((level) => {
    it(`keeps the H${level} permalink outside the semantic heading`, () => {
      document.body.innerHTML = `<main><div class="heading${level} block"><h${level} id="overview">Overview <strong>details</strong></h${level}></div></main>`;
      const block = document.querySelector('.block');
      decorateHeading({ level, block });

      const heading = block.querySelector(`h${level}`);
      const link = block.querySelector('a.anchor-link');
      expect(heading.textContent.trim()).to.equal('Overview details');
      expect(heading.querySelector('strong').textContent).to.equal('details');
      expect(heading.getAttribute('role')).to.equal(null);
      expect(link.closest('h1, h2, h3, h4, h5, h6')).to.equal(null);
      expect(link.parentElement.previousElementSibling).to.equal(heading);
      expect(link.getAttribute('href')).to.equal('#overview');
      expect(link.getAttribute('aria-label')).to.equal('overview');
      expect(link.tabIndex).to.equal(0);
      expect(link.querySelector('svg').getAttribute('aria-hidden')).to.equal('true');

      const offset = block.firstElementChild;
      expect(offset.id).to.equal('overview');
      expect(offset.getAttribute('aria-hidden')).to.equal('true');
      expect(offset.style.top).to.equal('calc(-1 * var(--fixed-top-offset, 64px))');
      if (level === 2) {
        expect(heading.parentElement.nextElementSibling.tagName).to.equal('HR');
      } else {
        expect(block.querySelector('hr')).to.equal(null);
      }
    });
  });

  it('leaves the H1 without a permalink or offset anchor', () => {
    document.body.innerHTML = '<main><div class="heading1 block"><h1 id="title">Title</h1></div></main>';
    const block = document.querySelector('.block');
    decorateHeading({ level: 1, block });

    expect(block.children.length).to.equal(1);
    expect(block.firstElementChild.tagName).to.equal('H1');
    expect(block.firstElementChild.classList.contains('spectrum-Heading--light')).to.equal(true);
    expect(block.querySelector('a')).to.equal(null);
  });
});
