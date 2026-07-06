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
     Single, role-aware top navigation component shared by every page:

       <body>                     -> guest: marketing links + Log In/Get Started
       <body data-role="client">  -> authenticated: search + notifications +
       <body data-role="lawyer">     messages + profile dropdown (no nav
       <body data-role="admin">      links — the sidebar owns those once signed in)

     Handles: guest-link/action visibility vs. authenticated actions,
     active-link highlighting by URL, the mobile hamburger menu, the
     mobile search toggle, the "Services" dropdown, the profile dropdown,
     the scroll shadow, dynamically loading the signed-in user's info +
     unread badge counts, and logout.

     Uses event delegation on `document` so it works whether the navbar was
     already in the page markup or injected later via `loadIncludes()`. */

  // TODO: once auth.js/api.js exist, source all of this from the real
  // session/API instead of localStorage + these placeholders.
  const ROLE_DEMO_USERS = {
    client: { name: 'Jane Doe', email: 'jane.doe@email.com' },
    lawyer: { name: 'Amina Yusuf', email: 'amina.yusuf@dlss.co.ke' },
    admin: { name: 'Samuel Otieno', email: 'samuel.otieno@dlss.co.ke' },
  };

  function getInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  // Any element sharing a page with the sidebar (e.g. `.sidebar-toggle-mobile`
  // buttons in the navbar) only makes sense once the sidebar actually exists.
  function syncSidebarToggle() {
    document.body.classList.toggle('has-sidebar-toggle', !!document.getElementById('sidebar'));
  }

  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    syncSidebarToggle();

    const role = document.body.getAttribute('data-role');
    const isAuthenticated = ['client', 'lawyer', 'admin'].includes(role);

    // --- Nav links: only the guest (marketing) link list exists today —
    // hide it once signed in, since the sidebar owns dashboard navigation.
    navbar.querySelectorAll('.navbar-links[data-nav-role]').forEach((group) => {
      group.hidden = group.getAttribute('data-nav-role') !== (isAuthenticated ? role : 'guest');
    });

    // --- Guest vs. authenticated actions (login/register vs. search icons+profile).
    navbar.querySelectorAll('[data-nav-role="guest"], [data-nav-role="authenticated"]').forEach((el) => {
      if (!el.classList.contains('navbar-actions')) return;
      const wantsAuthenticated = el.getAttribute('data-nav-role') === 'authenticated';
      el.hidden = wantsAuthenticated !== isAuthenticated;
    });

    // --- Active link: match against the current URL so every page "just works".
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    navbar.querySelectorAll('.navbar-link[href]').forEach((link) => {
      const linkPath = new URL(link.getAttribute('href'), window.location.origin).pathname;
      const isActive = linkPath === currentPath;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // Dropdown toggles (e.g. "Services") have no `href` of their own, so
    // highlight them when the current page matches their `data-active-prefix`.
    navbar.querySelectorAll('.navbar-dropdown-toggle[data-active-prefix]').forEach((toggle) => {
      toggle.classList.toggle('active', currentPath === toggle.getAttribute('data-active-prefix'));
    });

    // --- Dynamically loaded user info + notification/message badges.
    if (isAuthenticated) {
      let user = {};
      try {
        user = JSON.parse(localStorage.getItem('dlss:user')) || {};
      } catch (error) {
        user = {};
      }
      const demo = ROLE_DEMO_USERS[role] || {};
      const name = user.name || demo.name || 'Account';
      const email = user.email || demo.email || '';
      const initials = getInitials(name);

      ['navbarProfileAvatar', 'navbarProfileMenuAvatar'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = initials;
      });
      ['navbarProfileName', 'navbarProfileMenuName'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = name;
      });
      const roleEl = document.getElementById('navbarProfileRole');
      if (roleEl) roleEl.textContent = role;
      const emailEl = document.getElementById('navbarProfileMenuEmail');
      if (emailEl) emailEl.textContent = email;

      const profileLink = document.getElementById('navbarProfileLink');
      if (profileLink) profileLink.href = `/pages/${role}/profile.html`;
      const settingsLink = document.getElementById('navbarSettingsLink');
      if (settingsLink) settingsLink.href = `/pages/${role}/settings.html`;

      const notificationsLink = document.getElementById('navbarNotifications');
      if (notificationsLink) notificationsLink.href = `/pages/${role}/notifications.html`;
      const messagesLink = document.getElementById('navbarMessages');
      if (messagesLink) messagesLink.href = `/pages/${role}/messages.html`;

      const setBadge = (id, storageKey, fallback) => {
        const badge = document.getElementById(id);
        if (!badge) return;
        const stored = Number(localStorage.getItem(storageKey));
        const count = Number.isFinite(stored) && localStorage.getItem(storageKey) !== null ? stored : fallback;
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.hidden = !count;
      };
      setBadge('navbarNotificationsBadge', 'dlss:notifications-count', 5);
      setBadge('navbarMessagesBadge', 'dlss:messages-count', 2);
    }

    // --- Mobile hamburger menu.
    const closeMenu = () => {
      const toggle = document.getElementById('navbarToggle');
      const menu = document.getElementById('navbarMenu');
      if (!toggle || !menu) return;
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    };

    // --- Mobile search toggle.
    const closeSearch = () => {
      const toggle = document.getElementById('navbarSearchToggle');
      const search = document.getElementById('navbarSearch');
      if (!toggle || !search) return;
      search.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    // --- Profile dropdown.
    const closeProfileMenu = () => {
      const toggle = document.getElementById('navbarProfileToggle');
      const menu = document.getElementById('navbarProfileMenu');
      if (!toggle || !menu) return;
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };

    // --- Link dropdowns (e.g. "Services"): generic, supports any number
    // of `.navbar-dropdown-toggle` + `aria-controls` pairs.
    const closeAllLinkDropdowns = (except) => {
      navbar.querySelectorAll('.navbar-dropdown-toggle').forEach((toggle) => {
        if (toggle === except) return;
        const menu = document.getElementById(toggle.getAttribute('aria-controls'));
        if (menu) menu.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      });
    };

    document.addEventListener('click', (event) => {
      const menuToggle = event.target.closest('#navbarToggle');
      const menu = document.getElementById('navbarMenu');
      if (menuToggle && menu) {
        const isOpen = menu.classList.toggle('is-open');
        menuToggle.classList.toggle('is-active', isOpen);
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        closeSearch();
        closeAllLinkDropdowns();
        return;
      }

      const searchToggle = event.target.closest('#navbarSearchToggle');
      const search = document.getElementById('navbarSearch');
      if (searchToggle && search) {
        const isOpen = search.classList.toggle('is-open');
        searchToggle.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
          const input = document.getElementById('navbarSearchInput');
          if (input) input.focus();
        }
        closeMenu();
        closeAllLinkDropdowns();
        return;
      }

      const profileToggle = event.target.closest('#navbarProfileToggle');
      const profileMenu = document.getElementById('navbarProfileMenu');
      if (profileToggle && profileMenu) {
        const isOpen = profileMenu.hidden;
        profileMenu.hidden = !isOpen;
        profileToggle.setAttribute('aria-expanded', String(isOpen));
        closeAllLinkDropdowns();
        return;
      }

      const dropdownToggle = event.target.closest('.navbar-dropdown-toggle');
      if (dropdownToggle) {
        const dropdownMenu = document.getElementById(dropdownToggle.getAttribute('aria-controls'));
        if (dropdownMenu) {
          const isOpen = dropdownMenu.hidden;
          closeAllLinkDropdowns(dropdownToggle);
          dropdownMenu.hidden = !isOpen;
          dropdownToggle.setAttribute('aria-expanded', String(isOpen));
        }
        return;
      }

      // Selecting a dropdown link closes that dropdown and the mobile menu
      // (the page will navigate).
      if (event.target.closest('.navbar-dropdown-link')) {
        closeAllLinkDropdowns();
        closeMenu();
      } else if (!event.target.closest('.navbar-dropdown')) {
        closeAllLinkDropdowns();
      }

      // Selecting a profile menu item (link or logout) closes the dropdown.
      if (event.target.closest('.navbar-profile-menu-link')) {
        closeProfileMenu();
      } else if (!event.target.closest('.navbar-profile')) {
        closeProfileMenu();
      }

      // Close the mobile menu when a nav link inside it is clicked.
      if (event.target.closest('.navbar-link') && !event.target.closest('.navbar-dropdown-toggle')) {
        closeMenu();
        return;
      }

      // Close everything when clicking anywhere outside the navbar entirely.
      if (!event.target.closest('.navbar')) {
        closeMenu();
        closeSearch();
        closeAllLinkDropdowns();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeMenu();
      closeSearch();
      closeProfileMenu();
      closeAllLinkDropdowns();
    });

    // Reset mobile-only open states once the viewport grows past the
    // breakpoint where they become permanent/inline elements.
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992) {
        closeMenu();
        closeAllLinkDropdowns();
      }
      if (window.innerWidth >= 768) closeSearch();
    });

    // --- Scroll shadow.
    const onScroll = () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- Logout.
    // TODO: once auth.js exists, clear the real session/token there instead.
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#navbarLogout')) return;
      localStorage.removeItem('dlss:token');
      localStorage.removeItem('dlss:user');
      window.location.href = '/pages/auth/login.html';
    });
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

    syncSidebarToggle();

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
