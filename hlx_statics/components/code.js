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

// Other data-* attributes are dropped because Prism plugins read some (e.g. data-line-offset).
const isSupportedAttribute = (name) => name === 'data-line' || name.startsWith('data-playground-');

// Options start after a space or at "-data-"/"-disable", not at every dash, because shell-session
// is a language. Case-insensitive so -DisableLineNumbers is ignored, not added to the language.
const OPTION_BOUNDARY = /\s|-(?=data-|disable)/i;
const LEADING_DELIMITERS = /^[\s-]+/;
const QUOTED_ATTRIBUTE = /^(data-[\w-]+)=(?:"([^"]*)"|'([^']*)')/;

/**
 * Parses a code block's language and options from a code fence class
 * (`js-disableLineNumbers-data-line="2"`) or a tab language line
 * (`js disableLineNumbers data-line="2"`). Unsupported options go in `ignored`.
 */
export function parseCodeDirectives(text) {
  const source = (text || '').trim().replace(/^language-/, '');
  const languageEnd = source.search(OPTION_BOUNDARY);
  const language = languageEnd === -1 ? source : source.slice(0, languageEnd);
  let rest = languageEnd === -1 ? '' : source.slice(languageEnd).replace(LEADING_DELIMITERS, '');

  let disableLineNumbers = false;
  const attributes = [];
  const ignored = [];
  while (rest) {
    const attribute = rest.match(QUOTED_ATTRIBUTE);
    let consumed;
    if (attribute) {
      const [match, name, doubleQuoted, singleQuoted] = attribute;
      if (isSupportedAttribute(name)) attributes.push([name, doubleQuoted ?? singleQuoted]);
      else ignored.push(name);
      consumed = match.length;
    } else {
      const optionEnd = rest.search(OPTION_BOUNDARY);
      const option = optionEnd === -1 ? rest : rest.slice(0, optionEnd);
      if (option === 'disableLineNumbers') disableLineNumbers = true;
      else ignored.push(option);
      consumed = option.length;
    }
    rest = rest.slice(consumed).replace(LEADING_DELIMITERS, '');
  }

  return {
    language, disableLineNumbers, attributes, ignored,
  };
}

function parseAndWarn(text) {
  const directives = parseCodeDirectives(text);
  if (directives.ignored.length) {
    console.warn(`[code] Ignoring unsupported options in "${text}": ${directives.ignored.join(', ')}`);
  }
  return directives;
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
  applyCodeDirectives(pre, codeEl, parseAndWarn(languageText));
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
      const directives = parseAndWarn(cls);
      code.classList.replace(cls, `language-${directives.language}`);
      applyCodeDirectives(pre, code, directives);
    });
  }
  stripPlaygroundMetadataFromCodeContent(pre, code);

  if (pre?.classList.contains('disableLineNumbers')) {
    pre.classList.add('no-line-numbers');
  } else {
    pre?.classList.add('line-numbers');
  }

  if (!code.className.match(/language-/)) {
    code.classList.add('language-none');
  }

  code.classList.forEach((cls) => pre?.classList.add(cls));
  code.setAttribute('data-prismjs-copy', 'Copy');
  code.setAttribute('data-prismjs-copy-success', 'Copied to your clipboard');
  code.setAttribute('data-prismjs-copy-timeout', '3000');
}
