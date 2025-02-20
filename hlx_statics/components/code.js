export default function decoratePreformattedCode(block) {
  const pre = block.querySelector('pre');
  // see https://prismjs.com/plugins/line-numbers/#how-to-use
  pre.classList.add('line-numbers');

  const code = block.querySelector('code');
  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }
  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
