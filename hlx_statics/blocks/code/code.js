import decoratePreformattedCode, { applyLanguageDirectives } from '../../components/code.js';

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

  const languageClass = [...pre.classList].find(cls => cls.startsWith('language-'))
    || (code && [...code.classList].find(cls => cls.startsWith('language-')));
  let language = languageClass ? languageClass.replace('language-', '') : 'none';

  if (language) {
    applyLanguageDirectives(pre, code, language);
  }
  decoratePreformattedCode(block);
}
