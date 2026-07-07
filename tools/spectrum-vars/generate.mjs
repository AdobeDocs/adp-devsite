#!/usr/bin/env node
// Parses hlx_statics/styles/spectrum/spectrum.min.css and generates a
// self-contained, searchable HTML page listing every --spectrum-* custom
// property, the selector/theme it's defined under, and its value (plus a
// best-effort resolved value when it's just `var(--other)`).
//
// Usage: node tools/spectrum-vars/generate.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.join(__dirname, "../../hlx_statics/styles/spectrum/spectrum.min.css");
const OUT_PATH = path.join(__dirname, "index.html");

function parseCustomProperties(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");

  const declarations = []; // { selector, media, name, value }
  const contextStack = [];
  let buf = "";

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      contextStack.push(buf.trim());
      buf = "";
      continue;
    }
    if (ch === "}") {
      const context = contextStack.pop();
      if (context && !context.startsWith("@")) {
        const media = contextStack.filter((c) => c.startsWith("@")).join(" ");
        for (const decl of buf.split(";")) {
          const colon = decl.indexOf(":");
          if (colon === -1) continue;
          const name = decl.slice(0, colon).trim();
          const value = decl.slice(colon + 1).trim();
          if (name.startsWith("--") && value) {
            declarations.push({ selector: context, media, name, value });
          }
        }
      }
      buf = "";
      continue;
    }
    buf += ch;
  }

  return declarations;
}

function resolveValue(value, baseValues, depth = 0) {
  if (depth > 5) return value;
  return value.replace(/var\((--[a-zA-Z0-9_-]+)(?:\s*,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (match, name, fallback) => {
    const resolved = baseValues.get(name);
    if (resolved !== undefined && resolved !== value) {
      return resolveValue(resolved, baseValues, depth + 1);
    }
    return fallback !== undefined ? resolveValue(fallback.trim(), baseValues, depth + 1) : match;
  });
}

function build() {
  const css = readFileSync(CSS_PATH, "utf8");
  const declarations = parseCustomProperties(css);

  // Base scope for resolving var() references: the default (untthemed,
  // unmedia-queried) declaration of each variable, preferring `.spectrum`.
  const baseValues = new Map();
  for (const d of declarations) {
    if (d.media) continue;
    if (!baseValues.has(d.name) || d.selector === ".spectrum") {
      baseValues.set(d.name, d.value);
    }
  }

  const byName = new Map();
  for (const d of declarations) {
    const resolved = resolveValue(d.value, baseValues);
    if (!byName.has(d.name)) byName.set(d.name, []);
    byName.get(d.name).push({
      selector: d.selector,
      media: d.media || null,
      value: d.value,
      resolved: resolved !== d.value ? resolved : null,
    });
  }

  const variables = [...byName.entries()]
    .map(([name, occurrences]) => ({ name, occurrences }))
    .sort((a, b) => a.name.localeCompare(b.name));

  writeFileSync(OUT_PATH, renderHtml(variables));

  console.log(`Parsed ${declarations.length} declarations, ${variables.length} unique variables.`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT_PATH)}`);
}

function renderHtml(variables) {
  const dataJson = JSON.stringify(variables).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Spectrum CSS variable search</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    margin: 0;
    background: #fafafa;
    color: #1a1a1a;
  }
  header {
    position: sticky;
    top: 0;
    background: #fff;
    border-bottom: 1px solid #ddd;
    padding: 12px 16px;
    z-index: 1;
  }
  #search {
    width: 100%;
    max-width: 640px;
    font-size: 16px;
    padding: 8px 12px;
    box-sizing: border-box;
    border: 1px solid #bbb;
    border-radius: 6px;
  }
  #count { font-size: 12px; color: #666; margin: 6px 0 0; }
  main { padding: 8px 16px 40px; }
  .var {
    background: #fff;
    border: 1px solid #e2e2e2;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 10px 0;
  }
  .var-name {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
  }
  .var-name:hover { color: #0060df; }
  .swatch {
    display: inline-block;
    width: 12px; height: 12px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,.15);
    vertical-align: middle;
    margin-right: 6px;
  }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; }
  td { padding: 3px 6px; vertical-align: top; }
  td.selector { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #555; white-space: nowrap; }
  td.value { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  td.resolved { color: #888; }
  .media-tag { display: inline-block; font-size: 11px; color: #a06400; background: #fff6e5; border-radius: 4px; padding: 0 5px; margin-left: 6px; }
  #empty { color: #888; padding: 20px 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #eee; }
    header, .var { background: #262626; border-color: #3a3a3a; }
    #search { background: #1a1a1a; color: #eee; border-color: #555; }
    td.selector { color: #aaa; }
    td.resolved { color: #999; }
  }
</style>
</head>
<body>
<header>
  <input id="search" type="text" placeholder="Search variable names or values (e.g. gray-700, border-radius, dark)" autofocus>
  <p id="count"></p>
</header>
<main id="results"></main>
<p id="empty" hidden>No matches.</p>
<script>
const DATA = ${dataJson};

const results = document.getElementById("results");
const search = document.getElementById("search");
const count = document.getElementById("count");
const empty = document.getElementById("empty");

function isColor(value) {
  return /^(#|rgb|hsl)/.test(value.trim());
}

function renderVar(v) {
  const first = v.occurrences.find(o => isColor(o.resolved || o.value));
  const swatch = first ? \`<span class="swatch" style="background:\${(first.resolved || first.value).replace(/"/g, "")}"></span>\` : "";
  const rows = v.occurrences.map(o => \`
    <tr>
      <td class="selector">\${escapeHtml(o.selector)}\${o.media ? \`<span class="media-tag">\${escapeHtml(o.media)}</span>\` : ""}</td>
      <td class="value">\${escapeHtml(o.value)}</td>
      <td class="resolved">\${o.resolved ? "= " + escapeHtml(o.resolved) : ""}</td>
    </tr>\`).join("");
  return \`
    <div class="var">
      <div class="var-name" title="Click to copy" data-name="\${escapeHtml(v.name)}">\${swatch}\${escapeHtml(v.name)}</div>
      <table><tbody>\${rows}</tbody></table>
    </div>\`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(list) {
  count.textContent = \`\${list.length} of \${DATA.length} variables\`;
  empty.hidden = list.length !== 0;
  results.innerHTML = list.slice(0, 300).map(renderVar).join("");
}

function matches(v, terms) {
  const haystack = (v.name + " " + v.occurrences.map(o => o.selector + " " + o.value + " " + (o.resolved || "")).join(" ")).toLowerCase();
  return terms.every(t => haystack.includes(t));
}

let timer;
search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const terms = search.value.trim().toLowerCase().split(/\\s+/).filter(Boolean);
    render(terms.length ? DATA.filter(v => matches(v, terms)) : DATA);
  }, 60);
});

results.addEventListener("click", (e) => {
  const el = e.target.closest(".var-name");
  if (!el) return;
  navigator.clipboard.writeText(\`var(\${el.dataset.name})\`);
  const original = el.textContent;
  el.textContent = "Copied!";
  setTimeout(() => { el.textContent = original; }, 600);
});

render(DATA);
</script>
</body>
</html>
`;
}

build();
