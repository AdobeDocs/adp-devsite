export default function decorate(block) {
  const listFirstDivs = document.createElement('ul');
  const listSecondDivs = document.createElement('ul');

  listFirstDivs.classList.add('spectrum-Body', 'spectrum-Body--sizeM', 'custom-marker');
  listSecondDivs.classList.add('spectrum-Body', 'spectrum-Body--sizeM', 'custom-marker');
  
  const dynamicColor =  block.getAttribute('data-iconcolor'); 

  listFirstDivs.style.setProperty('--marker-color', dynamicColor);
  listSecondDivs.style.setProperty('--marker-color', dynamicColor);

  const divs = block.querySelectorAll('div');

  divs.forEach(parentDiv => {
    const firstDiv = parentDiv.querySelector('div:first-child');
    const secondDiv = parentDiv.querySelector('div:nth-child(2)');

    const firstDivListItem = document.createElement('li');
    const secondDivListItem = document.createElement('li');

    if (firstDiv && firstDiv.textContent.trim() !== '') {
      firstDivListItem.appendChild(firstDiv);
    }

    if (secondDiv && secondDiv.textContent.trim() !== '') {
      secondDivListItem.appendChild(secondDiv);
    }

    if (firstDivListItem.hasChildNodes()) {
      listFirstDivs.appendChild(firstDivListItem);
    }

    if (secondDivListItem.hasChildNodes()) {
      listSecondDivs.appendChild(secondDivListItem);
    }
  });

  block.innerHTML = '';
  block.appendChild(listFirstDivs);
  block.appendChild(listSecondDivs);
}
