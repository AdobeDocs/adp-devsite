/**
 * decorates the title
 * @param {Element} block The title block element {Parameter Type} Name of the Parameter
 */
export default async function decorate(block) {
    // Define allowed colors
    const colorMap = {
        'red': 'rgb(187, 2, 2)',
        'green': 'rgb(0, 128, 0)',
        'blue': 'rgb(4, 105, 227)'
    };

    // Get background color from data attribute or class name
    let requestedColor = block.getAttribute('data-backgroundcolor')?.toLowerCase();
    
    // If no data attribute, check for class name like 'background-color-blue'
    if (!requestedColor) {
        const classList = Array.from(block.classList);
        const colorClass = classList.find(cls => cls.startsWith('background-color-'));
        if (colorClass) {
            requestedColor = colorClass.replace('background-color-', '');
        }
    }
    
    const backgroundColor = colorMap[requestedColor] || colorMap['red'];

    block.querySelectorAll('.edition > div > div').forEach((div) => {
        Object.assign(div.style, {
            backgroundColor: backgroundColor,
            color: "white",
            fontSize: "12px"
        });
    })

    const contentElement = document.querySelector('.edition > div > div > p:first-of-type');
    const spanElement = document.createElement('span');
    spanElement.innerHTML = contentElement.innerHTML;

    for (let i = 0; i < contentElement.attributes.length; i++) {
        let attr = contentElement.attributes[i];
        spanElement.setAttribute(attr.name, attr.value);
    }

    contentElement.parentNode.replaceChild(spanElement, contentElement);
    const removeChildNode = document.querySelector('.edition > div > div > p');

    if (removeChildNode) {
        const anchorTag = removeChildNode.querySelector('a');
        if (anchorTag) {
            anchorTag.setAttribute('rel', 'noopener noreferrer');
            anchorTag.setAttribute('target', '_blank');
            anchorTag.removeAttribute('title');
            removeChildNode.parentNode.replaceChild(anchorTag, removeChildNode);
            spanElement.appendChild(anchorTag);
        }
    }
}
