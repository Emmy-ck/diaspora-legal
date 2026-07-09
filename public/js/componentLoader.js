/**
 * DLSS — Component Loader.
 *
 * Single, dependency-free utility that finds every `[data-include]`
 * placeholder in the page and replaces it with the matching fragment
 * from /components/*.html — the one place this happens anywhere in the
 * app, so every other script (app.js, notifications.js, ...) can just
 * listen for the `dlss:component-loaded` event instead of re-implementing
 * fetch/inject logic of its own. Keeps shared UI (navbar, sidebar,
 * footer, modal, notification, loader, pagination) modular: one HTML
 * file per component, pulled in wherever it's needed, so updating a
 * component updates every page that uses it.
 *
 *   <div data-include="navbar"></div>
 *   <div data-include="footer"></div>
 *
 * Runs automatically on DOMContentLoaded — just include this script
 * (before app.js, so its DLSS.loadIncludes is ready when app.js's own
 * bootstrap runs):
 *
 *   <script src="/js/componentLoader.js" defer></script>
 *   <script src="/js/app.js" defer></script>
 *
 * Each component is fetched from the network at most once per page —
 * concurrent or repeated `data-include="X"` placeholders all share the
 * same cached request/markup — and a fragment that fails to load is
 * logged and left in place (uncached, so a later retry via
 * DLSS.loadIncludes() can succeed) rather than silently breaking the
 * rest of the page.
 *
 * PUBLIC API
 * --------------------------------------------------
 *   DLSS.loadIncludes(root?)         - (re-)scan `root` (default:
 *                                       document) for [data-include]
 *                                       placeholders and load them; call
 *                                       again after injecting new markup
 *                                       of your own (e.g. from router.js)
 *   DLSS.ComponentLoader.preload(name) - warm the cache for a component
 *                                       ahead of time, without needing a
 *                                       placeholder in the page yet
 *
 * EVENT
 * --------------------------------------------------
 *   document.addEventListener('dlss:component-loaded', (event) => {
 *     event.detail.name  // e.g. 'navbar'
 *   });
 */

window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  const COMPONENTS_BASE = '/components';

  // name -> Promise<string>, so identical `data-include`s never trigger
  // more than one network request for the same fragment.
  const cache = new Map();

  function fetchComponent(name) {
    if (!cache.has(name)) {
      const request = fetch(`${COMPONENTS_BASE}/${name}.html`).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      });
      cache.set(name, request);
    }
    return cache.get(name);
  }

  async function loadOne(node) {
    const name = node.getAttribute('data-include');
    if (!name) return;

    let html;
    try {
      html = await fetchComponent(name);
    } catch (error) {
      console.error(`[DLSS] Failed to load component "${name}":`, error);
      cache.delete(name); // don't cache a failure — let a later call retry
      return;
    }

    node.outerHTML = html;
    document.dispatchEvent(new CustomEvent('dlss:component-loaded', { detail: { name } }));
  }

  /** Scan `root` for `[data-include]` placeholders and load them all in
   * parallel. Safe to call more than once (already-loaded placeholders
   * no longer carry the attribute, so they're simply skipped). */
  function loadIncludes(root = document) {
    const nodes = Array.from(root.querySelectorAll('[data-include]'));
    return Promise.all(nodes.map(loadOne));
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadIncludes();
  });

  window.DLSS.loadIncludes = loadIncludes;
  window.DLSS.ComponentLoader = {
    load: loadIncludes,
    preload: fetchComponent,
  };
})();
