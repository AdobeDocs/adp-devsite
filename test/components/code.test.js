import { expect } from '@esm-bundle/chai';

const {
  default: decoratePreformattedCode,
  applyLanguageDirectives,
  parseCodeDirectives,
} = await import('../../hlx_statics/components/code.js');

const devDocs = { devDocs: true };
const devBiz = { devDocs: false };

function decorate(codeClass, text = 'a\nb\nc') {
  const block = document.createElement('div');
  block.innerHTML = '<pre><code></code></pre>';
  const code = block.querySelector('code');
  code.className = codeClass;
  code.textContent = text;
  decoratePreformattedCode(block);
  return { pre: block.querySelector('pre'), code };
}

describe('parseCodeDirectives', () => {
  it('reads a plain language', () => {
    expect(parseCodeDirectives('language-js', devDocs)).to.deep.equal({ language: 'js', disableLineNumbers: false, attributes: [] });
  });

  it('reads dash-delimited data-line', () => {
    expect(parseCodeDirectives('language-javascript-data-line="2,4"', devDocs).attributes).to.deep.equal([['data-line', '2,4']]);
  });

  it('reads dash-delimited disableLineNumbers in either order on DevDocs', () => {
    ['js-disableLineNumbers-data-line="2-3"', 'js-data-line="2-3"-disableLineNumbers'].forEach((text) => {
      expect(parseCodeDirectives(text, devDocs)).to.deep.equal({ language: 'js', disableLineNumbers: true, attributes: [['data-line', '2-3']] });
    });
  });

  it('keeps dash-delimited disableLineNumbers in the language on DevBiz', () => {
    expect(parseCodeDirectives('bash-disableLineNumbers', devBiz)).to.deep.equal({ language: 'bash-disableLineNumbers', disableLineNumbers: false, attributes: [] });
    expect(parseCodeDirectives('js-data-line="2"-disableLineNumbers', devBiz).language).to.equal('js-disableLineNumbers');
  });

  it('reads playground attributes in order', () => {
    const text = 'js-data-playground-session-id="s"-data-playground-mode="playground"-data-playground-execution-mode="script"-data-playground-url="https://example.com/new"';
    expect(parseCodeDirectives(text, devDocs).attributes).to.deep.equal([
      ['data-playground-session-id', 's'],
      ['data-playground-mode', 'playground'],
      ['data-playground-execution-mode', 'script'],
      ['data-playground-url', 'https://example.com/new'],
    ]);
  });

  it('drops a cut-off attribute value', () => {
    const text = 'js-data-playground-mode="playground"-data-playground-execution-mode="scri';
    expect(parseCodeDirectives(text, devDocs).attributes).to.deep.equal([['data-playground-mode', 'playground']]);
  });

  it('passes unknown data attributes through', () => {
    expect(parseCodeDirectives('js-data-line-offset="2"-data-line="3"', devDocs).attributes)
      .to.deep.equal([['data-line-offset', '2'], ['data-line', '3']]);
  });

  it('keeps unknown words before data attributes in the language', () => {
    expect(parseCodeDirectives('js-foo-data-line="2"', devDocs).language).to.equal('js-foo');
  });

  it('ignores unquoted dash-delimited values and keeps a trailing comma', () => {
    expect(parseCodeDirectives('js-data-line=2,4', devDocs).attributes).to.deep.equal([]);
    expect(parseCodeDirectives('js-data-line="2,4,"', devDocs).attributes).to.deep.equal([['data-line', '2,4,']]);
  });

  it('reads the space-delimited form in both modes', () => {
    [devDocs, devBiz].forEach((options) => {
      expect(parseCodeDirectives('js disableLineNumbers data-line="1-2"', options))
        .to.deep.equal({ language: 'js', disableLineNumbers: true, attributes: [['data-line', '1-2']] });
    });
  });

  it('accepts unquoted space-delimited values, trims a trailing comma, and ignores unknown words', () => {
    expect(parseCodeDirectives('js data-line=2,4,', devBiz).attributes).to.deep.equal([['data-line', '2,4']]);
    expect(parseCodeDirectives('js foo', devBiz)).to.deep.equal({ language: 'js', disableLineNumbers: false, attributes: [] });
  });
});

describe('decoratePreformattedCode', () => {
  it('moves dash-delimited attributes off the class and onto pre and code', () => {
    const { pre, code } = decorate('language-javascript-data-line="2,4"');
    expect(code.className).to.equal('language-javascript');
    expect(pre.classList.contains('language-javascript')).to.be.true;
    expect(pre.classList.contains('line-numbers')).to.be.true;
    expect(pre.getAttribute('data-line')).to.equal('2,4');
    expect(code.getAttribute('data-line')).to.equal('2,4');
  });

  it('falls back to language-none', () => {
    const { pre, code } = decorate('');
    expect(code.classList.contains('language-none')).to.be.true;
    expect(pre.classList.contains('language-none')).to.be.true;
  });

  it('leaves non-language classes alone', () => {
    const { pre, code } = decorate('extra language-js');
    expect(code.className).to.equal('extra language-js');
    expect(pre.classList.contains('extra')).to.be.true;
  });

  it('reads playground attributes spilled into the first line of code', () => {
    const { pre, code } = decorate(
      'language-js-data-playground-mode="playground"',
      '-data-playground-url="https://example.com/new"\nconst a = 1;',
    );
    expect(pre.getAttribute('data-playground-mode')).to.equal('playground');
    expect(pre.getAttribute('data-playground-url')).to.equal('https://example.com/new');
    expect(code.textContent).to.equal('const a = 1;');
  });

  it('disables line numbers set by space-delimited tab directives', () => {
    const block = document.createElement('div');
    block.innerHTML = '<pre><code>a\nb</code></pre>';
    const pre = block.querySelector('pre');
    const code = block.querySelector('code');
    applyLanguageDirectives(pre, code, 'js disableLineNumbers data-line="2"');
    decoratePreformattedCode(block);
    expect(code.className).to.equal('language-js');
    expect(pre.classList.contains('no-line-numbers')).to.be.true;
    expect(pre.classList.contains('line-numbers')).to.be.false;
    expect(pre.getAttribute('data-line')).to.equal('2');
  });
});
