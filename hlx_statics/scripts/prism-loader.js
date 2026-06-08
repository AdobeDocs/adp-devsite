import { loadCSS } from "./lib-helix.js";

/**
 * Cached promise so the Prism import/config runs at most once per page,
 * regardless of how many callers (docs code blocks, AI assistant, …) need it.
 * @type {Promise<void> | null}
 */
let prismPromise = null;

/**
 * Load Prism. Call this before using `window.Prism`.
 * @returns {Promise<void>} resolves once `window.Prism` is ready to use.
 */
export function ensurePrismLoaded() {
  if (prismPromise) return prismPromise;

  prismPromise = (async () => {
    window.Prism = { manual: true };
    loadCSS(`${window.hlx.codeBasePath}/styles/prism.css`);
    await import("./prism.js");

    // Ensure Prism autoloader knows where to fetch language components
    if (
      window.Prism &&
      window.Prism.plugins &&
      window.Prism.plugins.autoloader
    ) {
      window.Prism.plugins.autoloader.languages_path =
        "/hlx_statics/scripts/prism-grammars/";
      window.Prism.plugins.autoloader.use_minified = true;
    }
  })();

  return prismPromise;
}
