import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const {
  default: decoratePreformattedCode,
  applyLanguageDirectives,
  parseCodeDirectives,
} = await import('../../hlx_statics/components/code.js');

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
    expect(parseCodeDirectives('language-js')).to.deep.equal({
      language: 'js', disableLineNumbers: false, attributes: [], ignored: [],
    });
  });

  it('reads dash-delimited data-line', () => {
    expect(parseCodeDirectives('language-javascript-data-line="2,4"').attributes).to.deep.equal([['data-line', '2,4']]);
  });

  it('reads dash-delimited disableLineNumbers in either order', () => {
    ['js-disableLineNumbers-data-line="2-3"', 'js-data-line="2-3"-disableLineNumbers'].forEach((text) => {
      expect(parseCodeDirectives(text)).to.deep.equal({
        language: 'js', disableLineNumbers: true, attributes: [['data-line', '2-3']], ignored: [],
      });
    });
  });

  it('reads playground attributes in order', () => {
    const text = 'js-data-playground-session-id="s"-data-playground-mode="playground"-data-playground-execution-mode="script"-data-playground-url="https://example.com/new"';
    expect(parseCodeDirectives(text).attributes).to.deep.equal([
      ['data-playground-session-id', 's'],
      ['data-playground-mode', 'playground'],
      ['data-playground-execution-mode', 'script'],
      ['data-playground-url', 'https://example.com/new'],
    ]);
  });

  it('accepts data-playground-session without warning', () => {
    expect(parseCodeDirectives('js-data-playground-session="new"')).to.deep.equal({
      language: 'js', disableLineNumbers: false, attributes: [['data-playground-session', 'new']], ignored: [],
    });
  });

  it('ignores a cut-off attribute value', () => {
    const text = 'js-data-playground-mode="playground"-data-playground-execution-mode="scri';
    expect(parseCodeDirectives(text)).to.deep.include({
      attributes: [['data-playground-mode', 'playground']],
      ignored: ['data-playground-execution-mode="scri'],
    });
  });

  it('ignores unsupported data attributes', () => {
    expect(parseCodeDirectives('js-data-line-offset="2"-data-line="3"')).to.deep.include({
      attributes: [['data-line', '3']],
      ignored: ['data-line-offset'],
    });
  });

  it('ignores unknown words after an option', () => {
    expect(parseCodeDirectives('js-data-line="2"-foo')).to.deep.include({
      language: 'js', attributes: [['data-line', '2']], ignored: ['foo'],
    });
  });

  it('ignores a misspelled disableLineNumbers instead of adding it to the language', () => {
    ['js-disablelinenumbers', 'js-disableLineNumber-data-line="2"'].forEach((text) => {
      const { language, disableLineNumbers, ignored } = parseCodeDirectives(text);
      expect({ language, disableLineNumbers, ignored: ignored.length }).to.deep.equal({ language: 'js', disableLineNumbers: false, ignored: 1 });
    });
  });

  it('keeps dashed languages intact', () => {
    expect(parseCodeDirectives('language-shell-session').language).to.equal('shell-session');
    expect(parseCodeDirectives('shell-session-data-line="2"')).to.deep.include({ language: 'shell-session', attributes: [['data-line', '2']] });
    expect(parseCodeDirectives('js-foo-data-line="2"').language).to.equal('js-foo');
  });

  it('ignores unquoted values in both forms', () => {
    expect(parseCodeDirectives('js-data-line=2,4')).to.deep.include({ language: 'js', attributes: [], ignored: ['data-line=2,4'] });
    expect(parseCodeDirectives('js data-line=2,4')).to.deep.include({ language: 'js', attributes: [], ignored: ['data-line=2,4'] });
    expect(parseCodeDirectives('js-data-line=2-4-disableLineNumbers')).to.deep.include({ disableLineNumbers: true, ignored: ['data-line=2-4'] });
  });

  it('accepts single-quoted values', () => {
    expect(parseCodeDirectives("js-data-line='2'").attributes).to.deep.equal([['data-line', '2']]);
  });

  it('passes data-line through as written', () => {
    expect(parseCodeDirectives('js-data-line="2,4,"').attributes).to.deep.equal([['data-line', '2,4,']]);
    expect(parseCodeDirectives('js data-line="2,4,"').attributes).to.deep.equal([['data-line', '2,4,']]);
  });

  it('reads the space-delimited form', () => {
    expect(parseCodeDirectives('js disableLineNumbers data-line="1-2"')).to.deep.equal({
      language: 'js', disableLineNumbers: true, attributes: [['data-line', '1-2']], ignored: [],
    });
  });

  it('ignores unknown space-delimited words', () => {
    expect(parseCodeDirectives('js foo')).to.deep.equal({
      language: 'js', disableLineNumbers: false, attributes: [], ignored: ['foo'],
    });
  });
});

describe('decoratePreformattedCode', () => {
  let warn;
  beforeEach(() => { warn = sinon.stub(console, 'warn'); });
  afterEach(() => { warn.restore(); });

  it('moves dash-delimited attributes off the class and onto pre and code', () => {
    const { pre, code } = decorate('language-javascript-data-line="2,4"');
    expect(code.className).to.equal('language-javascript');
    expect(pre.classList.contains('language-javascript')).to.be.true;
    expect(pre.classList.contains('line-numbers')).to.be.true;
    expect(pre.getAttribute('data-line')).to.equal('2,4');
    expect(code.getAttribute('data-line')).to.equal('2,4');
    expect(warn.called).to.be.false;
  });

  it('disables line numbers from the dash-delimited form', () => {
    const { pre, code } = decorate('language-bash-disableLineNumbers');
    expect(code.className).to.equal('language-bash');
    expect(pre.classList.contains('no-line-numbers')).to.be.true;
    expect(pre.classList.contains('line-numbers')).to.be.false;
  });

  it('warns about ignored options and still highlights the language', () => {
    const { pre, code } = decorate('language-js-disablelinenumbers-data-line-offset="2"');
    expect(code.className).to.equal('language-js');
    expect(pre.hasAttribute('data-line-offset')).to.be.false;
    expect(pre.classList.contains('line-numbers')).to.be.true;
    expect(warn.calledOnce).to.be.true;
    expect(warn.firstCall.args[0]).to.include('disablelinenumbers, data-line-offset');
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
