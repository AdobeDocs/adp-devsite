import {removeEmptyPTags, createTag} from '../../scripts/lib-adobeio.js';

/**
 * Decorates tables with Adobe Spectrum styling
 * @param {Element} block The block element containing tables
 */
function decorateTables(block) {
  const tables = block.querySelectorAll('table');

  tables.forEach(table => {
    // Apply main table classes
    table.className = 'spectrum-Table spectrum-Table--sizeM';

    // Handle thead
    let thead = table.querySelector('thead');
    if (thead) {
      thead.className = 'spectrum-Table-head';

      // Check if first row just contains "Table" and empty cells - remove it
      const rows = thead.querySelectorAll('tr');
      if (rows.length > 0) {
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('th');
        const hasOnlyTableHeader = cells.length > 0 &&
          cells[0].textContent.trim() === 'Table' &&
          Array.from(cells).slice(1).every(cell => !cell.textContent.trim());

        if (hasOnlyTableHeader) {
          firstRow.remove();
        }
      }

      // Style remaining header rows and cells
      thead.querySelectorAll('tr').forEach(tr => {
        tr.className = 'spectrum-Table-row';
        tr.querySelectorAll('th').forEach(th => {
          th.className = 'spectrum-Table-headCell';
        });
      });
    }

    // Handle tbody
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.className = 'spectrum-Table-body';
      const bodyRows = tbody.querySelectorAll('tr');

      // Check if first row should be moved to thead (contains header-like content)
      if (!thead && bodyRows.length > 0) {
        const firstRow = bodyRows[0];
        const cells = firstRow.querySelectorAll('td');

        // Create thead and move first row as header
        thead = document.createElement('thead');
        thead.className = 'spectrum-Table-head';

        const headerRow = document.createElement('tr');
        headerRow.className = 'spectrum-Table-row';

        cells.forEach(td => {
          const th = document.createElement('th');
          th.className = 'spectrum-Table-headCell';
          th.innerHTML = td.innerHTML;
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.insertBefore(thead, tbody);
        firstRow.remove();
      }

      // Style remaining body rows
      tbody.querySelectorAll('tr').forEach(tr => {
        tr.className = 'spectrum-Table-row';
        tr.querySelectorAll('td').forEach(td => {
          td.className = 'spectrum-Table-cell';

          // Wrap content in div with proper class
          const content = td.innerHTML;
          const wrapper = document.createElement('div');
          wrapper.innerHTML = content;

          // Convert inline code classes
          wrapper.querySelectorAll('code.inline-code').forEach(code => {
            code.className = 'spectrum-Code';
          });

          td.innerHTML = '';
          td.appendChild(wrapper);
        });
      });
    }
  });
}

/**
 * Returns the HTML for an accordion item
 * @param {*} heading The heading text of the accordion
 * @returns The accordion item HTML
 */
function getAccordionItem(heading) {
  return `
    <h3>
        <button class="accordion-itemHeader" type="button"> 
            <span class="accordion-toggle-icon">
                <svg class="expand-icon" style="display: block;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg class="collapse-icon" style="display: none;" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </span>
            ${heading}
        </button>
    </h3>
    `;
}

/**
 * decorates the accordion
 * @param {Element} block The accordion block element
 */
export default async function decorate(block) {
  block.setAttribute('daa-lh', 'accordionitem');
  removeEmptyPTags(block);

  block.querySelectorAll('.accordionitem > div > div').forEach((item) => {
      item.setAttribute("class", "accordion-item");
      const heading = item.querySelector('h3, h4, h5, h6');
      if (heading) {
        const headingText = heading?.innerText;
        item.innerHTML = getAccordionItem(headingText);
        item.setAttribute("class", "accordion-itemHeader");
      } else {
        item.setAttribute("class", "accordion-itemContent");
      }
   });

  const accordion_items = block.querySelectorAll(':scope > div');
  accordion_items.forEach((item, i) => {
    item.addEventListener("click", () => {
      const heading = item.querySelector('.accordion-itemHeader');
      const content = item.querySelectorAll('.accordion-itemContent');
      if(!heading.classList.contains('active')){ //click on item - show content
        heading.classList.add('active');
        content?.forEach((item) => {
          item.style.display = 'block';
        });
        heading.querySelector('.expand-icon').style.display = 'none';
        heading.querySelector('.collapse-icon').style.display = 'block';
      }else{ //hide contents
        heading.classList.remove('active');
        content?.forEach((item) => {
          item.style.display = 'none';
        });
        heading.querySelector('.expand-icon').style.display = 'block';
        heading.querySelector('.collapse-icon').style.display = 'none';
      };
    });
  });

  // Decorate tables with Spectrum styling
  decorateTables(block);
}
