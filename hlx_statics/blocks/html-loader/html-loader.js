/**
 * @param {Element} block The HTML loader block
 */
export default async function decorate(block) {
  console.log('HTML Loader block:', block);

  const htmlContent = block.textContent.trim();

  console.log('HTML Content:', htmlContent);

  if (!htmlContent) {
    console.error('HTML Loader: No HTML content found');
    return;
  }

  const iframe = document.createElement('iframe');

  iframe.title = 'FaaS Test FaaS Form';
  iframe.style.width = '100%';
  iframe.style.height = '900px';
  iframe.style.border = '0';
  iframe.style.display = 'block';

  iframe.srcdoc = htmlContent;

  block.replaceChildren(iframe);

  console.log('HTML Loader: rendered');
}