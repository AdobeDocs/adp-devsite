/**
 * decorates the title
 * @param {Element} block The title block element {Parameter Type} Name of the Parameter
 */
 export default async function decorate(block) {
    const summaryText = block.getAttribute('data-summary') || '';
    const subText = block.getAttribute('data-subtext') || '';
    const detailsTag = document.createElement('details');

    detailsTag.innerHTML = `<summary>${summaryText}</summary><p>${subText}</p>`;
    Array.from(block.children).forEach(child => detailsTag.appendChild(child));
    
    block.innerHTML = '';
    block.appendChild(detailsTag);
}
