import decoratePreformattedCode, { applyLanguageDirectives, extractLanguageDirectives } from '../../components/code.js';

export default function decorate(block) {
  const language = extractLanguageDirectives(block);
  const code = block.querySelector('code');
  let pre;
  if (code.parentElement && code.parentElement.tagName === 'PRE') {
    pre = code.parentElement;
  } else {
    pre = document.createElement('pre');
    code.parentElement.replaceChild(pre, code);
    pre.appendChild(code);
  }
  code.classList.forEach(cls => pre.classList.add(cls));
  if (language) {
    applyLanguageDirectives(pre, code, language);
  }
  decoratePreformattedCode(block);
}
