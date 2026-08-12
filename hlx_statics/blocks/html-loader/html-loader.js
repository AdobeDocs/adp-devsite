/**
 * @param {Element} block The HTML loader block
 */
export default async function decorate(block) {
  console.log('block markup:', block.innerHTML);

  const link = block.querySelector('a');
  const src = link ? link.href : block.textContent.trim();

  console.log('resolved src:', src);

  if (!src) {
    console.error('html-loader: no src found in block');
    return;
  }

  block.textContent = '';

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = 'FaaS Test Form';
  iframe.style.width = '100%';
  iframe.style.height = '800px';
  iframe.style.border = 'none';
  iframe.loading = 'lazy';

  block.append(iframe);
}