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
     FOOTER
     ==========================================================================
     The footer is static apart from the copyright year, which is kept
     current automatically so it never goes stale. */

  function initFooter() {
    const year = document.getElementById('footerYear');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('dlss:component-loaded', (event) => {
    if (event.detail.name === 'footer') initFooter();
  });

  /* ==========================================================================
     SIDEBAR
     ==========================================================================
     Handles: role-scoped link visibility, active-link highlighting by URL,
     the mobile off-canvas drawer (open/close/backdrop/Escape), the
     desktop icon-rail collapse toggle (persisted), and logout.

     Uses event delegation on `document` so it works whether the sidebar
     was already in the page markup or injected later via `loadIncludes()`.
     A `.sidebar-toggle-mobile` button can live anywhere on the page (e.g.
     a dashboard topbar) and will open the drawer. */

  const SIDEBAR_COLLAPSED_KEY = 'dlss:sidebar-collapsed';

  function initSidebar() {
    const appShell = document.querySelector('.app-shell');
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // --- Role-scoped nav: show only the link set for the signed-in user.
    // TODO: once auth.js exists, source this from the session instead of
    // `body[data-role]` (which defaults to "client" for now).
    const role = document.body.getAttribute('data-role') || 'client';
    sidebar.querySelectorAll('.sidebar-nav-role[data-role-nav]').forEach((group) => {
      group.hidden = group.getAttribute('data-role-nav') !== role;
    });

    // --- Active link: match against the current URL rather than relying
    // on per-page data attributes, so every dashboard page "just works".
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    sidebar.querySelectorAll('.sidebar-link[href]').forEach((link) => {
      const linkPath = new URL(link.getAttribute('href'), window.location.origin).pathname;
      const isActive = linkPath === currentPath;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // --- Mobile drawer open/close.
    const openDrawer = () => {
      if (!appShell) return;
      appShell.classList.add('sidebar-open');
    };

    const closeDrawer = () => {
      if (!appShell) return;
      appShell.classList.remove('sidebar-open');
    };

    document.addEventListener('click', (event) => {
      if (event.target.closest('.sidebar-toggle-mobile')) {
        openDrawer();
        return;
      }
      if (event.target.closest('#sidebarCloseToggle') || event.target.closest('#sidebarBackdrop')) {
        closeDrawer();
        return;
      }
      // Tapping a link inside the drawer on mobile should close it.
      if (event.target.closest('.sidebar-link') && window.innerWidth < 992) {
        closeDrawer();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992) closeDrawer();
    });

    // --- Desktop icon-rail collapse, persisted across visits.
    if (appShell) {
      appShell.classList.toggle('sidebar-collapsed', localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
    }

    document.addEventListener('click', (event) => {
      if (!event.target.closest('#sidebarCollapseToggle') || !appShell) return;
      const collapsed = appShell.classList.toggle('sidebar-collapsed');
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    });

    // --- Logout.
    // TODO: once auth.js exists, clear the real session/token there instead.
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#sidebarLogout')) return;
      localStorage.removeItem('dlss:token');
      localStorage.removeItem('dlss:user');
      window.location.href = '/pages/auth/login.html';
    });
  }

  document.addEventListener('dlss:component-loaded', (event) => {
    if (event.detail.name === 'sidebar') initSidebar();
  });

  /* ==========================================================================
     BOOTSTRAP
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    loadIncludes();

    // If the navbar/sidebar markup is already inlined in the page (rather
    // than loaded via data-include), initialize it immediately too.
    if (document.getElementById('navbar') && !document.querySelector('[data-include="navbar"]')) {
      initNavbar();
    }
    if (document.getElementById('sidebar') && !document.querySelector('[data-include="sidebar"]')) {
      initSidebar();
    }
    if (document.getElementById('footer') && !document.querySelector('[data-include="footer"]')) {
      initFooter();
    }
  });

  window.DLSS.loadIncludes = loadIncludes;
  window.DLSS.initNavbar = initNavbar;
  window.DLSS.initFooter = initFooter;
  window.DLSS.initSidebar = initSidebar;
})();
