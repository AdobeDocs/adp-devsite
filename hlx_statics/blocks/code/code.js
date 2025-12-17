import decoratePreformattedCode from '../../components/code.js';

export default function decorate(block) {
  const code = block.querySelector('code');
  const pre = document.createElement('pre');
  code.parentElement.replaceChild(pre, code);
  pre.appendChild(code);
  decoratePreformattedCode(block);
}
