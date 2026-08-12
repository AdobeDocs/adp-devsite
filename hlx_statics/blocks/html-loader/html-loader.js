export default async function decorate(block) {
  const code = block.querySelector('pre code');
  if (!code) return;

  const html = code.textContent;

  // Parse the HTML string into a document
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  block.textContent = '';

  // Move body content in
  block.append(...doc.body.childNodes);

  // Re-create scripts so they actually execute (innerHTML-inserted scripts don't run)
  const scripts = block.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    oldScript.replaceWith(newScript);
  });
}