
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

document.body.innerHTML = await readFile({ path: 'table.html' });
const { decorateBlock, loadBlock } = await import('../../../hlx_statics/scripts/lib-helix.js');

const tableBlock = document.querySelector('div.table');
await decorateBlock(tableBlock);
await loadBlock(tableBlock);

describe('Table block', () => {
  describe('Basic Block Structure', () => {
    it('table > block', () => {
      expect(tableBlock).to.exist;
      expect(tableBlock.getAttribute('daa-lh')).to.equal('table');
      expect(tableBlock.getAttribute('dir')).to.equal('ltr');
    });

    it('table > table', () => {
      const table = tableBlock.querySelector('table');
      expect(table).to.exist;
      expect(table.classList.contains('spectrum-Table')).to.be.true;
      expect(table.classList.contains('spectrum-Table--sizeM')).to.be.true;
      expect(table.classList.contains('spectrum-Table--spacious')).to.be.true;
    });
  });

  describe('Table Header', () => {
    it('table > header > exists', () => {
      const thead = tableBlock.querySelector('thead');
      expect(thead).to.exist;
      expect(thead.classList.contains('spectrum-Table-head')).to.be.true;
      expect(thead.parentElement).to.equal(tableBlock.querySelector('table'));
    });

    it('table > header > cells', () => {
      const headerCells = tableBlock.querySelectorAll('th');
      headerCells.forEach(cell => {
        expect(cell.classList.contains('spectrum-Table-headCell')).to.be.true;
        expect(cell.getAttribute('scope')).to.equal('col');
      });
    });

    it('table > no-header', async () => {
      const noHeaderBlock = document.createElement('div');
      noHeaderBlock.className = 'table no-header';
      document.body.appendChild(noHeaderBlock);
      
      await decorateBlock(noHeaderBlock);
      await loadBlock(noHeaderBlock);

      const thead = noHeaderBlock.querySelector('thead');
      expect(thead).to.not.exist;
    });
  });

  describe('Table Body', () => {
    it('table > tbody > exists', () => {
      const tbody = tableBlock.querySelector('tbody');
      expect(tbody).to.exist;
      expect(tbody.classList.contains('spectrum-Table-body')).to.be.true;
      expect(tbody.parentElement).to.equal(tableBlock.querySelector('table'));
    });

    it('table > tbody > rows', () => {
      const rows = tableBlock.querySelectorAll('tbody tr');
      rows.forEach(row => {
        expect(row.classList.contains('spectrum-Table-row')).to.be.true;
      });
    });

    it('table > tbody > cells', () => {
      const bodyCells = tableBlock.querySelectorAll('tbody td');
      bodyCells.forEach(cell => {
        expect(cell.classList.contains('spectrum-Table-cell')).to.be.true;
      });
    });
  });

  describe('Cell', () => {
    it('cell > attributes', () => {
      const hasHeader = !tableBlock.classList.contains('no-header');
      const tbody = tableBlock.querySelector('tbody');
      const rows = tbody.querySelectorAll('tr');
      
      rows.forEach((row, i) => {
        const rowIndex = hasHeader ? i + 1 : i;
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          expect(cell.classList.contains('spectrum-Table-cell')).to.be.true;
          if (!rowIndex) {
            expect(cell.getAttribute('scope')).to.equal('col');
          } else {
            expect(cell.hasAttribute('scope')).to.be.false;
          }
        });
      });
    });

    it('cell > attributes', () => {
      const headerCells = tableBlock.querySelectorAll('th');
      headerCells.forEach(cell => {
        expect(cell.classList.contains('spectrum-Table-headCell')).to.be.true;
        expect(cell.getAttribute('scope')).to.equal('col');
      });
    });
  });
});