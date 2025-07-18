import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

// Mock IntersectionObserver
window.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback;
  }

  observe(element) {
    this.element = element;
  }

  disconnect() {
    this.isDisconnected = true;
  }

  triggerIntersection(isIntersecting) {
    this.callback([
      {
        target: this.element,
        isIntersecting,
      },
    ]);
  }
};

document.body.innerHTML = await readFile({ path: 'embed-youtube.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');
const { default: decorate } = await import('../../../hlx_statics/blocks/embed/embed.js');

describe('Embed block - Youtube', () => {
  let embedBlock;
  let observer;

  beforeEach(async () => {
    document.body.innerHTML = await readFile({ path: 'embed-youtube.html' });
    embedBlock = document.querySelector('div.embed');
    await decorateBlock(embedBlock);
    await loadBlock(embedBlock);
    observer = window.IntersectionObserver.prototype;
  });

  const resetBlockToOriginal = () => {
    embedBlock.innerHTML = `
      <div>
        <div><a href="https://www.youtube.com/watch?v=MEbDBeZOCPk">https://www.youtube.com/watch?v=MEbDBeZOCPk</a></div>
      </div>
    `;
    embedBlock.className = 'embed';
    embedBlock.removeAttribute('daa-lh');
  };

  it('Builds embed block', async () => {
    expect(embedBlock).to.exist;
    expect(embedBlock.classList.contains('embed')).to.be.true;
    expect(embedBlock.getAttribute('daa-lh')).to.equal('embed');
  });

  it('embed > link', async () => {
    if (embedBlock.querySelector('a')?.href) {
      expect(embedBlock.querySelector('a')?.href).to.equal('https://www.youtube.com/watch?v=MEbDBeZOCPk');
    }
  });

  it('creates IntersectionObserver when no placeholder exists', () => {
    resetBlockToOriginal();
    
    let observerCreated = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(...args) {
      observerCreated = true;
      return new originalIntersectionObserver(...args);
    };

    decorate(embedBlock);
    
    expect(observerCreated).to.be.true;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('loads embed content when intersection occurs', async () => {
    resetBlockToOriginal();
    
    let mockObserver;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(callback) {
      mockObserver = new originalIntersectionObserver(callback);
      mockObserver.triggerIntersection = (isIntersecting) => {
        callback([{ target: embedBlock, isIntersecting }]);
      };
      return mockObserver;
    };

    decorate(embedBlock);

    mockObserver.triggerIntersection(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(embedBlock.classList.contains('embed-is-loaded')).to.be.true;
    expect(embedBlock.querySelector('iframe')).to.exist;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('handles mouseover event on iframe', async () => {
    resetBlockToOriginal();
    
    let mockObserver;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(callback) {
      mockObserver = new originalIntersectionObserver(callback);
      mockObserver.triggerIntersection = (isIntersecting) => {
        callback([{ target: embedBlock, isIntersecting }]);
      };
      return mockObserver;
    };

    decorate(embedBlock);
    mockObserver.triggerIntersection(true);
    await new Promise(resolve => setTimeout(resolve, 0));

    const iframe = embedBlock.querySelector('iframe');
    expect(iframe).to.exist;
    
    const dataSrc = iframe.getAttribute('data-src');
    expect(dataSrc).to.exist;
    
    iframe.removeAttribute('src');
    expect(iframe.style.opacity).to.not.equal('1');

    const mouseoverEvent = new Event('mouseover');
    embedBlock.dispatchEvent(mouseoverEvent);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(iframe.src).to.equal(dataSrc);

    if (iframe.onload) {
      iframe.onload();
    }

    expect(iframe.style.opacity).to.equal('1');

    iframe.removeAttribute('src');
    embedBlock.dispatchEvent(mouseoverEvent);
    expect(iframe.hasAttribute('src')).to.be.false;

    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('disconnects observer after intersection', async () => {
    resetBlockToOriginal();
    
    let mockObserver;
    let disconnectCalled = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(callback) {
      mockObserver = new originalIntersectionObserver(callback);
      const originalDisconnect = mockObserver.disconnect.bind(mockObserver);
      mockObserver.disconnect = () => {
        disconnectCalled = true;
        originalDisconnect();
      };
      mockObserver.triggerIntersection = (isIntersecting) => {
        callback([{ target: embedBlock, isIntersecting }]);
      };
      return mockObserver;
    };

    decorate(embedBlock);

    mockObserver.triggerIntersection(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(disconnectCalled).to.be.true;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('does not create IntersectionObserver when placeholder exists', () => {
    resetBlockToOriginal();
    const placeholder = document.createElement('picture');
    embedBlock.appendChild(placeholder);
    
    let observerCreated = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(...args) {
      observerCreated = true;
      return new originalIntersectionObserver(...args);
    };

    decorate(embedBlock);

    expect(observerCreated).to.be.false;
    expect(embedBlock.querySelector('.embed-placeholder')).to.exist;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });
});

describe('Embed block - TikTok', () => {
  let embedBlock;
  let observer;

  beforeEach(async () => {
    document.body.innerHTML = await readFile({ path: 'embed-tiktok.html' });
    embedBlock = document.querySelector('div.embed');
    await decorateBlock(embedBlock);
    await loadBlock(embedBlock);
    observer = window.IntersectionObserver.prototype;
  });

  const resetBlockToOriginal = () => {
    embedBlock.innerHTML = `
      <div>
        <div><a href="https://www.tiktok.com/@adobe/video/7351077325024398634">https://www.tiktok.com/@adobe/video/7351077325024398634</a></div>
      </div>
    `;
    embedBlock.className = 'embed';
    embedBlock.removeAttribute('daa-lh');
  };

  it('Builds embed block', async () => {
    expect(embedBlock).to.exist;
    expect(embedBlock.classList.contains('embed')).to.be.true;
    expect(embedBlock.getAttribute('daa-lh')).to.equal('embed');
  });

  it('embed > link', async () => {
    if (embedBlock.querySelector('a')?.href) {
      expect(embedBlock.querySelector('a')?.href).to.equal('https://www.tiktok.com/@adobe/video/7351077325024398634');
    }
  });

  it('creates IntersectionObserver when no placeholder exists', () => {
    resetBlockToOriginal();

    let observerCreated = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(...args) {
      observerCreated = true;
      return new originalIntersectionObserver(...args);
    };

    decorate(embedBlock);
    
    expect(observerCreated).to.be.true;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('loads embed content when intersection occurs', async () => {
    resetBlockToOriginal();
    
    let mockObserver;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(callback) {
      mockObserver = new originalIntersectionObserver(callback);
      mockObserver.triggerIntersection = (isIntersecting) => {
        callback([{ target: embedBlock, isIntersecting }]);
      };
      return mockObserver;
    };

    decorate(embedBlock);

    mockObserver.triggerIntersection(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(embedBlock.classList.contains('embed-is-loaded')).to.be.true;
    expect(embedBlock.querySelector('iframe')).to.exist;
    expect(embedBlock.classList.contains('embed-tiktok')).to.be.true;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('disconnects observer after intersection', async () => {
    resetBlockToOriginal();
    
    let mockObserver;
    let disconnectCalled = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(callback) {
      mockObserver = new originalIntersectionObserver(callback);
      const originalDisconnect = mockObserver.disconnect.bind(mockObserver);
      mockObserver.disconnect = () => {
        disconnectCalled = true;
        originalDisconnect();
      };
      mockObserver.triggerIntersection = (isIntersecting) => {
        callback([{ target: embedBlock, isIntersecting }]);
      };
      return mockObserver;
    };

    decorate(embedBlock);

    mockObserver.triggerIntersection(true);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(disconnectCalled).to.be.true;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('does not create IntersectionObserver when placeholder exists', () => {
    resetBlockToOriginal();
    const placeholder = document.createElement('picture');
    embedBlock.appendChild(placeholder);
    
    let observerCreated = false;
    const originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = function(...args) {
      observerCreated = true;
      return new originalIntersectionObserver(...args);
    };

    decorate(embedBlock);

    expect(observerCreated).to.be.false;
    expect(embedBlock.querySelector('.embed-placeholder')).to.exist;
    
    window.IntersectionObserver = originalIntersectionObserver;
  });
}