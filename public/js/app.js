/**
 * DLSS — Application bootstrap.
 *
 * Wires up global UI behavior (navbar, sidebar, footer, modal, loader,
 * pagination). Written as a plain script (no bundler/module system) so
 * it can be dropped into any page with:
 *
 *   <script src="/js/componentLoader.js" defer></script>
 *   <script src="/js/app.js" defer></script>
 *
 * Component HTML fragments (navbar.html, footer.html, ...) are fetched
 * and injected by js/componentLoader.js — the one file responsible for
 * that — which this script listens to via the `dlss:component-loaded`
 * event rather than loading anything itself. Other scripts (router.js,
 * auth.js, notifications.js, ...) attach themselves to the same
 * `window.DLSS` namespace to stay dependency-free and avoid polluting
 * the global scope.
 */

window.DLSS = window.DLSS || {};

(function () {
  'use strict';

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
    // highlight them whenever the current page falls under their
    // `data-active-prefix` (e.g. any `/pages/website/services/*` page).
    navbar.querySelectorAll('.navbar-dropdown-toggle[data-active-prefix]').forEach((toggle) => {
      const prefix = toggle.getAttribute('data-active-prefix');
      toggle.classList.toggle('active', currentPath === prefix || currentPath.startsWith(`${prefix}/`) || currentPath === `${prefix}.html`);
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
        // Also collapse any mega-menu category accordions inside it, so
        // it starts fresh (all categories collapsed) next time it opens.
        menu?.querySelectorAll('.navbar-mega-col-toggle').forEach((colToggle) => {
          colToggle.setAttribute('aria-expanded', 'false');
          const colList = document.getElementById(colToggle.getAttribute('aria-controls'));
          if (colList) colList.classList.remove('is-open');
        });
      });
    };

    // --- Mega-menu category accordions (mobile only — see responsive.css,
    // where `.navbar-mega-col-toggle` becomes inert and every category
    // list stays permanently expanded from `lg` up).
    const toggleMegaColumn = (toggle) => {
      const list = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!list) return;
      const isOpen = list.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
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

      // Mega-menu category accordion (e.g. "Legal Advisory" inside "Services").
      const megaColToggle = event.target.closest('.navbar-mega-col-toggle');
      if (megaColToggle) {
        toggleMegaColumn(megaColToggle);
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
     MODAL LIBRARY
     ==========================================================================
     Generic open/close/focus-trap engine for every modal in
     components/modal.html (Login, Registration, Book Consultation, New
     Legal Matter, New Claim, Upload Documents, View Document, Payment,
     Due Diligence Request, Registration Service Request, Contact Advocate,
     plus the four reusable status modals: Confirmation/Success/Error/
     Notification). Works via event delegation on `document`, so it
     doesn't matter whether the modal markup was already in the page or
     injected later via `loadIncludes()`.

     Markup contract (see components/modal.html header comment for the
     full usage guide):
       [data-modal-open="someModalId"]      -> opens #someModalId
       [data-modal-close]                   -> closes its nearest modal
       .modal-backdrop[data-close-on-backdrop="false"] -> opts out of
                                                closing when the dark
                                                backdrop itself is clicked
       form[data-modal-form]                -> gets validation + a
                                                simulated loading/submit
                                                flow (see handleModalFormSubmit) */

  const openModalStack = []; // [{ id, trigger }] — supports modals stacked on top of modals

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }

  function openModal(id, triggerEl) {
    const backdrop = document.getElementById(id);
    if (!backdrop || !backdrop.classList.contains('modal-backdrop')) {
      console.warn(`[DLSS] Modal "${id}" not found.`);
      return;
    }
    if (backdrop.classList.contains('is-open')) return;

    openModalStack.push({ id, trigger: triggerEl || document.activeElement });
    backdrop.classList.add('is-open');
    document.body.classList.add('modal-open');

    const dialog = backdrop.querySelector('.modal');
    const focusable = dialog ? getFocusableElements(dialog) : [];
    const autofocusTarget = focusable.find((el) => !el.hasAttribute('data-modal-close') && !el.classList.contains('modal-close')) || dialog;
    if (autofocusTarget) autofocusTarget.focus();

    document.dispatchEvent(new CustomEvent('dlss:modal-opened', { detail: { id } }));
  }

  function closeModal(id) {
    const backdrop = document.getElementById(id);
    if (!backdrop || !backdrop.classList.contains('is-open')) return;

    backdrop.classList.remove('is-open');

    const stackIndex = openModalStack.findIndex((entry) => entry.id === id);
    const entry = stackIndex > -1 ? openModalStack.splice(stackIndex, 1)[0] : null;

    if (openModalStack.length === 0) {
      document.body.classList.remove('modal-open');
    }

    if (entry && entry.trigger && typeof entry.trigger.focus === 'function' && document.contains(entry.trigger)) {
      entry.trigger.focus();
    }

    document.dispatchEvent(new CustomEvent('dlss:modal-closed', { detail: { id } }));
  }

  function closeTopModal() {
    if (!openModalStack.length) return;
    closeModal(openModalStack[openModalStack.length - 1].id);
  }

  function closeAllModals() {
    [...openModalStack].reverse().forEach((entry) => closeModal(entry.id));
  }

  /* --- Lightweight required/email/match validation for modal forms.
     Real server-side validation still applies once api.js exists — this
     is just fast inline feedback matching css/forms.css's `.is-invalid`
     / `.invalid-feedback` convention. --- */
  function validateModalForm(form) {
    let firstInvalid = null;

    form.querySelectorAll('input, select, textarea').forEach((field) => {
      if (field.type === 'file' || field.type === 'checkbox' || field.type === 'radio') return;

      let isValid = true;
      if (field.hasAttribute('required') && !field.value.trim()) isValid = false;
      if (isValid && field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) isValid = false;
      if (isValid && field.minLength > 0 && field.value && field.value.length < field.minLength) isValid = false;
      if (isValid && field.hasAttribute('data-match')) {
        const other = form.querySelector(`#${field.getAttribute('data-match')}`);
        if (other && field.value !== other.value) isValid = false;
      }

      field.classList.toggle('is-invalid', !isValid);
      if (!isValid && !firstInvalid) firstInvalid = field;
    });

    // Required checkboxes (e.g. "I agree to the Terms").
    form.querySelectorAll('input[type="checkbox"][required]').forEach((field) => {
      const isValid = field.checked;
      field.classList.toggle('is-invalid', !isValid);
      if (!isValid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // TODO: once api.js exists, replace the setTimeout() below with a real
  // fetch() call; keep the same success/error branching so
  // data-modal-success / data-modal-error keep working unchanged.
  function handleModalFormSubmit(event) {
    const form = event.target.closest('form[data-modal-form]');
    if (!form) return;
    event.preventDefault();

    if (form.dataset.submitting === 'true') return; // guard against duplicate submits
    if (!validateModalForm(form)) return;

    const submitBtn = document.querySelector(`button[type="submit"][form="${form.id}"]`) || form.querySelector('button[type="submit"]');
    form.dataset.submitting = 'true';
    if (submitBtn) {
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
    }

    window.setTimeout(() => {
      form.dataset.submitting = 'false';
      if (submitBtn) {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }

      const backdrop = form.closest('.modal-backdrop');
      if (backdrop) closeModal(backdrop.id);

      form.reset();
      form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
      form.querySelectorAll('[data-file-list]').forEach((list) => { list.innerHTML = ''; });

      const successId = form.getAttribute('data-modal-success');
      if (successId) {
        window.DLSS.Modal.success({
          title: form.getAttribute('data-success-title') || 'Success!',
          text: form.getAttribute('data-success-text') || 'Your action was completed successfully.',
        });
      }
    }, 900);
  }

  /* --- File chips: preview selected files below any `.modal-dropzone`,
     with drag-over styling and a per-file remove (×) control. --- */
  function renderFileChips(input) {
    const group = input.closest('.form-group');
    const list = group ? group.querySelector('[data-file-list]') : null;
    if (!list) return;

    list.innerHTML = '';
    Array.from(input.files || []).forEach((file, index) => {
      const chip = document.createElement('div');
      chip.className = 'modal-file-chip';
      chip.innerHTML =
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2.5h5.5L16 7v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"/><path d="M11.3 2.5V7H16"/></svg>' +
        `<span class="modal-file-chip-name">${file.name}</span>` +
        '<span class="modal-file-chip-remove" role="button" tabindex="0" aria-label="Remove file">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></span>';
      chip.querySelector('.modal-file-chip-remove').addEventListener('click', () => {
        const dt = new DataTransfer();
        Array.from(input.files).forEach((f, i) => { if (i !== index) dt.items.add(f); });
        input.files = dt.files;
        renderFileChips(input);
      });
      list.appendChild(chip);
    });
  }

  function initModals() {
    const root = document.getElementById('modalRoot');
    if (!root) return;

    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-modal-open]');
      if (opener) {
        event.preventDefault();
        openModal(opener.getAttribute('data-modal-open'), opener);
        return;
      }

      const closer = event.target.closest('[data-modal-close]');
      if (closer) {
        const backdrop = closer.closest('.modal-backdrop');
        if (backdrop) closeModal(backdrop.id);
        return;
      }

      // Clicking the dark backdrop itself (not the dialog) closes the
      // modal, unless it explicitly opts out (e.g. the Payment modal).
      if (event.target.classList.contains('modal-backdrop') && event.target.getAttribute('data-close-on-backdrop') !== 'false') {
        closeModal(event.target.id);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!openModalStack.length) return;

      if (event.key === 'Escape') {
        closeTopModal();
        return;
      }

      if (event.key === 'Tab') {
        const topId = openModalStack[openModalStack.length - 1].id;
        const dialog = document.getElementById(topId)?.querySelector('.modal');
        if (!dialog) return;
        const focusable = getFocusableElements(dialog);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.addEventListener('submit', handleModalFormSubmit);

    document.addEventListener('change', (event) => {
      if (event.target.matches('.modal-dropzone input[type="file"]')) {
        renderFileChips(event.target);
      }
    });

    ['dragenter', 'dragover'].forEach((type) => {
      document.addEventListener(type, (event) => {
        const zone = event.target.closest('.modal-dropzone');
        if (!zone) return;
        event.preventDefault();
        zone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      document.addEventListener(type, (event) => {
        const zone = event.target.closest('.modal-dropzone');
        if (!zone) return;
        if (type === 'drop') {
          event.preventDefault();
          const input = zone.querySelector('input[type="file"]');
          if (input && event.dataTransfer?.files?.length) {
            input.files = event.dataTransfer.files;
            renderFileChips(input);
          }
        }
        zone.classList.remove('is-dragover');
      });
    });
  }

  document.addEventListener('dlss:component-loaded', (event) => {
    if (event.detail.name === 'modal') initModals();
  });

  /* --- Public API for the four generic status modals, so any page/script
     can trigger them without knowing their internal markup, e.g.:
       DLSS.Modal.confirm({ title: 'Delete document?', danger: true, onConfirm: () => {...} })
       DLSS.Modal.success({ text: 'Document uploaded.' })                                   */
  let confirmHandler = null;

  window.DLSS.Modal = {
    open: openModal,
    close: closeModal,
    closeAll: closeAllModals,

    confirm({ title, text, confirmLabel, cancelLabel, danger = true, onConfirm } = {}) {
      const titleEl = document.getElementById('confirmModalTitle');
      const textEl = document.getElementById('confirmModalText');
      const confirmBtn = document.getElementById('confirmModalConfirmBtn');
      if (titleEl) titleEl.textContent = title || 'Are you sure?';
      if (textEl) textEl.textContent = text || 'This action cannot be undone.';
      if (confirmBtn) {
        confirmBtn.textContent = confirmLabel || 'Confirm';
        confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
        if (confirmHandler) confirmBtn.removeEventListener('click', confirmHandler);
        confirmHandler = () => {
          closeModal('confirmModal');
          if (typeof onConfirm === 'function') onConfirm();
        };
        confirmBtn.addEventListener('click', confirmHandler);
      }
      const cancelBtn = document.querySelector('#confirmModal [data-modal-close]');
      if (cancelBtn) cancelBtn.textContent = cancelLabel || 'Cancel';
      openModal('confirmModal');
    },

    success({ title, text } = {}) {
      const titleEl = document.getElementById('successModalTitle');
      const textEl = document.getElementById('successModalText');
      if (titleEl) titleEl.textContent = title || 'Success!';
      if (textEl) textEl.textContent = text || 'Your action was completed successfully.';
      openModal('successModal');
    },

    error({ title, text } = {}) {
      const titleEl = document.getElementById('errorModalTitle');
      const textEl = document.getElementById('errorModalText');
      if (titleEl) titleEl.textContent = title || 'Something Went Wrong';
      if (textEl) textEl.textContent = text || "Please try again, or contact support if the problem continues.";
      openModal('errorModal');
    },

    notify({ title, text, meta, viewHref } = {}) {
      const titleEl = document.getElementById('notificationModalTitle');
      const textEl = document.getElementById('notificationModalText');
      const metaEl = document.getElementById('notificationModalMeta');
      const viewBtn = document.getElementById('notificationModalPrimaryBtn');
      if (titleEl) titleEl.textContent = title || 'New Update';
      if (textEl) textEl.textContent = text || 'You have a new update on your account.';
      if (metaEl) metaEl.textContent = meta || 'Just now';
      if (viewBtn) viewBtn.href = viewHref || '#';
      openModal('notificationModal');
    },

    viewDocument({ name, category, size, date, uploader } = {}) {
      const setText = (attr, value) => {
        const el = document.querySelector(`[data-doc-${attr}]`);
        if (el && value !== undefined) el.textContent = value;
      };
      setText('name', name);
      setText('category', category);
      setText('size', size);
      setText('date', date);
      setText('uploader', uploader);
      openModal('viewDocumentModal');
    },

    pay({ invoiceNumber, description, amount } = {}) {
      const setText = (attr, value) => {
        const el = document.querySelector(`[data-invoice-${attr}]`);
        if (el && value !== undefined) el.textContent = value;
      };
      setText('number', invoiceNumber);
      setText('description', description);
      setText('amount', amount);
      openModal('paymentModal');
    },
  };

  /* ==========================================================================
     LOADER LIBRARY
     ==========================================================================
     Feedback for every asynchronous operation (see components/loader.html
     for the full spec + markup this drives): a full-page overlay, inline
     section loaders, a `.btn.is-loading` helper (buttons.css owns that
     state itself — this just toggles it consistently), a progress-bar
     setter, and generic skeleton placeholders. Works via the singleton
     overlay + <template>s in components/loader.html, so it doesn't matter
     whether that markup was already in the page or injected later via
     loadIncludes(). All lookups happen on demand (no cached refs), so it
     also doesn't matter whether loader.html loads before or after the
     first DLSS.Loader.* call. */

  let pageLoaderTimeoutId = null;
  let pageLoaderRetryHandler = null;

  function loaderRefs() {
    return {
      overlay: document.getElementById('pageLoader'),
      message: document.getElementById('pageLoaderMessage'),
      errorMessage: document.getElementById('pageLoaderErrorMessage'),
      retryBtn: document.getElementById('pageLoaderRetryBtn'),
      inlineTemplate: document.getElementById('inlineLoaderTemplate'),
      errorTemplate: document.getElementById('loaderErrorTemplate'),
    };
  }

  /* --- 1. Full-page loader: for major, app-blocking transitions (login,
     registration, dashboard init, app startup, session verification).
     Locks background scroll/interaction while active. --- */
  const PageLoader = {
    show(message, { timeout, onTimeout } = {}) {
      const { overlay, message: messageEl } = loaderRefs();
      if (!overlay) {
        console.warn('[DLSS] Page loader markup not found — include components/loader.html.');
        return;
      }

      overlay.classList.remove('has-error');
      if (messageEl) messageEl.textContent = message || 'Please wait\u2026';
      overlay.classList.add('is-active');
      document.body.classList.add('loader-open');

      window.clearTimeout(pageLoaderTimeoutId);
      if (timeout) {
        pageLoaderTimeoutId = window.setTimeout(() => {
          PageLoader.error(
            'This is taking longer than expected. Please check your connection and try again.',
            onTimeout
          );
        }, timeout);
      }
    },

    hide() {
      const { overlay } = loaderRefs();
      if (!overlay) return;
      window.clearTimeout(pageLoaderTimeoutId);
      overlay.classList.remove('is-active', 'has-error');
    },

    /* Swaps the spinner for an error + optional Retry button without
       dropping the overlay — used automatically when `timeout` elapses,
       or call directly if a blocking request itself fails. */
    error(message, onRetry) {
      const { overlay, errorMessage, retryBtn } = loaderRefs();
      if (!overlay) return;
      window.clearTimeout(pageLoaderTimeoutId);

      overlay.classList.add('is-active', 'has-error');
      document.body.classList.add('loader-open');
      if (errorMessage) errorMessage.textContent = message || 'Something went wrong. Please try again.';

      if (retryBtn) {
        if (pageLoaderRetryHandler) retryBtn.removeEventListener('click', pageLoaderRetryHandler);
        retryBtn.hidden = typeof onRetry !== 'function';
        if (typeof onRetry === 'function') {
          pageLoaderRetryHandler = onRetry;
          retryBtn.addEventListener('click', pageLoaderRetryHandler);
        }
      }
    },
  };

  /* --- 2. Inline loader: a small, non-blocking spinner + message inside
     a specific section (cases, claims, consultations, messages, reports,
     notifications) while its content loads. Returns a handle so the
     caller can remove it once real content is ready to render. --- */
  function showInlineLoader(container, { message = 'Loading\u2026', row = false } = {}) {
    const { inlineTemplate } = loaderRefs();
    if (!container || !inlineTemplate) return { hide() {} };

    container.querySelectorAll(':scope > .loader-inline').forEach((el) => el.remove());

    const node = inlineTemplate.content.firstElementChild.cloneNode(true);
    if (row) node.classList.add('loader-inline-row');
    node.querySelector('.loader-inline-message').textContent = message;
    container.appendChild(node);

    return { hide: () => node.remove() };
  }

  /* --- 3. Button loader: thin wrapper around buttons.css's `.btn.is-loading`
     so every call site disables the button (preventing duplicate
     submissions) the same way. --- */
  function setButtonLoading(button, isLoading = true) {
    if (!button) return;
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
  }

  /* --- 4. Progress loader: determinate (0-100) or 'indeterminate', for
     long-running-but-trackable work (file upload, document processing,
     report generation, due diligence, data import). Accepts either the
     `.progress` wrapper or the `.progress-bar` element itself. --- */
  function setProgress(el, value) {
    if (!el) return;
    const root = el.classList.contains('progress') ? el : el.closest('.progress');
    const bar = el.classList.contains('progress-bar') ? el : el.querySelector('.progress-bar');
    if (!bar) return;

    if (value === 'indeterminate') {
      bar.classList.add('is-indeterminate');
      bar.style.width = '';
      root?.removeAttribute('aria-valuenow');
      return;
    }

    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    bar.classList.remove('is-indeterminate');
    bar.style.width = `${pct}%`;
    root?.setAttribute('aria-valuenow', String(Math.round(pct)));

    const label = (root || bar.parentElement)?.querySelector('.progress-label');
    if (label) label.textContent = `${Math.round(pct)}%`;
  }

  /* --- 5. Skeleton loader: generic placeholder rows for any container
     (dashboard cards, case/claim lists, lawyer profiles, consultation
     history, reports, documents) when a bespoke skeleton shaped to that
     content isn't worth hand-authoring — see css/loader.css "5. SKELETON
     LOADER" for the primitives to compose a custom one instead. --- */
  function renderSkeleton(container, { rows = 3, avatar = false } = {}) {
    if (!container) return;
    container.innerHTML = '';
    container.classList.add('is-loading-skeleton');

    if (avatar) {
      const row = document.createElement('div');
      row.className = 'skeleton-row';
      row.innerHTML = '<span class="skeleton skeleton-avatar"></span><span class="skeleton skeleton-text" style="width:40%"></span>';
      container.appendChild(row);
    }

    for (let i = 0; i < rows; i++) {
      const line = document.createElement('span');
      line.className = 'skeleton skeleton-text';
      if (i === rows - 1) line.style.width = '60%';
      container.appendChild(line);
    }
  }

  function clearSkeleton(container) {
    if (!container) return;
    container.classList.remove('is-loading-skeleton');
    container.innerHTML = '';
  }

  /* --- 6. Loading-failed state: swaps a container's contents (inline
     sections only — the full-page loader uses PageLoader.error() so it
     can hide/reveal in place instead of re-cloning) for a message + an
     optional Retry action. --- */
  function renderLoaderError(container, { message = 'Something went wrong. Please try again.', onRetry } = {}) {
    const { errorTemplate } = loaderRefs();
    if (!container || !errorTemplate) return;

    container.innerHTML = '';
    container.classList.remove('is-loading-skeleton');

    const node = errorTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.loader-error-message').textContent = message;
    const retryBtn = node.querySelector('[data-loader-retry]');
    if (retryBtn) {
      if (typeof onRetry === 'function') {
        retryBtn.addEventListener('click', onRetry);
      } else {
        retryBtn.hidden = true;
      }
    }
    container.appendChild(node);
  }

  window.DLSS.Loader = {
    page: PageLoader,
    inline: showInlineLoader,
    button: setButtonLoading,
    progress: setProgress,
    skeleton: renderSkeleton,
    clearSkeleton,
    error: renderLoaderError,
  };

  /* ==========================================================================
     PAGINATION LIBRARY
     ==========================================================================
     Splits a long list into pages: a result-count summary, numbered page
     buttons (with smart ellipsis) collapsing to a compact "Page X of Y"
     label on mobile, previous/next controls, and a page-size changer. See
     components/pagination.html for the full usage guide + the markup
     this drives. Unlike Modal/Loader (fixed singleton slots), a page can
     have several independent pagination bars, so this is a small
     factory rather than a single global instance:

       const pager = DLSS.Pagination.create(container, {
         totalItems: 248, pageSize: 10, itemLabel: 'cases',
         onChange({ page, pageSize }) { loadCases({ page, pageSize }); },
       });
       pager.update({ totalItems: 240 });   // resync after data changes
       pager.getState();                    // { page, pageSize, totalPages, totalItems }
       pager.destroy();                     // remove its DOM + listeners */

  /* Classic "boundary + siblings" page-range algorithm — returns page
     numbers plus the string 'dots' wherever a gap collapses into an
     ellipsis, e.g. getPageRange(6, 20, 1) -> [1,'dots',5,6,7,'dots',20]. */
  function getPageRange(current, total, siblingCount) {
    const totalSlots = siblingCount * 2 + 5; // first + last + current + 2*siblings + 2*ellipsis
    if (total <= totalSlots) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const leftSibling = Math.max(current - siblingCount, 1);
    const rightSibling = Math.min(current + siblingCount, total);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < total - 1;

    if (!showLeftDots && showRightDots) {
      const leftCount = 3 + siblingCount * 2;
      return [...Array.from({ length: leftCount }, (_, i) => i + 1), 'dots', total];
    }
    if (showLeftDots && !showRightDots) {
      const rightCount = 3 + siblingCount * 2;
      return [1, 'dots', ...Array.from({ length: rightCount }, (_, i) => total - rightCount + 1 + i)];
    }
    return [
      1,
      'dots',
      ...Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i),
      'dots',
      total,
    ];
  }

  function createPagination(container, options = {}) {
    const template = document.getElementById('paginationTemplate');
    if (!container || !template) {
      console.warn('[DLSS] Pagination markup not found — include components/pagination.html.');
      return { update() {}, goTo() {}, getState: () => ({}), destroy() {} };
    }

    const state = {
      page: Math.max(1, options.currentPage || 1),
      pageSize: options.pageSize || 10,
      totalItems: options.totalItems || 0,
      pageSizeOptions: options.pageSizeOptions || [10, 25, 50, 100],
      siblingCount: options.siblingCount || 1,
      itemLabel: options.itemLabel || 'results',
      onChange: typeof options.onChange === 'function' ? options.onChange : () => {},
    };

    const nav = template.content.firstElementChild.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(nav);

    const els = {
      summary: nav.querySelector('.pagination-summary'),
      prevBtn: nav.querySelector('[data-page-prev]'),
      nextBtn: nav.querySelector('[data-page-next]'),
      list: nav.querySelector('.pagination-list'),
      compactLabel: nav.querySelector('.pagination-compact-label'),
      sizeSelect: nav.querySelector('[data-page-size]'),
    };

    els.sizeSelect.innerHTML = state.pageSizeOptions
      .map((size) => `<option value="${size}">${size}</option>`)
      .join('');

    const totalPages = () => Math.max(1, Math.ceil(state.totalItems / state.pageSize));
    const clampPage = () => {
      state.page = Math.min(Math.max(1, state.page), totalPages());
    };

    function render() {
      clampPage();
      const pages = totalPages();
      const isEmpty = state.totalItems === 0;
      nav.classList.toggle('is-empty', isEmpty);

      const start = isEmpty ? 0 : (state.page - 1) * state.pageSize + 1;
      const end = isEmpty ? 0 : Math.min(state.page * state.pageSize, state.totalItems);
      els.summary.innerHTML = isEmpty
        ? `No ${state.itemLabel} found.`
        : `Showing <strong>${start}\u2013${end}</strong> of <strong>${state.totalItems}</strong> ${state.itemLabel}`;

      if (isEmpty) return;

      els.prevBtn.disabled = state.page <= 1;
      els.nextBtn.disabled = state.page >= pages;
      els.compactLabel.textContent = `Page ${state.page} of ${pages}`;

      els.list.innerHTML = '';
      getPageRange(state.page, pages, state.siblingCount).forEach((entry) => {
        const li = document.createElement('li');
        if (entry === 'dots') {
          li.innerHTML = '<span class="pagination-ellipsis" aria-hidden="true">\u2026</span>';
        } else {
          const isActive = entry === state.page;
          li.innerHTML = `<button type="button" class="pagination-btn pagination-page${isActive ? ' is-active' : ''}" data-page="${entry}"${isActive ? ' aria-current="page"' : ''}>${entry}</button>`;
        }
        els.list.appendChild(li);
      });

      els.sizeSelect.value = String(state.pageSize);
    }

    function goTo(page) {
      const next = Math.min(Math.max(1, page), totalPages());
      if (next === state.page) return;
      state.page = next;
      render();
      state.onChange({ page: state.page, pageSize: state.pageSize });
    }

    function onNavClick(event) {
      const pageBtn = event.target.closest('[data-page]');
      if (pageBtn) {
        goTo(Number(pageBtn.dataset.page));
        return;
      }
      if (event.target.closest('[data-page-prev]')) {
        goTo(state.page - 1);
        return;
      }
      if (event.target.closest('[data-page-next]')) {
        goTo(state.page + 1);
      }
    }

    function onSizeChange(event) {
      state.pageSize = Number(event.target.value) || state.pageSize;
      state.page = 1;
      render();
      state.onChange({ page: state.page, pageSize: state.pageSize });
    }

    nav.addEventListener('click', onNavClick);
    els.sizeSelect.addEventListener('change', onSizeChange);

    render();

    return {
      update({ totalItems, currentPage, pageSize } = {}) {
        if (totalItems !== undefined) state.totalItems = totalItems;
        if (pageSize !== undefined) state.pageSize = pageSize;
        if (currentPage !== undefined) state.page = currentPage;
        render();
      },
      goTo,
      getState: () => ({
        page: state.page,
        pageSize: state.pageSize,
        totalPages: totalPages(),
        totalItems: state.totalItems,
      }),
      destroy() {
        nav.removeEventListener('click', onNavClick);
        els.sizeSelect.removeEventListener('change', onSizeChange);
        nav.remove();
      },
    };
  }

  window.DLSS.Pagination = { create: createPagination };

  /* ==========================================================================
     BOOTSTRAP
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', () => {
    // Component fragments themselves are loaded by js/componentLoader.js
    // (make sure its <script> tag comes before this one) — it fires the
    // `dlss:component-loaded` events each init*() above already listens
    // for. This just covers the case where navbar/sidebar/footer/modal
    // markup is already inlined in the page (rather than loaded via
    // data-include), so it still needs to be initialized immediately.
    if (document.getElementById('navbar') && !document.querySelector('[data-include="navbar"]')) {
      initNavbar();
    }
    if (document.getElementById('sidebar') && !document.querySelector('[data-include="sidebar"]')) {
      initSidebar();
    }
    if (document.getElementById('footer') && !document.querySelector('[data-include="footer"]')) {
      initFooter();
    }
    if (document.getElementById('modalRoot') && !document.querySelector('[data-include="modal"]')) {
      initModals();
    }
  });

  window.DLSS.initNavbar = initNavbar;
  window.DLSS.initFooter = initFooter;
  window.DLSS.initSidebar = initSidebar;
  window.DLSS.initModals = initModals;
})();
