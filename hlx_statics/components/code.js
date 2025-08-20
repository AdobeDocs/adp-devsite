export function extractLanguageDirectives(container) {
  if (!container) return '';
  const preEl = container.querySelector('pre');
  const prev = preEl && preEl.previousElementSibling;
  if (prev && prev.tagName === 'P') {
    const text = (prev.textContent || '').trim();
    prev.remove();
    return text;
  }
  const p = container.querySelector('p');
  if (p && p.textContent) {
    const text = p.textContent.trim();
    p.remove();
    return text;
  }
  return '';
}

export function applyLanguageDirectives(pre, codeEl, languageText) {
  if (!pre || !codeEl || !languageText) return;
  const normalized = typeof languageText === 'string' ? languageText.trim() : '';
  const firstSpaceIdx = normalized.indexOf(' ');
  const langName = firstSpaceIdx === -1 ? normalized : normalized.slice(0, firstSpaceIdx);
  const lang = `language-${langName}`;
  pre.classList.add(lang);
  codeEl.classList.add(lang);

  const rest = firstSpaceIdx === -1 ? '' : normalized.slice(firstSpaceIdx + 1);
  if (rest && rest.indexOf('disableLineNumbers') !== -1) {
    pre.classList.add('disableLineNumbers');
  }

  const readAttr = (source, name) => {
    const needle = `${name}=`;
    const idx = source.indexOf(needle);
    if (idx === -1) return null;
    const start = idx + needle.length;
    const quote = source[start];
    if (quote === '"' || quote === "'") {
      const end = source.indexOf(quote, start + 1);
      if (end === -1) return null;
      return source.slice(start + 1, end);
    }
    let end = source.indexOf(' ', start);
    if (end === -1) end = source.length;
    return source.slice(start, end);
  };

  const dataLineRaw = readAttr(rest, 'data-line');
  if (dataLineRaw != null) {
    let value = dataLineRaw;
    if (value.endsWith(',')) value = value.slice(0, -1);
    codeEl.setAttribute('data-line', value);
  }
  const offsetRaw = readAttr(rest, 'data-line-offset');
  if (offsetRaw != null) {
    codeEl.setAttribute('data-line-offset', offsetRaw);
  }
}

export default function decoratePreformattedCode(block) {
  const pre = block.querySelector('pre');
  // see https://prismjs.com/plugins/line-numbers/#how-to-use
  if (pre?.classList.contains("disableLineNumbers")) {
    pre?.classList.add('no-line-numbers');
  }
  else {
    pre?.classList.add('line-numbers');
  }

  const code = block.querySelector('code');
  const dataLine = code.getAttribute('data-line');
  const dataLineOffset = code.getAttribute('data-line-offset');
  if (dataLine) {
    pre.setAttribute('data-line', dataLine);
  }
  if (dataLineOffset) {
    pre.setAttribute('data-line-offset', dataLineOffset);
  } 
  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }

  code.classList.forEach(cls => pre.classList.add(cls));
  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
