/* PrismJS 1.29.0
https://prismjs.com/download.html#themes=prism-tomorrow&plugins=line-numbers+autoloader+toolbar+copy-to-clipboard */
const _self = typeof window !== 'undefined' ? window : typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope ? self : {}; const Prism = (function (e) {
  const n = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i; let t = 0; const r = {}; var a = {
    manual: e.Prism && e.Prism.manual,
    disableWorkerMessageHandler: e.Prism && e.Prism.disableWorkerMessageHandler,
    util: {
      encode: function e(n) { return n instanceof i ? new i(n.type, e(n.content), n.alias) : Array.isArray(n) ? n.map(e) : n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' '); }, type(e) { return Object.prototype.toString.call(e).slice(8, -1); }, objId(e) { return e.__id || Object.defineProperty(e, '__id', { value: ++t }), e.__id; }, clone: function e(n, t) { let r; let i; switch (t = t || {}, a.util.type(n)) { case 'Object': if (i = a.util.objId(n), t[i]) return t[i]; for (const l in r = {}, t[i] = r, n)n.hasOwnProperty(l) && (r[l] = e(n[l], t)); return r; case 'Array': return i = a.util.objId(n), t[i] ? t[i] : (r = [], t[i] = r, n.forEach(((n, a) => { r[a] = e(n, t); })), r); default: return n; } }, getLanguage(e) { for (;e;) { const t = n.exec(e.className); if (t) return t[1].toLowerCase(); e = e.parentElement; } return 'none'; }, setLanguage(e, t) { e.className = e.className.replace(RegExp(n, 'gi'), ''), e.classList.add(`language-${t}`); }, currentScript() { if (typeof document === 'undefined') return null; if ('currentScript' in document) return document.currentScript; try { throw new Error(); } catch (r) { const e = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack) || [])[1]; if (e) { const n = document.getElementsByTagName('script'); for (const t in n) if (n[t].src == e) return n[t]; } return null; } }, isActive(e, n, t) { for (let r = `no-${n}`; e;) { const a = e.classList; if (a.contains(n)) return !0; if (a.contains(r)) return !1; e = e.parentElement; } return !!t; },
    },
    languages: {
      plain: r, plaintext: r, text: r, txt: r, extend(e, n) { const t = a.util.clone(a.languages[e]); for (const r in n)t[r] = n[r]; return t; }, insertBefore(e, n, t, r) { const i = (r = r || a.languages)[e]; const l = {}; for (const o in i) if (i.hasOwnProperty(o)) { if (o == n) for (const s in t)t.hasOwnProperty(s) && (l[s] = t[s]); t.hasOwnProperty(o) || (l[o] = i[o]); } const u = r[e]; return r[e] = l, a.languages.DFS(a.languages, (function (n, t) { t === u && n != e && (this[n] = l); })), l; }, DFS: function e(n, t, r, i) { i = i || {}; const l = a.util.objId; for (const o in n) if (n.hasOwnProperty(o)) { t.call(n, o, n[o], r || o); const s = n[o]; const u = a.util.type(s); u !== 'Object' || i[l(s)] ? u !== 'Array' || i[l(s)] || (i[l(s)] = !0, e(s, t, o, i)) : (i[l(s)] = !0, e(s, t, null, i)); } },
    },
    plugins: {},
    highlightAll(e, n) { a.highlightAllUnder(document, e, n); },
    highlightAllUnder(e, n, t) { const r = { callback: t, container: e, selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code' }; a.hooks.run('before-highlightall', r), r.elements = Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)), a.hooks.run('before-all-elements-highlight', r); for (var i, l = 0; i = r.elements[l++];)a.highlightElement(i, !0 === n, r.callback); },
    highlightElement(n, t, r) {
      const i = a.util.getLanguage(n); const l = a.languages[i]; a.util.setLanguage(n, i); let o = n.parentElement; o && o.nodeName.toLowerCase() === 'pre' && a.util.setLanguage(o, i); const s = {
        element: n, language: i, grammar: l, code: n.textContent,
      }; function u(e) { s.highlightedCode = e, a.hooks.run('before-insert', s), s.element.innerHTML = s.highlightedCode, a.hooks.run('after-highlight', s), a.hooks.run('complete', s), r && r.call(s.element); } if (a.hooks.run('before-sanity-check', s), (o = s.element.parentElement) && o.nodeName.toLowerCase() === 'pre' && !o.hasAttribute('tabindex') && o.setAttribute('tabindex', '0'), !s.code) return a.hooks.run('complete', s), void (r && r.call(s.element)); if (a.hooks.run('before-highlight', s), s.grammar) if (t && e.Worker) { const c = new Worker(a.filename); c.onmessage = function (e) { u(e.data); }, c.postMessage(JSON.stringify({ language: s.language, code: s.code, immediateClose: !0 })); } else u(a.highlight(s.code, s.grammar, s.language)); else u(a.util.encode(s.code));
    },
    highlight(e, n, t) { const r = { code: e, grammar: n, language: t }; if (a.hooks.run('before-tokenize', r), !r.grammar) throw new Error(`The language "${r.language}" has no grammar.`); return r.tokens = a.tokenize(r.code, r.grammar), a.hooks.run('after-tokenize', r), i.stringify(a.util.encode(r.tokens), r.language); },
    tokenize(e, n) { const t = n.rest; if (t) { for (const r in t)n[r] = t[r]; delete n.rest; } const a = new s(); return u(a, a.head, e), o(e, a, n, a.head, 0), (function (e) { for (var n = [], t = e.head.next; t !== e.tail;)n.push(t.value), t = t.next; return n; }(a)); },
    hooks: { all: {}, add(e, n) { const t = a.hooks.all; t[e] = t[e] || [], t[e].push(n); }, run(e, n) { const t = a.hooks.all[e]; if (t && t.length) for (var r, i = 0; r = t[i++];)r(n); } },
    Token: i,
  }; function i(e, n, t, r) { this.type = e, this.content = n, this.alias = t, this.length = 0 | (r || '').length; } function l(e, n, t, r) { e.lastIndex = n; const a = e.exec(t); if (a && r && a[1]) { const i = a[1].length; a.index += i, a[0] = a[0].slice(i); } return a; } function o(e, n, t, r, s, g) { for (const f in t) if (t.hasOwnProperty(f) && t[f]) { let h = t[f]; h = Array.isArray(h) ? h : [h]; for (let d = 0; d < h.length; ++d) { if (g && g.cause == `${f},${d}`) return; const v = h[d]; const p = v.inside; const m = !!v.lookbehind; const y = !!v.greedy; const k = v.alias; if (y && !v.pattern.global) { const x = v.pattern.toString().match(/[imsuy]*$/)[0]; v.pattern = RegExp(v.pattern.source, `${x}g`); } for (let b = v.pattern || v, w = r.next, A = s; w !== n.tail && !(g && A >= g.reach); A += w.value.length, w = w.next) { let E = w.value; if (n.length > e.length) return; if (!(E instanceof i)) { var P; let L = 1; if (y) { if (!(P = l(b, A, e, m)) || P.index >= e.length) break; var S = P.index; const O = P.index + P[0].length; let j = A; for (j += w.value.length; S >= j;)j += (w = w.next).value.length; if (A = j -= w.value.length, w.value instanceof i) continue; for (let C = w; C !== n.tail && (j < O || typeof C.value === 'string'); C = C.next)L++, j += C.value.length; L--, E = e.slice(A, j), P.index -= A; } else if (!(P = l(b, 0, E, m))) continue; S = P.index; const N = P[0]; const _ = E.slice(0, S); const M = E.slice(S + N.length); const W = A + E.length; g && W > g.reach && (g.reach = W); let z = w.prev; if (_ && (z = u(n, z, _), A += _.length), c(n, z, L), w = u(n, z, new i(f, p ? a.tokenize(N, p) : N, k, N)), M && u(n, w, M), L > 1) { const I = { cause: `${f},${d}`, reach: W }; o(e, n, t, w.prev, A, I), g && I.reach > g.reach && (g.reach = I.reach); } } } } } } function s() { const e = { value: null, prev: null, next: null }; const n = { value: null, prev: e, next: null }; e.next = n, this.head = e, this.tail = n, this.length = 0; } function u(e, n, t) { const r = n.next; const a = { value: t, prev: n, next: r }; return n.next = a, r.prev = a, e.length++, a; } function c(e, n, t) { for (var r = n.next, a = 0; a < t && r !== e.tail; a++)r = r.next; n.next = r, r.prev = n, e.length -= a; } if (e.Prism = a, i.stringify = function e(n, t) {
    if (typeof n === 'string') return n; if (Array.isArray(n)) { let r = ''; return n.forEach(((n) => { r += e(n, t); })), r; } const i = {
      type: n.type, content: e(n.content, t), tag: 'span', classes: ['token', n.type], attributes: {}, language: t,
    }; const l = n.alias; l && (Array.isArray(l) ? Array.prototype.push.apply(i.classes, l) : i.classes.push(l)), a.hooks.run('wrap', i); let o = ''; for (const s in i.attributes)o += ` ${s}="${(i.attributes[s] || '').replace(/"/g, '&quot;')}"`; return `<${i.tag} class="${i.classes.join(' ')}"${o}>${i.content}</${i.tag}>`;
  }, !e.document) return e.addEventListener ? (a.disableWorkerMessageHandler || e.addEventListener('message', ((n) => { const t = JSON.parse(n.data); const r = t.language; const i = t.code; const l = t.immediateClose; e.postMessage(a.highlight(i, a.languages[r], r)), l && e.close(); }), !1), a) : a; const g = a.util.currentScript(); function f() { a.manual || a.highlightAll(); } if (g && (a.filename = g.src, g.hasAttribute('data-manual') && (a.manual = !0)), !a.manual) { const h = document.readyState; h === 'loading' || h === 'interactive' && g && g.defer ? document.addEventListener('DOMContentLoaded', f) : window.requestAnimationFrame ? window.requestAnimationFrame(f) : window.setTimeout(f, 16); } return a;
}(_self)); typeof module !== 'undefined' && module.exports && (module.exports = Prism), typeof global !== 'undefined' && (global.Prism = Prism);
!(function () {
  if (typeof Prism !== 'undefined' && typeof document !== 'undefined') { const e = 'line-numbers'; var n = /\n(?!$)/g; const t = Prism.plugins.lineNumbers = { getLine(n, t) { if (n.tagName === 'PRE' && n.classList.contains(e)) { const i = n.querySelector('.line-numbers-rows'); if (i) { const r = parseInt(n.getAttribute('data-start'), 10) || 1; const s = r + (i.children.length - 1); t < r && (t = r), t > s && (t = s); const l = t - r; return i.children[l]; } } }, resize(e) { r([e]); }, assumeViewportIndependence: !0 }; let i = void 0; window.addEventListener('resize', (() => { t.assumeViewportIndependence && i === window.innerWidth || (i = window.innerWidth, r(Array.prototype.slice.call(document.querySelectorAll('pre.line-numbers')))); })), Prism.hooks.add('complete', ((t) => { if (t.code) { const i = t.element; const s = i.parentNode; if (s && /pre/i.test(s.nodeName) && !i.querySelector('.line-numbers-rows') && Prism.util.isActive(i, e)) { i.classList.remove(e), s.classList.add(e); let l; const o = t.code.match(n); const a = o ? o.length + 1 : 1; const u = new Array(a + 1).join('<span></span>'); (l = document.createElement('span')).setAttribute('aria-hidden', 'true'), l.className = 'line-numbers-rows', l.innerHTML = u, s.hasAttribute('data-start') && (s.style.counterReset = `linenumber ${parseInt(s.getAttribute('data-start'), 10) - 1}`), t.element.appendChild(l), r([s]), Prism.hooks.run('line-numbers', t); } } })), Prism.hooks.add('line-numbers', ((e) => { e.plugins = e.plugins || {}, e.plugins.lineNumbers = !0; })); } function r(e) {
    if ((e = e.filter(((e) => { let n; const t = (n = e, n ? window.getComputedStyle ? getComputedStyle(n) : n.currentStyle || null : null)['white-space']; return t === 'pre-wrap' || t === 'pre-line'; }))).length != 0) {
      const t = e.map(((e) => {
        const t = e.querySelector('code'); const i = e.querySelector('.line-numbers-rows'); if (t && i) {
          let r = e.querySelector('.line-numbers-sizer'); const s = t.textContent.split(n); r || ((r = document.createElement('span')).className = 'line-numbers-sizer', t.appendChild(r)), r.innerHTML = '0', r.style.display = 'block'; const l = r.getBoundingClientRect().height; return r.innerHTML = '', {
            element: e, lines: s, lineHeights: [], oneLinerHeight: l, sizer: r,
          };
        }
      })).filter(Boolean); t.forEach(((e) => { const n = e.sizer; const t = e.lines; const i = e.lineHeights; const r = e.oneLinerHeight; i[t.length - 1] = void 0, t.forEach(((e, t) => { if (e && e.length > 1) { const s = n.appendChild(document.createElement('span')); s.style.display = 'block', s.textContent = e; } else i[t] = r; })); })), t.forEach(((e) => { for (let n = e.sizer, t = e.lineHeights, i = 0, r = 0; r < t.length; r++) void 0 === t[r] && (t[r] = n.children[i++].getBoundingClientRect().height); })), t.forEach(((e) => { const n = e.sizer; const t = e.element.querySelector('.line-numbers-rows'); n.style.display = 'none', n.innerHTML = '', e.lineHeights.forEach(((e, n) => { t.children[n].style.height = `${e}px`; })); }));
    }
  }
}());
!(function () {
  if (typeof Prism !== 'undefined' && typeof document !== 'undefined') {
    var e = {
      javascript: 'clike', actionscript: 'javascript', apex: ['clike', 'sql'], arduino: 'cpp', aspnet: ['markup', 'csharp'], birb: 'clike', bison: 'c', c: 'clike', csharp: 'clike', cpp: 'c', cfscript: 'clike', chaiscript: ['clike', 'cpp'], cilkc: 'c', cilkcpp: 'cpp', coffeescript: 'javascript', crystal: 'ruby', 'css-extras': 'css', d: 'clike', dart: 'clike', django: 'markup-templating', ejs: ['javascript', 'markup-templating'], etlua: ['lua', 'markup-templating'], erb: ['ruby', 'markup-templating'], fsharp: 'clike', 'firestore-security-rules': 'clike', flow: 'javascript', ftl: 'markup-templating', gml: 'clike', glsl: 'c', go: 'clike', gradle: 'clike', groovy: 'clike', haml: 'ruby', handlebars: 'markup-templating', haxe: 'clike', hlsl: 'c', idris: 'haskell', java: 'clike', javadoc: ['markup', 'java', 'javadoclike'], jolie: 'clike', jsdoc: ['javascript', 'javadoclike', 'typescript'], 'js-extras': 'javascript', json5: 'json', jsonp: 'json', 'js-templates': 'javascript', kotlin: 'clike', latte: ['clike', 'markup-templating', 'php'], less: 'css', lilypond: 'scheme', liquid: 'markup-templating', markdown: 'markup', 'markup-templating': 'markup', mongodb: 'javascript', n4js: 'javascript', objectivec: 'c', opencl: 'c', parser: 'markup', php: 'markup-templating', phpdoc: ['php', 'javadoclike'], 'php-extras': 'php', plsql: 'sql', processing: 'clike', protobuf: 'clike', pug: ['markup', 'javascript'], purebasic: 'clike', purescript: 'haskell', qsharp: 'clike', qml: 'javascript', qore: 'clike', racket: 'scheme', cshtml: ['markup', 'csharp'], jsx: ['markup', 'javascript'], tsx: ['jsx', 'typescript'], reason: 'clike', ruby: 'clike', sass: 'css', scss: 'css', scala: 'java', 'shell-session': 'bash', smarty: 'markup-templating', solidity: 'clike', soy: 'markup-templating', sparql: 'turtle', sqf: 'clike', squirrel: 'clike', stata: ['mata', 'java', 'python'], 't4-cs': ['t4-templating', 'csharp'], 't4-vb': ['t4-templating', 'vbnet'], tap: 'yaml', tt2: ['clike', 'markup-templating'], textile: 'markup', twig: 'markup-templating', typescript: 'javascript', v: 'clike', vala: 'clike', vbnet: 'basic', velocity: 'markup', wiki: 'markup', xeora: 'markup', 'xml-doc': 'markup', xquery: 'markup',
    }; var a = {
      html: 'markup', xml: 'markup', svg: 'markup', mathml: 'markup', ssml: 'markup', atom: 'markup', rss: 'markup', js: 'javascript', g4: 'antlr4', ino: 'arduino', 'arm-asm': 'armasm', art: 'arturo', adoc: 'asciidoc', avs: 'avisynth', avdl: 'avro-idl', gawk: 'awk', sh: 'bash', shell: 'bash', shortcode: 'bbcode', rbnf: 'bnf', oscript: 'bsl', cs: 'csharp', dotnet: 'csharp', cfc: 'cfscript', 'cilk-c': 'cilkc', 'cilk-cpp': 'cilkcpp', cilk: 'cilkcpp', coffee: 'coffeescript', conc: 'concurnas', jinja2: 'django', 'dns-zone': 'dns-zone-file', dockerfile: 'docker', gv: 'dot', eta: 'ejs', xlsx: 'excel-formula', xls: 'excel-formula', gamemakerlanguage: 'gml', po: 'gettext', gni: 'gn', ld: 'linker-script', 'go-mod': 'go-module', hbs: 'handlebars', mustache: 'handlebars', hs: 'haskell', idr: 'idris', gitignore: 'ignore', hgignore: 'ignore', npmignore: 'ignore', webmanifest: 'json', kt: 'kotlin', kts: 'kotlin', kum: 'kumir', tex: 'latex', context: 'latex', ly: 'lilypond', emacs: 'lisp', elisp: 'lisp', 'emacs-lisp': 'lisp', md: 'markdown', moon: 'moonscript', n4jsd: 'n4js', nani: 'naniscript', objc: 'objectivec', qasm: 'openqasm', objectpascal: 'pascal', px: 'pcaxis', pcode: 'peoplecode', plantuml: 'plant-uml', pq: 'powerquery', mscript: 'powerquery', pbfasm: 'purebasic', purs: 'purescript', py: 'python', qs: 'qsharp', rkt: 'racket', razor: 'cshtml', rpy: 'renpy', res: 'rescript', robot: 'robotframework', rb: 'ruby', 'sh-session': 'shell-session', shellsession: 'shell-session', smlnj: 'sml', sol: 'solidity', sln: 'solution-file', rq: 'sparql', sclang: 'supercollider', t4: 't4-cs', trickle: 'tremor', troy: 'tremor', trig: 'turtle', ts: 'typescript', tsconfig: 'typoscript', uscript: 'unrealscript', uc: 'unrealscript', url: 'uri', vb: 'visual-basic', vba: 'visual-basic', webidl: 'web-idl', mathematica: 'wolfram', nb: 'wolfram', wl: 'wolfram', xeoracube: 'xeora', yml: 'yaml',
    }; var r = {}; let s = 'components/'; const i = Prism.util.currentScript(); if (i) { const t = /\bplugins\/autoloader\/prism-autoloader\.(?:min\.)?js(?:\?[^\r\n/]*)?$/i; const c = /(^|\/)[\w-]+\.(?:min\.)?js(?:\?[^\r\n/]*)?$/i; const l = i.getAttribute('data-autoloader-path'); if (l != null)s = l.trim().replace(/\/?$/, '/'); else { const p = i.src; t.test(p) ? s = p.replace(t, 'components/') : c.test(p) && (s = p.replace(c, '$1components/')); } } var n = Prism.plugins.autoloader = { languages_path: s, use_minified: !0, loadLanguages: m }; Prism.hooks.add('complete', ((e) => { const a = e.element; const r = e.language; if (a && r && r !== 'none') { const s = (function (e) { let a = (e.getAttribute('data-dependencies') || '').trim(); if (!a) { const r = e.parentElement; r && r.tagName.toLowerCase() === 'pre' && (a = (r.getAttribute('data-dependencies') || '').trim()); } return a ? a.split(/\s*,\s*/g) : []; }(a)); /^diff-./i.test(r) ? (s.push('diff'), s.push(r.substr('diff-'.length))) : s.push(r), s.every(o) || m(s, (() => { Prism.highlightElement(a); })); } }));
  } function o(e) { if (e.indexOf('!') >= 0) return !1; if ((e = a[e] || e) in Prism.languages) return !0; const s = r[e]; return s && !s.error && !1 === s.loading; } function m(s, i, t) { typeof s === 'string' && (s = [s]); const c = s.length; let l = 0; let p = !1; function k() { p || ++l === c && i && i(s); }c !== 0 ? s.forEach(((s) => { !(function (s, i, t) { const c = s.indexOf('!') >= 0; function l() { let e = r[s]; e || (e = r[s] = { callbacks: [] }), e.callbacks.push({ success: i, error: t }), !c && o(s) ? u(s, 'success') : !c && e.error ? u(s, 'error') : !c && e.loading || (e.loading = !0, e.error = !1, (function (e, a, r) { const s = document.createElement('script'); s.src = e, s.async = !0, s.onload = function () { document.body.removeChild(s), a && a(); }, s.onerror = function () { document.body.removeChild(s), r && r(); }, document.body.appendChild(s); }((function (e) { return `${n.languages_path}prism-${e}${n.use_minified ? '.min' : ''}.js`; }(s)), (() => { e.loading = !1, u(s, 'success'); }), (() => { e.loading = !1, e.error = !0, u(s, 'error'); })))); }s = s.replace('!', ''); const p = e[s = a[s] || s]; p && p.length ? m(p, l, t) : l(); }(s, k, (() => { p || (p = !0, t && t(s)); }))); })) : i && setTimeout(i, 0); } function u(e, a) { if (r[e]) { for (var s = r[e].callbacks, i = 0, t = s.length; i < t; i++) { const c = s[i][a]; c && setTimeout(c, 0); }s.length = 0; } }
}());
!(function () { if (typeof Prism !== 'undefined' && typeof document !== 'undefined') { const e = []; const t = {}; const n = function () {}; Prism.plugins.toolbar = {}; const a = Prism.plugins.toolbar.registerButton = function (n, a) { let r; r = typeof a === 'function' ? a : function (e) { let t; return typeof a.onClick === 'function' ? ((t = document.createElement('button')).type = 'button', t.addEventListener('click', (function () { a.onClick.call(this, e); }))) : typeof a.url === 'string' ? (t = document.createElement('a')).href = a.url : t = document.createElement('span'), a.className && t.classList.add(a.className), t.textContent = a.text, t; }, n in t ? console.warn(`There is a button with the key "${n}" registered already.`) : e.push(t[n] = r); }; const r = Prism.plugins.toolbar.hook = function (a) { const r = a.element.parentNode; if (r && /pre/i.test(r.nodeName) && !r.parentNode.classList.contains('code-toolbar')) { const o = document.createElement('div'); o.classList.add('code-toolbar'), r.parentNode.insertBefore(o, r), o.appendChild(r); const i = document.createElement('div'); i.classList.add('toolbar'); let l = e; const d = (function (e) { for (;e;) { let t = e.getAttribute('data-toolbar-order'); if (t != null) return (t = t.trim()).length ? t.split(/\s*,\s*/g) : []; e = e.parentElement; } }(a.element)); d && (l = d.map(((e) => t[e] || n))), l.forEach(((e) => { const t = e(a); if (t) { const n = document.createElement('div'); n.classList.add('toolbar-item'), n.appendChild(t), i.appendChild(n); } })), o.appendChild(i); } }; a('label', ((e) => { const t = e.element.parentNode; if (t && /pre/i.test(t.nodeName) && t.hasAttribute('data-label')) { let n; let a; const r = t.getAttribute('data-label'); try { a = document.querySelector(`template#${r}`); } catch (e) {} return a ? n = a.content : (t.hasAttribute('data-url') ? (n = document.createElement('a')).href = t.getAttribute('data-url') : n = document.createElement('span'), n.textContent = r), n; } })), Prism.hooks.add('complete', r); } }());
(function () {

	if (typeof Prism === 'undefined' || typeof document === 'undefined' || !document.querySelector) {
		return;
	}

	var LINE_NUMBERS_CLASS = 'line-numbers';
	var LINKABLE_LINE_NUMBERS_CLASS = 'linkable-line-numbers';
	var NEW_LINE_EXP = /\n(?!$)/g;

	/**
	 * @param {string} selector
	 * @param {ParentNode} [container]
	 * @returns {HTMLElement[]}
	 */
	function $$(selector, container) {
		return Array.prototype.slice.call((container || document).querySelectorAll(selector));
	}

	/**
	 * Returns whether the given element has the given class.
	 *
	 * @param {Element} element
	 * @param {string} className
	 * @returns {boolean}
	 */
	function hasClass(element, className) {
		return element.classList.contains(className);
	}

	/**
	 * Calls the given function.
	 *
	 * @param {() => any} func
	 * @returns {void}
	 */
	function callFunction(func) {
		func();
	}

	// Some browsers round the line-height, others don't.
	// We need to test for it to position the elements properly.
	var isLineHeightRounded = (function () {
		var res;
		return function () {
			if (typeof res === 'undefined') {
				var d = document.createElement('div');
				d.style.fontSize = '13px';
				d.style.lineHeight = '1.5';
				d.style.padding = '0';
				d.style.border = '0';
				d.innerHTML = '&nbsp;<br />&nbsp;';
				document.body.appendChild(d);
				// Browsers that round the line-height should have offsetHeight === 38
				// The others should have 39.
				res = d.offsetHeight === 38;
				document.body.removeChild(d);
			}
			return res;
		};
	}());

	/**
	 * Returns the top offset of the content box of the given parent and the content box of one of its children.
	 *
	 * @param {HTMLElement} parent
	 * @param {HTMLElement} child
	 */
	function getContentBoxTopOffset(parent, child) {
		var parentStyle = getComputedStyle(parent);
		var childStyle = getComputedStyle(child);

		/**
		 * Returns the numeric value of the given pixel value.
		 *
		 * @param {string} px
		 */
		function pxToNumber(px) {
			return +px.substr(0, px.length - 2);
		}

		return child.offsetTop
			+ pxToNumber(childStyle.borderTopWidth)
			+ pxToNumber(childStyle.paddingTop)
			- pxToNumber(parentStyle.paddingTop);
	}

	/**
	 * Returns whether the Line Highlight plugin is active for the given element.
	 *
	 * If this function returns `false`, do not call `highlightLines` for the given element.
	 *
	 * @param {HTMLElement | null | undefined} pre
	 * @returns {boolean}
	 */
	function isActiveFor(pre) {
		if (!pre || !/pre/i.test(pre.nodeName)) {
			return false;
		}

		if (pre.hasAttribute('data-line')) {
			return true;
		}

		if (pre.id && Prism.util.isActive(pre, LINKABLE_LINE_NUMBERS_CLASS)) {
			return true;
		}

		return false;
	}

	var scrollIntoView = true;

	Prism.plugins.lineHighlight = {
		/**
		 * Highlights the lines of the given pre.
		 *
		 * This function is split into a DOM measuring and mutate phase to improve performance.
		 * The returned function mutates the DOM when called.
		 *
		 * @param {HTMLElement} pre
		 * @param {string | null} [lines]
		 * @param {string} [classes='']
		 * @returns {() => void}
		 */
		highlightLines: function highlightLines(pre, lines, classes) {
			lines = typeof lines === 'string' ? lines : (pre.getAttribute('data-line') || '');

			var ranges = lines.replace(/\s+/g, '').split(',').filter(Boolean);
			var offset = +pre.getAttribute('data-line-offset') || 0;

			var parseMethod = isLineHeightRounded() ? parseInt : parseFloat;
			var lineHeight = parseMethod(getComputedStyle(pre).lineHeight);
			var hasLineNumbers = Prism.util.isActive(pre, LINE_NUMBERS_CLASS);
			var codeElement = pre.querySelector('code');
			var parentElement = hasLineNumbers ? pre : codeElement || pre;
			var mutateActions = /** @type {(() => void)[]} */ ([]);
			var lineBreakMatch = codeElement.textContent.match(NEW_LINE_EXP);
			var numberOfLines = lineBreakMatch ? lineBreakMatch.length + 1 : 1;
			var codePreOffset = !codeElement || parentElement == codeElement ? 0 : getContentBoxTopOffset(pre, codeElement);

			ranges.forEach(function (currentRange) {
				var range = currentRange.split('-');

				var start = +range[0];
				var end = +range[1] || start;
				end = Math.min(numberOfLines + offset, end);

				if (end < start) {
					return;
				}

				var line = pre.querySelector('.line-highlight[data-range="' + currentRange + '"]') || document.createElement('div');

				mutateActions.push(function () {
					line.setAttribute('aria-hidden', 'true');
					line.setAttribute('data-range', currentRange);
					line.className = (classes || '') + ' line-highlight';
				});

				if (hasLineNumbers && Prism.plugins.lineNumbers) {
					var startNode = Prism.plugins.lineNumbers.getLine(pre, start);
					var endNode = Prism.plugins.lineNumbers.getLine(pre, end);

					if (startNode) {
						var top = (startNode.offsetTop + codePreOffset) + 'px';
						mutateActions.push(function () {
							line.style.top = top;
						});
					}

					if (endNode) {
						var height = (endNode.offsetTop - startNode.offsetTop) + endNode.offsetHeight + 'px';
						mutateActions.push(function () {
							line.style.height = height;
						});
					}
				} else {
					mutateActions.push(function () {
						line.setAttribute('data-start', String(start));

						if (end > start) {
							line.setAttribute('data-end', String(end));
						}

						// <-- UPDATED THIS LINE: add offset instead of subtract
						line.style.top = ((start - 1 + offset) * lineHeight + codePreOffset) + 'px';

						line.textContent = new Array(end - start + 2).join(' \n');
					});
				}

				mutateActions.push(function () {
					line.style.width = pre.scrollWidth + 'px';
				});

				mutateActions.push(function () {
					parentElement.appendChild(line);
				});
			});

			var id = pre.id;
			if (hasLineNumbers && Prism.util.isActive(pre, LINKABLE_LINE_NUMBERS_CLASS) && id) {
				if (!hasClass(pre, LINKABLE_LINE_NUMBERS_CLASS)) {
					mutateActions.push(function () {
						pre.classList.add(LINKABLE_LINE_NUMBERS_CLASS);
					});
				}

				var start = parseInt(pre.getAttribute('data-start') || '1');

				$$('.line-numbers-rows > span', pre).forEach(function (lineSpan, i) {
					var lineNumber = i + start;
					lineSpan.onclick = function () {
						var hash = id + '.' + lineNumber;

						scrollIntoView = false;
						location.hash = hash;
						setTimeout(function () {
							scrollIntoView = true;
						}, 1);
					};
				});
			}

			return function () {
				mutateActions.forEach(callFunction);
			};
		}
	};


	function applyHash() {
		var hash = location.hash.slice(1);

		$$('.temporary.line-highlight').forEach(function (line) {
			line.parentNode.removeChild(line);
		});

		var range = (hash.match(/\.([\d,-]+)$/) || [, ''])[1];

		if (!range || document.getElementById(hash)) {
			return;
		}

		var id = hash.slice(0, hash.lastIndexOf('.'));
		var pre = document.getElementById(id);

		if (!pre) {
			return;
		}

		if (!pre.hasAttribute('data-line')) {
			pre.setAttribute('data-line', '');
		}

		var mutateDom = Prism.plugins.lineHighlight.highlightLines(pre, range, 'temporary ');
		mutateDom();

		if (scrollIntoView) {
			document.querySelector('.temporary.line-highlight').scrollIntoView();
		}
	}

	var fakeTimer = 0;

	Prism.hooks.add('before-sanity-check', function (env) {
		var pre = env.element.parentElement;
		if (!isActiveFor(pre)) {
			return;
		}

		var num = 0;
		$$('.line-highlight', pre).forEach(function (line) {
			num += line.textContent.length;
			line.parentNode.removeChild(line);
		});
		if (num && /^(?: \n)+$/.test(env.code.slice(-num))) {
			env.code = env.code.slice(0, -num);
		}
	});

	Prism.hooks.add('complete', function completeHook(env) {
		var pre = env.element.parentElement;
		if (!isActiveFor(pre)) {
			return;
		}

		clearTimeout(fakeTimer);

		var hasLineNumbers = Prism.plugins.lineNumbers;
		var isLineNumbersLoaded = env.plugins && env.plugins.lineNumbers;

		if (hasClass(pre, LINE_NUMBERS_CLASS) && hasLineNumbers && !isLineNumbersLoaded) {
			Prism.hooks.add('line-numbers', completeHook);
		} else {
			var mutateDom = Prism.plugins.lineHighlight.highlightLines(pre);
			mutateDom();
			fakeTimer = setTimeout(applyHash, 1);
		}
	});

	window.addEventListener('hashchange', applyHash);
	window.addEventListener('resize', function () {
		var actions = $$('pre')
			.filter(isActiveFor)
			.map(function (pre) {
				return Prism.plugins.lineHighlight.highlightLines(pre);
			});
		actions.forEach(callFunction);
	});

}());

!(function () {
  function t(t) { const e = document.createElement('textarea'); e.value = t.getText(), e.style.top = '0', e.style.left = '0', e.style.position = 'fixed', document.body.appendChild(e), e.focus(), e.select(); try { const o = document.execCommand('copy'); setTimeout((() => { o ? t.success() : t.error(); }), 1); } catch (e) { setTimeout((() => { t.error(e); }), 1); }document.body.removeChild(e); } typeof Prism !== 'undefined' && typeof document !== 'undefined' && (Prism.plugins.toolbar ? Prism.plugins.toolbar.registerButton('copy-to-clipboard', ((e) => {
    const o = e.element; const n = (function (t) {
      const e = {
        copy: 'Copy', 'copy-error': 'Press Ctrl+C to copy', 'copy-success': 'Copied!', 'copy-timeout': 5e3,
      }; for (const o in e) { for (var n = `data-prismjs-${o}`, c = t; c && !c.hasAttribute(n);)c = c.parentElement; c && (e[o] = c.getAttribute(n)); } return e;
    }(o)); const c = document.createElement('button'); c.className = 'copy-to-clipboard-button', c.setAttribute('type', 'button'); const r = document.createElement('span'); return c.appendChild(r), u('copy'), (function (e, o) { e.addEventListener('click', (() => { !(function (e) { navigator.clipboard ? navigator.clipboard.writeText(e.getText()).then(e.success, (() => { t(e); })) : t(e); }(o)); })); }(c, { getText() { return o.textContent; }, success() { u('copy-success'), i(); }, error() { u('copy-error'), setTimeout((() => { !(function (t) { window.getSelection().selectAllChildren(t); }(o)); }), 1), i(); } })), c; function i() { setTimeout((() => { u('copy'); }), n['copy-timeout']); } function u(t) { r.textContent = n[t], c.setAttribute('data-copy-state', t); }
  })) : console.warn('Copy to Clipboard plugin loaded before Toolbar plugin.'));
}());
