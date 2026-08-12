export default async function decorate(block) {
  const code = block.querySelector('pre code');

  if (!code) return;

  const html = code.textContent;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Load styles
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = link.href;
    document.head.append(stylesheet);
  });

  // Load inline styles
  doc.querySelectorAll('style').forEach((style) => {
    document.head.append(style.cloneNode(true));
  });

  // Render body
  block.replaceChildren(...doc.body.childNodes);
}