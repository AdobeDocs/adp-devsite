/* eslint-disable no-unused-expressions */
/* global describe it */

import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: '../../scripts/body.html' });

describe('Accordion block', () => {
  it('Builds accordion block', async () => {
    await import('../../../hlx_statics/scripts/scripts.js');
    expect(document.querySelector('.accordion')).to.exist;
  });
});