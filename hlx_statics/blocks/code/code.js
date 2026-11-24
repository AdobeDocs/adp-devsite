import decoratePreformattedCode from '../../components/code.js';

export default function decorate(block) {
  const code = block.querySelector('code');
  if (code.parentElement?.tagName !== 'PRE') {
    const pre = document.createElement('pre');
    code.replaceWith(pre);
    pre.append(code);
  }
  decoratePreformattedCode(block);
}
