/**
 * @param {Element} block The HTML loader block
 */
export default async function decorate(block) {
  // The authored content should be a link to the standalone HTML page
  const link = block.querySelector('a');
  const src = link ? link.href : block.textContent.trim();

  if (!src) {
    // eslint-disable-next-line no-console
    console.error('HTML Loader: no source URL found in block');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('HTML Loader: source URL resolved to', src);

  const iframe = document.createElement('iframe');
  iframe.title = 'FaaS Form';
  iframe.loading = 'lazy';
  iframe.style.width = '100%';
  iframe.style.height = '900px';
  iframe.style.border = '0';
  iframe.style.display = 'block';

  // Use src (real navigation), NOT srcdoc — preserves window.location.host,
  // relative paths, and script execution exactly as the original page has it.
  iframe.src = src;

  iframe.addEventListener('load', () => {
    console.log('HTML Loader: iframe loaded', src);
  });
  iframe.addEventListener('error', () => {
    console.error('HTML Loader: iframe failed to load', src);
  });

  block.replaceChildren(iframe);
}