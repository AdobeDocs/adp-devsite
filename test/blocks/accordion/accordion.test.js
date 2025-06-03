/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'accordion.html' });
const { buildBlock, decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');


const accordionBlock = document.querySelector('div.accordion');
await loadBlock(accordionBlock);

describe('Accordion block', () => {
  it('Builds accordion block', async () => {

    expect(document.querySelector('.accordion-div')).to.exist;
  });

});