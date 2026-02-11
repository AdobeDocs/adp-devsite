import decoratePreformattedCode, { applyLanguageDirectives, extractLanguageDirectives } from '../../components/code.js';

export default function decorate(block) {
  const code = block.querySelector('code');
  let pre;
  if (code.parentElement && code.parentElement.tagName === 'PRE') {
    pre = code.parentElement;
  } else {
    pre = document.createElement('pre');
    code.parentElement.replaceChild(pre, code);
    pre.appendChild(code);
  }
  // Process each class from code element
  [...code.classList].forEach(cls => {
    if (cls.includes('-data')) {
      const parts = cls.split('-data');
      const languagePart = parts.find(item => item.includes('language-'));

      // Add data attributes from class parts
      parts.forEach(item => {
        if (!item.includes('language-') && item.includes('=')) {
          const match = item.match(/^-?([^=]+)="?([^"]*)"?$/);
          if (match) {
            const attrName = `data-${match[1]}`;
            const attrValue = match[2];
            pre.setAttribute(attrName, attrValue);
            code.setAttribute(attrName, attrValue);
          }
        }
      });

      // Remove the messy class and add clean language class
      code.classList.remove(cls);
      pre.classList.remove(cls);
      if (languagePart) {
        const cleanClass = languagePart.trim();
        code.classList.add(cleanClass);
        pre.classList.add(cleanClass);
      }
    } else {
      pre.classList.add(cls);
    }
  });

  const languageClass = [...pre.classList].find(cls => cls.startsWith('language-'));
  let language = languageClass ? languageClass.replace('language-', '') : 'none';

  if (language) {
    applyLanguageDirectives(pre, code, language);
  }
  decoratePreformattedCode(block);
}
