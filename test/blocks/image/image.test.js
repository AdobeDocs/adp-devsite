/* global describe, before, beforeEach, afterEach, it */
/* eslint-disable no-unused-expressions */
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const { default: decorate } = await import('../../../hlx_statics/blocks/image/image.js');

const largeImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"></svg>')}`;
const smallImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"></svg>')}`;

function createBlock(value, devBiz = false, src = largeImage) {
  const wrapper = document.createElement('div');
  wrapper.className = 'image-wrapper';
  wrapper.style.width = '800px';
  const block = document.createElement('div');
  block.className = 'image';
  const row = document.createElement('div');
  const cell = document.createElement('div');
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Example image';
  cell.append(img);
  row.append(cell);
  block.append(row);
  if (value !== undefined) {
    if (devBiz) {
      const config = document.createElement('div');
      const name = document.createElement('div');
      const setting = document.createElement('div');
      name.textContent = 'Max width';
      setting.textContent = value;
      config.append(name, setting);
      block.append(config);
    } else {
      block.setAttribute('data-maxwidth', value);
    }
  }
  wrapper.append(block);
  document.querySelector('main').append(wrapper);
  return { wrapper, block, img };
}

describe('Image block', () => {
  let warn;

  before(async () => {
    await Promise.all([
      '/hlx_statics/styles/styles.css',
      '/hlx_statics/blocks/image/image.css',
    ].map((href) => new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = href;
      css.onload = resolve;
      css.onerror = reject;
      document.head.append(css);
    })));
  });

  beforeEach(() => {
    document.body.innerHTML = '<main></main>';
    document.body.classList.add('appear');
    // Page initialization fails in tests and leaves the body hidden. See DEVSITE-1811.
    document.body.style.display = '';
    warn = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    warn.restore();
  });

  it('resolves presets and supported custom values from DevDocs attributes', () => {
    [
      ['small', '300px'],
      ['medium', '500px'],
      ['large', '600px'],
      [' 550px ', '550px'],
      ['90%', '90%'],
      ['34.375rem', '34.375rem'],
      ['0.5px', '0.5px'],
    ].forEach(([value, expected]) => {
      const { block } = createBlock(value);
      decorate(block);
      expect(block.style.getPropertyValue('--image-max-width'), value).to.equal(expected);
    });
    expect(warn.called).to.be.false;
  });

  it('reads and removes the DevBiz setting while preserving the image and link', () => {
    const { block, img } = createBlock('550px', true);
    const link = document.createElement('a');
    link.href = '/example';
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.srcset = largeImage;
    img.loading = 'lazy';
    img.width = 1000;
    img.height = 500;
    img.replaceWith(link);
    link.append(picture);
    picture.append(source, img);
    decorate(block);
    expect(block.style.getPropertyValue('--image-max-width')).to.equal('550px');
    expect(block.children.length).to.equal(1);
    expect(block.querySelector('a picture img')).to.equal(img);
    expect(block.querySelector('picture source')).to.equal(source);
    expect(img.alt).to.equal('Example image');
    expect(img.loading).to.equal('lazy');
    expect(img.getAttribute('width')).to.equal('1000');
    expect(img.getAttribute('height')).to.equal('500');
  });

  it('uses shared config normalization and preserves unrelated rows', () => {
    const { block } = createBlock('unused', true);
    const configRow = block.lastElementChild;
    configRow.firstElementChild.textContent = ' Max / width ';
    configRow.lastElementChild.innerHTML = '<p>550px</p>';
    const otherRow = document.createElement('div');
    otherRow.innerHTML = '<div>Other</div><div>Content</div>';
    block.append(otherRow);

    decorate(block);
    expect(block.style.getPropertyValue('--image-max-width')).to.equal('550px');
    expect(block.contains(configRow)).to.be.false;
    expect(block.contains(otherRow)).to.be.true;
  });

  it('uses the last DevBiz setting unless a DevDocs attribute is present', () => {
    const { block } = createBlock('300px', true);
    const secondRow = block.lastElementChild.cloneNode(true);
    secondRow.lastElementChild.textContent = '550px';
    block.append(secondRow);
    decorate(block);
    expect(block.style.getPropertyValue('--image-max-width')).to.equal('550px');
    expect(block.children.length).to.equal(1);

    const both = createBlock('300px', true).block;
    both.setAttribute('data-maxwidth', 'large');
    decorate(both);
    expect(both.style.getPropertyValue('--image-max-width')).to.equal('600px');
    expect(both.children.length).to.equal(1);
  });

  it('warns when a DevBiz setting contains multiple values', () => {
    const { block } = createBlock('unused', true);
    block.lastElementChild.lastElementChild.innerHTML = '<p>300px</p><p>550px</p>';

    decorate(block);
    expect(block.style.getPropertyValue('--image-max-width')).to.equal('');
    expect(block.children.length).to.equal(1);
    expect(warn.calledOnce).to.be.true;
  });

  it('leaves missing or blank settings at the default without a warning', () => {
    [undefined, '', '  '].forEach((value) => {
      const { block } = createBlock(value, true);
      decorate(block);
      expect(block.style.getPropertyValue('--image-max-width')).to.equal('');
      expect(block.children.length).to.equal(1);
    });
    expect(warn.called).to.be.false;
  });

  it('rejects invalid values and hides the config row', () => {
    [
      '550', '0px', '0.0rem', '-1px', '1vw', '550PX', 'calc(100% - 1px)',
      'var(--x)', 'constructor', '1px; position: fixed', '1px" onerror="x',
    ].forEach((value) => {
      const { block } = createBlock(value, true);
      decorate(block);
      expect(block.style.getPropertyValue('--image-max-width'), value).to.equal('');
      expect(block.children.length, value).to.equal(1);
    });
    expect(warn.callCount).to.equal(11);
  });

  it('warns when the block has no image', () => {
    const { block, img } = createBlock('small', true);
    img.remove();
    decorate(block);
    expect(warn.calledOnceWith('Image: no image found')).to.be.true;
  });

  it('caps a large image, fits narrow containers, and never enlarges a small image', async () => {
    const capped = createBlock('550px');
    const narrow = createBlock('550px');
    narrow.wrapper.style.width = '311px';
    const small = createBlock('large', true, smallImage);
    [capped, narrow, small].forEach(({ block }) => decorate(block));
    await Promise.all([capped, narrow, small].map(({ img }) => img.decode()));
    expect(capped.img.getBoundingClientRect().width).to.equal(550);
    expect(narrow.img.getBoundingClientRect().width).to.equal(311);
    expect(small.img.getBoundingClientRect().width).to.equal(200);
  });

  it('resolves percentage and rem widths against the container and root font size', async () => {
    const percent = createBlock('50%', true);
    const rem = createBlock('10rem');
    [percent, rem].forEach(({ block }) => decorate(block));
    await Promise.all([percent.img.decode(), rem.img.decode()]);
    expect(percent.img.getBoundingClientRect().width).to.equal(400);
    expect(rem.img.getBoundingClientRect().width)
      .to.equal(10 * parseFloat(getComputedStyle(document.documentElement).fontSize));
  });

  it('limits linked image hit areas without changing image size or spacing', async () => {
    const cases = [
      { value: undefined, width: 800, expected: 800 },
      {
        value: '550px', width: 800, expected: 550, devBiz: true,
      },
      { value: '90%', width: 800, expected: 720 },
      { value: '550px', width: 311, expected: 311 },
      {
        value: 'large', width: 800, expected: 200, devBiz: true, src: smallImage,
      },
    ];
    const fixtures = cases.map(({
      value, width, expected, devBiz, src,
    }) => {
      const unlinked = createBlock(value, devBiz, src);
      const linked = createBlock(value, devBiz, src);
      unlinked.wrapper.style.width = `${width}px`;
      linked.wrapper.style.width = `${width}px`;
      const link = document.createElement('a');
      const picture = document.createElement('picture');
      link.href = '/example';
      linked.img.replaceWith(link);
      link.append(picture);
      picture.append(linked.img);
      [unlinked, linked].forEach(({ block }) => decorate(block));
      return {
        unlinked, linked, link, expected,
      };
    });

    await Promise.all(fixtures.flatMap(({ unlinked, linked }) => [
      unlinked.img.decode(), linked.img.decode(),
    ]));
    fixtures.forEach(({
      unlinked, linked, link, expected,
    }) => {
      const imageRect = linked.img.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const unlinkedRect = unlinked.img.getBoundingClientRect();
      const blockRect = linked.block.getBoundingClientRect();
      const unlinkedBlockRect = unlinked.block.getBoundingClientRect();

      expect(imageRect.width).to.equal(expected);
      expect(linkRect.width).to.equal(imageRect.width);
      expect(linkRect.height).to.equal(imageRect.height);
      expect(linkRect.height).to.equal(imageRect.width / 2);
      expect(unlinkedRect.width).to.equal(imageRect.width);
      expect(blockRect.height).to.equal(unlinkedBlockRect.height);
      expect(imageRect.top - blockRect.top).to.be.closeTo(
        unlinkedRect.top - unlinkedBlockRect.top
          + parseFloat(getComputedStyle(unlinked.img).paddingTop),
        0.01,
      );
    });
  });

  it('matches the plain image size and spacing when no setting is given', async () => {
    const main = document.querySelector('main');
    const plainSection = document.createElement('div');
    plainSection.className = 'section';
    const plain = document.createElement('div');
    plain.className = 'default-content-wrapper';
    plain.style.width = '800px';
    const plainHeading = document.createElement('h2');
    plainHeading.textContent = 'Default';
    const paragraph = document.createElement('p');
    const image = document.createElement('img');
    image.src = largeImage;
    paragraph.append(image);
    plain.append(plainHeading, paragraph);
    plainSection.append(plain);
    main.append(plainSection);
    const { wrapper, block, img } = createBlock();
    const blockSection = document.createElement('div');
    blockSection.className = 'section';
    const blockHeadingWrapper = document.createElement('div');
    blockHeadingWrapper.className = 'default-content-wrapper';
    const blockHeading = document.createElement('h2');
    blockHeading.textContent = 'Image block default';
    blockHeadingWrapper.append(blockHeading);
    blockSection.append(blockHeadingWrapper, wrapper);
    main.append(blockSection);
    decorate(block);
    await Promise.all([image.decode(), img.decode()]);
    expect(img.getBoundingClientRect().width).to.equal(image.getBoundingClientRect().width);
    expect(img.getBoundingClientRect().height).to.equal(image.getBoundingClientRect().height);
    expect(getComputedStyle(wrapper).marginTop).to.equal(getComputedStyle(paragraph).marginTop);
    expect(getComputedStyle(wrapper).marginBottom)
      .to.equal(getComputedStyle(paragraph).marginBottom);
    const plainGap = image.getBoundingClientRect().top
      - plainHeading.getBoundingClientRect().bottom;
    const blockGap = img.getBoundingClientRect().top - blockHeading.getBoundingClientRect().bottom;
    expect(blockGap).to.equal(plainGap);
  });
});
