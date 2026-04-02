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
}

/**
 * Strips leading lines in code text that contain data-playground-* attributes (e.g. on stage
 * the first line can be "-data-playground-url=\"https://...\""). Extracts attributes, sets
 * them on pre/code, and removes those lines from the displayed code.
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

/**
 * Parses code element classes like "language-js-data-playground-session-id=\"x\"" and
 * sets the corresponding data attributes on both pre and code (e.g. data-playground-session-id).
 * Also cleans the class list to only keep the language class. Use so "Try in playground" works.
 */
function applyDataAttributesFromCodeClasses(pre, code) {
  if (!pre || !code) return;
  [...code.classList].forEach((cls) => {
    if (cls.includes('-data')) {
      const parts = cls.split('-data');
      const languagePart = parts.find((item) => item.includes('language-'));

      parts.forEach((item) => {
        if (!item.includes('language-') && item.includes('=')) {
          const match = item.match(/^-?([^=]+)="?([^"]*)"?$/);
          if (match) {
            const attrName = `data-${match[1]}`;
            const attrValue = match[2];
            pre.setAttribute(attrName, attrValue);
            code.setAttribute(attrName, attrValue);
          }
        }
      });

      code.classList.remove(cls);
      pre.classList.remove(cls);
      if (languagePart) {
        const cleanClass = languagePart.trim();
        code.classList.add(cleanClass);
        pre.classList.add(cleanClass);
      }
    } else {
      pre.classList.add(cls);
    }
  });
}

export default function decoratePreformattedCode(block) {
  const pre = block.querySelector('pre') || (block.tagName === 'PRE' && block) || null;
  const code = block.querySelector('code');

  applyDataAttributesFromCodeClasses(pre, code);
  stripPlaygroundMetadataFromCodeContent(pre, code);

  if(pre && IS_DEV_DOCS){
    const processClasses = (element) => {
      element.className = Array.from(element.classList).map(className => {
        let cleanClassName = className;

        const dataLineMatch = className.match(/data-line="([^"]*)"/);
        if(dataLineMatch) {
          pre.setAttribute('data-line', dataLineMatch[1]);
          code?.setAttribute('data-line', dataLineMatch[1]);
          cleanClassName = cleanClassName.replace(/-data-line="[^"]*"/, '');
        }

        if(className.includes('disableLineNumbers')) {
          pre.classList.add('disableLineNumbers');
          cleanClassName = cleanClassName.replace(/-disableLineNumbers/, '');
        }
        
        return cleanClassName;
      }).filter(className => className.trim()).join(' ');
    };
    
    processClasses(pre);
    code && processClasses(code);
  }

  if (pre?.classList.contains('disableLineNumbers')) {
    pre?.classList.add('no-line-numbers');
  }
  else {
    pre?.classList.add('line-numbers');
  }
  
  const dataLine = code.getAttribute('data-line');
  if (dataLine) {
    pre.setAttribute('data-line', dataLine);
  }
  
  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }

  code.classList.forEach(cls => pre?.classList.add(cls));
  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
