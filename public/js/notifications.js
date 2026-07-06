/**
 * DLSS — Notification (Toast) Engine.
 *
 * Renders brief, auto-dismissing "toast" alerts (Success / Error /
 * Warning / Information) into the live region provided by
 * components/notification.html, without ever blocking the page the way
 * a modal does. Attaches its public API to `window.DLSS.Notify` so any
 * script/page can fire one without knowing the markup:
 *
 *   DLSS.Notify.success('Consultation booked successfully.');
 *   DLSS.Notify.error('Payment failed.');
 *   DLSS.Notify.warning('Your session will expire in 2 minutes.', { persist: true });
 *   DLSS.Notify.info('A new message has been received.', {
 *     actions: [{ label: 'View Details', href: '/pages/client/messages.html' }],
 *   });
 *
 * See show() below for the full options shape. Works via event
 * delegation/per-toast listeners, so it doesn't matter whether
 * components/notification.html was already in the page or injected
 * later via loadIncludes() (js/app.js).
 */

window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  const MAX_VISIBLE = 5;

  const DEFAULTS = {
    success: { title: 'Success', duration: 4000 },
    error: { title: 'Error', duration: 6000 },
    warning: { title: 'Warning', duration: 6000 },
    info: { title: 'Notice', duration: 5000 },
  };

  const ICONS = {
    success:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M6.3 10.2l2.5 2.5 4.7-5.2"/></svg>',
    error:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4"/></svg>',
    warning:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3 18 16H2L10 3Z"/><path d="M10 8.3v3.7M10 14.6h.01"/></svg>',
    info:
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9.2v4.3M10 6.8h.01"/></svg>',
  };

  let container = null;
  let template = null;
  let counter = 0;

  const visible = new Map(); // id -> entry
  const queue = []; // entries waiting for a free slot (MAX_VISIBLE reached)

  function refs() {
    if (!container) container = document.getElementById('toastContainer');
    if (!template) template = document.getElementById('toastTemplate');
    return !!(container && template && template.content);
  }

  function formatTimestamp(date) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function clearTimer(entry) {
    if (entry.timerId) {
      window.clearTimeout(entry.timerId);
      entry.timerId = null;
    }
  }

  /* --- Auto-dismiss timer + its progress-bar readout, kept in sync so
     hovering/focusing a toast can pause and resume both precisely. --- */
  function startTimer(entry) {
    if (entry.persist || entry.remaining <= 0) return;
    entry.startedAt = Date.now();
    entry.timerId = window.setTimeout(() => dismiss(entry.id), entry.remaining);

    if (entry.progressEl) {
      const remaining = entry.remaining;
      requestAnimationFrame(() => {
        entry.progressEl.style.transition = `transform ${remaining}ms linear`;
        entry.progressEl.style.transform = 'scaleX(0)';
      });
    }
  }

  function pauseTimer(entry) {
    if (!entry.timerId) return;
    clearTimer(entry);
    entry.remaining -= Date.now() - entry.startedAt;

    if (entry.progressEl) {
      const frozen = getComputedStyle(entry.progressEl).transform;
      entry.progressEl.style.transition = 'none';
      entry.progressEl.style.transform = frozen;
    }
  }

  function resumeTimer(entry) {
    if (entry.timerId || entry.persist || entry.remaining <= 0) return;
    startTimer(entry);
  }

  /* --- Optional action row (View Details, Undo, Retry, Pay Now, Open
     Case, ...). Links use `href`, everything else is a plain button;
     both close the toast afterwards unless `keepOpen` is set. --- */
  function renderActions(entry, actionsEl) {
    actionsEl.innerHTML = '';
    if (!entry.actions.length) {
      actionsEl.hidden = true;
      return;
    }

    actionsEl.hidden = false;
    entry.actions.forEach((action) => {
      const el = document.createElement(action.href ? 'a' : 'button');
      el.className = 'btn btn-sm btn-outline';
      el.textContent = action.label;
      if (action.href) {
        el.href = action.href;
      } else {
        el.type = 'button';
      }

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        if (typeof action.onClick === 'function') {
          if (action.href) event.preventDefault();
          action.onClick(entry.id);
        }
        if (!action.keepOpen) dismiss(entry.id);
      });

      actionsEl.appendChild(el);
    });
  }

  function render(entry) {
    if (!refs()) return;

    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.add(`toast-${entry.type}`);
    node.dataset.toastId = entry.id;
    node.setAttribute('role', entry.type === 'error' ? 'alert' : 'status');

    node.querySelector('.toast-icon').innerHTML = ICONS[entry.type];
    node.querySelector('.toast-title').textContent = entry.title;
    node.querySelector('.toast-message').textContent = entry.message;
    node.querySelector('.toast-timestamp').textContent = formatTimestamp(entry.createdAt);
    renderActions(entry, node.querySelector('.toast-actions'));

    entry.el = node;
    entry.progressEl = node.querySelector('.toast-progress');
    if (entry.persist) entry.progressEl.hidden = true;

    // Pause on hover or keyboard focus (e.g. tabbing to the close/action
    // buttons); resume once neither applies.
    node.addEventListener('mouseenter', () => pauseTimer(entry));
    node.addEventListener('mouseleave', () => resumeTimer(entry));
    node.addEventListener('focusin', () => pauseTimer(entry));
    node.addEventListener('focusout', (event) => {
      if (!node.contains(event.relatedTarget)) resumeTimer(entry);
    });
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') dismiss(entry.id);
    });

    container.appendChild(node);
    visible.set(entry.id, entry);
    startTimer(entry);

    document.dispatchEvent(
      new CustomEvent('dlss:notification-shown', { detail: { id: entry.id, type: entry.type } })
    );
  }

  function processQueue() {
    while (queue.length && visible.size < MAX_VISIBLE) {
      render(queue.shift());
    }
  }

  function dismiss(id) {
    const entry = visible.get(id);
    if (!entry) {
      // Not on screen yet — it may still be queued; drop it either way.
      const queuedIndex = queue.findIndex((item) => item.id === id);
      if (queuedIndex > -1) queue.splice(queuedIndex, 1);
      return;
    }
    if (entry.leaving) return;

    entry.leaving = true;
    clearTimer(entry);
    entry.el.classList.add('is-leaving');

    const remove = () => {
      entry.el.remove();
      visible.delete(id);
      processQueue();
      document.dispatchEvent(new CustomEvent('dlss:notification-dismissed', { detail: { id } }));
    };
    entry.el.addEventListener('animationend', remove, { once: true });
    window.setTimeout(remove, 400); // fallback if animations are disabled/skipped
  }

  function clearAll() {
    queue.length = 0;
    Array.from(visible.keys()).forEach(dismiss);
  }

  /**
   * Queue/render a toast.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string|Object} options - a plain message string, or:
   *   { title, message, actions: [{ label, href, onClick, keepOpen }],
   *     duration, persist, onClick }
   * @returns {string} the toast's id (for DLSS.Notify.dismiss(id))
   */
  function show(type, options) {
    if (!ICONS[type]) type = 'info';
    const opts = typeof options === 'string' ? { message: options } : Object.assign({}, options);
    const defaults = DEFAULTS[type];

    const entry = {
      id: `toast-${Date.now()}-${counter++}`,
      type,
      title: opts.title || defaults.title,
      message: opts.message || '',
      actions: opts.actions || [],
      persist: !!opts.persist,
      remaining: opts.persist ? 0 : opts.duration || defaults.duration,
      createdAt: new Date(),
      onClick: typeof opts.onClick === 'function' ? opts.onClick : null,
      leaving: false,
      timerId: null,
    };

    if (visible.size >= MAX_VISIBLE) {
      queue.push(entry);
    } else {
      render(entry);
    }
    return entry.id;
  }

  function initNotifications() {
    if (!refs()) return;

    // Delegated so it keeps working no matter how many toasts come and go.
    container.addEventListener('click', (event) => {
      const toastEl = event.target.closest('.toast');
      if (!toastEl) return;

      if (event.target.closest('.toast-close')) {
        dismiss(toastEl.dataset.toastId);
        return;
      }
      if (event.target.closest('.toast-actions')) return; // handled by its own listener

      const entry = visible.get(toastEl.dataset.toastId);
      if (entry && entry.onClick) entry.onClick(entry.id);
    });
  }

  document.addEventListener('dlss:component-loaded', (event) => {
    if (event.detail.name === 'notification') initNotifications();
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('toastContainer') && !document.querySelector('[data-include="notification"]')) {
      initNotifications();
    }
  });

  window.DLSS.Notify = {
    show,
    success: (message, options) => show('success', typeof message === 'string' ? Object.assign({ message }, options) : message),
    error: (message, options) => show('error', typeof message === 'string' ? Object.assign({ message }, options) : message),
    warning: (message, options) => show('warning', typeof message === 'string' ? Object.assign({ message }, options) : message),
    info: (message, options) => show('info', typeof message === 'string' ? Object.assign({ message }, options) : message),
    dismiss,
    clearAll,
  };

  window.DLSS.initNotifications = initNotifications;
})();
