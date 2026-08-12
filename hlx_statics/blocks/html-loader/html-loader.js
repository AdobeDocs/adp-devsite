export default function decorate(block) {
  const code = block.querySelector('pre code');
  if (!code) return;
  block.innerHTML = code.textContent;
}