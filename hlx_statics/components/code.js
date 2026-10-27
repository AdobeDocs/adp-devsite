import { IS_DEV_DOCS } from "../scripts/lib-helix.js";

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

function readAttribute(source, name) {
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
}

/**
 * Parses a code block's language and directives (`disableLineNumbers`, `data-*` attributes).
 * Accepts the dash-delimited form from markdown code fences (`js-disableLineNumbers-data-line="2"`)
 * and the space-delimited form from tab blocks (`js disableLineNumbers data-line="2"`).
 * @returns {{ language: string, disableLineNumbers: boolean, attributes: [string, string][] }}
 */
export function parseCodeDirectives(text, { devDocs = IS_DEV_DOCS } = {}) {
  const normalized = (text || '').trim().replace(/^language-/, '');
  const spaceIdx = normalized.indexOf(' ');
  const head = spaceIdx === -1 ? normalized : normalized.slice(0, spaceIdx);
  const rest = spaceIdx === -1 ? '' : normalized.slice(spaceIdx + 1);

  const attributes = [];
  let disableLineNumbers = rest.includes('disableLineNumbers');
  const dataLine = readAttribute(rest, 'data-line');
  if (dataLine != null) attributes.push(['data-line', dataLine.replace(/,$/, '')]);

  const dataIdx = head.indexOf('-data');
  let language = dataIdx === -1 ? head : head.slice(0, dataIdx);
  if (dataIdx !== -1) {
    head.slice(dataIdx).split('-data').forEach((part) => {
      const match = part.match(/^-?([^=]+)="([^"]*)"/);
      if (match) attributes.push([`data-${match[1]}`, match[2]]);
    });
  }

  if (head.includes('disableLineNumbers')) {
    if (devDocs) {
      language = language.replace('-disableLineNumbers', '');
      disableLineNumbers = true;
    } else if (!language.includes('disableLineNumbers')) {
      // DevBiz only supports disableLineNumbers in the space-delimited form for now.
      language += '-disableLineNumbers';
    }
  }

  return { language, disableLineNumbers, attributes };
}

function applyCodeDirectives(pre, code, { language, disableLineNumbers, attributes }) {
  if (language) {
    pre.classList.add(`language-${language}`);
    code.classList.add(`language-${language}`);
  }
  if (disableLineNumbers) pre.classList.add('disableLineNumbers');
  attributes.forEach(([name, value]) => {
    pre.setAttribute(name, value);
    code.setAttribute(name, value);
  });
}

export function applyLanguageDirectives(pre, codeEl, languageText) {
  if (!pre || !codeEl || !languageText) return;
  applyCodeDirectives(pre, codeEl, parseCodeDirectives(languageText));
}

/**
 * Strips leading lines in code text that contain data-playground-* attributes. Long code fence
 * info strings inside grid tables (e.g. <CodeBlock>) get cut, and the rest spills into the first
 * line of code (see DEVSITE-2746). Extracts attributes, sets them on pre/code, and removes those
 * lines from the displayed code.
 */
function stripPlaygroundMetadataFromCodeContent(pre, code) {
  if (!pre || !code) return;
  const text = code.textContent || '';
  const lines = text.split(/\r?\n/);
  const re = /(?:-?)data-playground-([a-z0-9-]+)="((?:[^"\\]|\\.)*)"/g;
  const newLines = [];
  let stripping = true;
  for (const line of lines) {
    if (!stripping) {
      newLines.push(line);
      continue;
    }
    let match;
    let found = false;
    re.lastIndex = 0;
    while ((match = re.exec(line)) !== null) {
      found = true;
      const attrName = `data-playground-${match[1]}`;
      const raw = match[2];
      const value = raw.replace(/\\./g, (s) => s.slice(1));
      pre.setAttribute(attrName, value);
      code.setAttribute(attrName, value);
    }
    if (!found) stripping = false;
    if (found) continue;
    newLines.push(line);
  }
  const newText = newLines.join('\n');
  if (newText !== text) code.textContent = newText;
}

export default function decoratePreformattedCode(block) {
  const pre = block.querySelector('pre') || (block.tagName === 'PRE' && block) || null;
  const code = block.querySelector('code');

  if (pre && code) {
    [...code.classList].filter((cls) => cls.startsWith('language-')).forEach((cls) => {
      const directives = parseCodeDirectives(cls);
      code.classList.replace(cls, `language-${directives.language}`);
      applyCodeDirectives(pre, code, directives);
    });
  }
  stripPlaygroundMetadataFromCodeContent(pre, code);

  if (pre?.classList.contains('disableLineNumbers')) {
    pre?.classList.add('no-line-numbers');
  }
  else {
    pre?.classList.add('line-numbers');
  }
  
  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }

  code.classList.forEach(cls => pre?.classList.add(cls));
  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
