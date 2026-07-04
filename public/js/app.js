/**
 * DLSS — Application bootstrap.
 *
 * Loads shared HTML components (navbar, footer, etc.) into their
 * placeholders and wires up global UI behavior. Written as a plain script
 * (no bundler/module system) so it can be dropped into any page with:
 *
 *   <script src="/js/app.js" defer></script>
 *
 * Other scripts (router.js, auth.js, notifications.js, ...) attach
 * themselves to the same `window.DLSS` namespace to stay dependency-free
 * and avoid polluting the global scope.
 */

window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  /* ==========================================================================
     COMPONENT INCLUDES
     ==========================================================================
     Any element with `data-include="navbar"` gets replaced with the
     contents of /components/navbar.html. Usage:

       <div data-include="navbar"></div>
       <div data-include="footer"></div>

     Dispatches a `dlss:component-loaded` event (with `detail.name` and
     `detail.el`) on `document` once each fragment is injected, so other
     init functions can react without caring about load order.
     ========================================================================== */

  async function loadIncludes() {
    const nodes = document.querySelectorAll('[data-include]');

    await Promise.all(
      Array.from(nodes).map(async (node) => {
        const name = node.getAttribute('data-include');

        try {
          const response = await fetch(`/components/${name}.html`);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          node.outerHTML = await response.text();
        } catch (error) {
          console.error(`[DLSS] Failed to load component "${name}":`, error);
          return;
        }

        document.dispatchEvent(
          new CustomEvent('dlss:component-loaded', { detail: { name } })
        );
      })
    );
  }

  /* ==========================================================================
     NAVBAR
     ==========================================================================
     Handles the mobile hamburger toggle, closing the menu on outside
     click / Escape / link click, the scroll shadow, and highlighting the
     link that matches the current page.

     Uses event delegation on `document` so it works whether the navbar was
     already in the page markup or injected later via `loadIncludes()`. */

  function initNavbar() {
    const closeMenu = () => {
      const toggle = document.getElementById('navbarToggle');
      const menu = document.getElementById('navbarMenu');
      if (!toggle || !menu) return;

      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    };

    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('#navbarToggle');
      const menu = document.getElementById('navbarMenu');
      if (!menu) return;

      if (toggle) {
        const isOpen = menu.classList.toggle('is-open');
        toggle.classList.toggle('is-active', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        return;
      }

      // Close when a nav link inside the mobile menu is clicked.
      if (event.target.closest('.navbar-link')) {
        closeMenu();
        return;
      }

      // Close when clicking anywhere outside the navbar entirely.
      if (!event.target.closest('.navbar')) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    // Reset mobile menu state if the viewport grows into desktop size
    // while it happens to be open.
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) closeMenu();
    });

    // Scroll shadow.
    const onScroll = () => {
      const navbar = document.getElementById('navbar');
      if (!navbar) return;
      navbar.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Active link highlighting, driven by `<body data-page="about">`.
    const currentPage = document.body.getAttribute('data-page');
    if (currentPage) {
      document.querySelectorAll('.navbar-link[data-nav-link]').forEach((link) => {
        link.classList.toggle('active', link.getAttribute('data-nav-link') === currentPage);
        if (link.getAttribute('data-nav-link') === currentPage) {
          link.setAttribute('aria-current', 'page');
        }
      });
    }
  }

  document.addEventListener('dlss:component-loaded', (event) => {
    if (event.detail.name === 'navbar') initNavbar();
  });

  /* ==========================================================================
     BOOTSTRAP
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    loadIncludes();

    // If the navbar markup is already inlined in the page (rather than
    // loaded via data-include), initialize it immediately too.
    if (document.getElementById('navbar') && !document.querySelector('[data-include="navbar"]')) {
      initNavbar();
    }
  });

  window.DLSS.loadIncludes = loadIncludes;
  window.DLSS.initNavbar = initNavbar;
})();
