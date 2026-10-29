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

const SUPPORTED_ATTRIBUTES = new Set([
  'data-line',
  'data-playground-session-id',
  'data-playground-mode',
  'data-playground-execution-mode',
  'data-playground-url',
  'data-playground-url-stage',
  // Not read anywhere (the playground URL always uses session=new), but used in existing content.
  'data-playground-session',
]);

// An option starts after a space, or after a dash followed by "data-" or "disable". Splitting on
// every dash would break dashed Prism languages like shell-session.
const OPTION_BOUNDARY = /\s|-(?=data-|disable)/i;
const LEADING_DELIMITERS = /^[\s-]+/;
const QUOTED_ATTRIBUTE = /^(data-[\w-]+)=(?:"([^"]*)"|'([^']*)')/i;

/**
 * Parses a code block's language and options (`disableLineNumbers`, supported `data-*` attributes).
 * Accepts the dash-delimited form from markdown code fences (`js-disableLineNumbers-data-line="2"`)
 * and the space-delimited form from tab blocks (`js disableLineNumbers data-line="2"`).
 * Attribute values must be quoted. Anything unsupported is returned in `ignored`.
 * @returns {{
 *   language: string,
 *   disableLineNumbers: boolean,
 *   attributes: [string, string][],
 *   ignored: string[],
 * }}
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
      if (SUPPORTED_ATTRIBUTES.has(name)) attributes.push([name, doubleQuoted ?? singleQuoted]);
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
