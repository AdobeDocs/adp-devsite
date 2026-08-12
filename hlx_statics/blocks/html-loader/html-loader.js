/**
 * Decorates the HTML loader block.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  console.log('block:', block);

  // Get the HTML stored inside the block as text
  const htmlContent = block.textContent.trim();

  console.log('HTML Content:', htmlContent);

  // Create iframe
  const iframe = document.createElement('iframe');

  iframe.title = 'HTML Preview';
  iframe.style.width = '100%';
  iframe.style.minHeight = '800px';
  iframe.style.border = '0';

  // Load the HTML content inside the iframe
  iframe.srcdoc = htmlContent;

  // Remove the original content
  block.replaceChildren(iframe);
}