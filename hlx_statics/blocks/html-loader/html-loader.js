export default async function decorate(block) {
  const link = block.querySelector('a');
  const html = await (await fetch(link.href)).text();

  const shadowHost = document.createElement('div');
  block.textContent = '';
  block.append(shadowHost);
  const shadow = shadowHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = html; // still won't execute <script> tags — you'd need to manually re-inject them
}