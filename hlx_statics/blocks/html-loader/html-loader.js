/**
 * @param {Element} block The HTML loader block
 */
export default async function decorate(block) {
  const code = block.querySelector('pre code');

  if (!code) {
    console.error('html-loader: no <pre><code> found in block');
    return;
  }

  const html = code.textContent;

  block.textContent = '';

  const iframe = document.createElement('iframe');
  iframe.title = 'FaaS Test Form';
  iframe.style.width = '100%';
  iframe.style.height = '800px';
  iframe.style.border = 'none';

  block.append(iframe);

  // srcdoc renders the HTML string directly, scripts included,
  // in an isolated iframe context — no fetch needed.
  iframe.srcdoc = html;
}