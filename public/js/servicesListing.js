/**
 * DLSS — Services listing helper (optional).
 *
 * The services listing page is statically rendered from the catalog.
 * This script only re-applies hash scrolling after load for deep links
 * like `/pages/website/services.html#due-diligence`.
 */
window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  function scrollToHash() {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function init() {
    if (document.body.getAttribute('data-page') !== 'services') return;
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.DLSS.ServicesListing = { init };
})();
