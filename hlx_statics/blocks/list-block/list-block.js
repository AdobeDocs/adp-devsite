/**
 * decorates the list-block
 * @param {Element} block The list-block element
 */

 export default function decorate(block) {
  const dynamicColor = block.getAttribute('data-iconcolor');
  const listFirstDivs = document.createElement('ul');
  const listSecondDivs = document.createElement('ul');

  [listFirstDivs, listSecondDivs].forEach(list => {
    list.classList.add('spectrum-Body', 'spectrum-Body--sizeM', 'custom-marker');
    list.style.setProperty('--marker-color', dynamicColor);
  });

  block.querySelectorAll('div').forEach(parentDiv => {
    [...parentDiv.children].forEach((child, index) => {
      if (child.textContent.trim()) {
        const listItem = document.createElement('li');
        listItem.appendChild(child);
        (index === 0 ? listFirstDivs : listSecondDivs).appendChild(listItem);
      }
    });
  });

  block.innerHTML = '';
  block.append(listFirstDivs, listSecondDivs);
}

