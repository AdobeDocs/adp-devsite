/* eslint-disable no-unused-expressions */
/* global describe before it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

document.body.innerHTML = await readFile({ path: './dummy.html' });
document.head.innerHTML = await readFile({ path: './head.html' });

let scripts, libAdobeIO, libHelix;
describe('Core Helix features', () => {
  before(async () => {
    scripts = await import('../../../hlx_statics/scripts/scripts.js');
    libAdobeIO = await import('../../../hlx_statics/scripts/lib-adobeio.js');
    libHelix= await import('../../../hlx_statics/scripts/lib-helix.js');

    document.body.innerHTML = await readFile({ path: './body.html' });
  });

  it('Initializes window.hlx', async () => {
    const script = document.createElement('script');
    script.src = '/hlx_statics/scripts/scripts.js';
    script.type = 'module';
    document.head.appendChild(script);

    window.history.pushState({}, '', `${window.location.href}&lighthouse=on`);

    libHelix.initHlx();

    expect(window.hlx).to.exist;
    expect(window.hlx.codeBasePath).to.equal('/hlx_statics');
    expect(window.hlx.lighthouse).to.equal(true);

    // test error handling
    const url = sinon.stub(window, 'URL');

    // cleanup
    url.restore();
    window.hlx.codeBasePath = '';
    window.hlx.lighthouse = false;
    Array.from(document.querySelectorAll('script')).pop().remove();
  })
});