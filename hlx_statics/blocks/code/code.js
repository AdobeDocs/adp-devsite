import decoratePreformattedCode from '../../components/code.js';

export default function decorate(block) {
  const pre = document.createElement('pre');
  const code = block.querySelector('code');
  if (!code.className.match(/language-/)) {
    code.classList.add('language-bash');
  }
  code.parentElement.replaceChild(pre, code);
  pre.appendChild(code);
  decoratePreformattedCode(block);
}
