/**
 * DLSS — Dynamic service detail page renderer.
 * Reads ?slug= from the URL and fills service-detail.html from SERVICES_CATALOG.
 */
window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  const CHEVRON =
    '<svg class="faq-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7.5l5 5 5-5"/></svg>';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getQuerySlug() {
    return new URLSearchParams(window.location.search).get('slug');
  }

  function setMeta(service) {
    const titleEl = document.getElementById('svcDocumentTitle');
    const metaEl = document.getElementById('svcMetaDescription');
    const canonicalEl = document.getElementById('svcCanonical');
    const data = window.DLSS.ServicesData;

    if (titleEl) titleEl.textContent = `${service.title} — DLSS`;
    if (metaEl) metaEl.setAttribute('content', service.metaDescription || service.heroLead || '');
    if (canonicalEl && data) {
      canonicalEl.setAttribute('href', data.detailUrl(service.slug));
    }
    document.title = `${service.title} — DLSS`;
  }

  function renderNotFound(requestedSlug) {
    const main = document.getElementById('svcMain');
    if (!main) return;

    document.title = 'Service not found — DLSS';
    const titleEl = document.getElementById('svcDocumentTitle');
    if (titleEl) titleEl.textContent = 'Service not found — DLSS';

    main.innerHTML = `
      <section class="hero hero-page svc-state" aria-labelledby="svcMissingTitle">
        <div class="hero-media" aria-hidden="true">
          <img src="/images/marketing/hero-bg.jpg" alt="" width="1920" height="1280" decoding="async" />
        </div>
        <div class="container hero-inner">
          <div class="hero-brand" aria-label="Diaspora Legal Support Services">
            <span class="hero-brand-mark">DLSS</span>
            <span class="hero-brand-name">Diaspora Legal</span>
          </div>
          <h1 class="hero-title" id="svcMissingTitle">Service not found</h1>
          <div class="hero-body">
            <p class="hero-lead">
              ${
                requestedSlug
                  ? `We could not find a service for “${escapeHtml(requestedSlug)}”.`
                  : 'Choose a service from the menu or browse the full catalog.'
              }
            </p>
            <div class="hero-actions">
              <a href="/pages/website/services.html" class="btn btn-secondary btn-lg">Browse all services</a>
              <button type="button" class="btn btn-outline-light btn-lg" data-modal-open="bookConsultationModal">Book Consultation</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderOverview(service) {
    const paragraphs = (service.overview || [])
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');

    return `
      <section class="section" id="overview" aria-labelledby="svcOverviewTitle">
        <div class="container svc-detail-narrow">
          <header class="section-header">
            <p class="section-eyebrow">Overview</p>
            <h2 class="section-title" id="svcOverviewTitle">${escapeHtml(service.overviewTitle || 'Service overview')}</h2>
          </header>
          <div class="svc-prose">${paragraphs}</div>
        </div>
      </section>
    `;
  }

  function renderProcess(service) {
    const steps = service.process || [];
    if (!steps.length) return '';

    const items = steps
      .map(
        (step) => `
        <li class="step">
          <h3 class="step-title">${escapeHtml(step.title)}</h3>
          <p class="step-text">${escapeHtml(step.text)}</p>
        </li>`
      )
      .join('');

    return `
      <section class="section section-muted" id="process" aria-labelledby="svcProcessTitle">
        <div class="container">
          <header class="section-header">
            <p class="section-eyebrow">How it works</p>
            <h2 class="section-title" id="svcProcessTitle">Our process</h2>
          </header>
          <ol class="steps">${items}</ol>
        </div>
      </section>
    `;
  }

  function renderRequirements(service) {
    const requirements = service.requirements || [];
    if (!requirements.length) return '';

    const items = requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

    return `
      <section class="section" id="requirements" aria-labelledby="svcReqTitle">
        <div class="container svc-detail-narrow">
          <header class="section-header">
            <p class="section-eyebrow">What we need</p>
            <h2 class="section-title" id="svcReqTitle">Requirements</h2>
          </header>
          <ul class="svc-req-list">${items}</ul>
        </div>
      </section>
    `;
  }

  function renderPricing(service) {
    const pricing = service.pricing || [];
    if (!pricing.length) return '';

    const cards = pricing
      .map(
        (tier) => `
        <article class="svc-price-card">
          <h3 class="svc-price-name">${escapeHtml(tier.name)}</h3>
          <p class="svc-price-amount">${escapeHtml(tier.amount)}</p>
          <p class="svc-price-text">${escapeHtml(tier.text)}</p>
        </article>`
      )
      .join('');

    return `
      <section class="section section-muted" id="pricing" aria-labelledby="svcPricingTitle">
        <div class="container">
          <header class="section-header">
            <p class="section-eyebrow">Fees</p>
            <h2 class="section-title" id="svcPricingTitle">Indicative pricing</h2>
            <p class="section-lead">Final fees depend on complexity. Your advocate confirms the quote before work begins.</p>
          </header>
          <div class="svc-price-grid">${cards}</div>
        </div>
      </section>
    `;
  }

  function renderFaqs(service) {
    const faqs = service.faqs || [];
    if (!faqs.length) return '';

    const items = faqs
      .map((faq, index) => {
        const id = `svc-faq-${index + 1}`;
        const isOpen = index === 0;
        return `
          <div class="faq-item${isOpen ? ' is-open' : ''}">
            <button type="button" class="faq-question" id="${id}-btn" aria-expanded="${isOpen}" aria-controls="${id}-panel">
              ${escapeHtml(faq.q)}
              ${CHEVRON}
            </button>
            <div class="faq-answer" id="${id}-panel" role="region" aria-labelledby="${id}-btn">
              <div class="faq-answer-inner">
                <p>${escapeHtml(faq.a)}</p>
              </div>
            </div>
          </div>`;
      })
      .join('');

    return `
      <section class="section" id="faqs" aria-labelledby="svcFaqTitle">
        <div class="container svc-detail-narrow">
          <header class="section-header">
            <p class="section-eyebrow">FAQs</p>
            <h2 class="section-title" id="svcFaqTitle">Common questions</h2>
          </header>
          <div class="faq-list" data-faq>${items}</div>
        </div>
      </section>
    `;
  }

  function renderRelated(service) {
    const data = window.DLSS.ServicesData;
    if (!data) return '';

    const related = data.getRelatedServices(service, 3);
    if (!related.length) return '';

    const cards = related
      .map(
        (item) => `
        <article class="service-card">
          <h3 class="service-card-title">${escapeHtml(item.navLabel || item.breadcrumb)}</h3>
          <p class="service-card-text">${escapeHtml(item.cardText || item.heroLead || '')}</p>
          <a href="${escapeHtml(data.detailUrl(item.slug))}" class="service-card-link">
            Learn more
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>
          </a>
        </article>`
      )
      .join('');

    return `
      <section class="section section-muted" id="related" aria-labelledby="svcRelatedTitle">
        <div class="container">
          <header class="section-header">
            <p class="section-eyebrow">Related</p>
            <h2 class="section-title" id="svcRelatedTitle">More in this category</h2>
          </header>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
        </div>
      </section>
    `;
  }

  function renderService(service, category) {
    const main = document.getElementById('svcMain');
    if (!main) return;

    setMeta(service);

    const categoryTitle = category ? category.title : 'Services';
    const categoryHref = category ? `/pages/website/services.html#${escapeHtml(category.id)}` : '/pages/website/services.html';

    main.innerHTML = `
      <section class="hero hero-page" aria-labelledby="svcHeroTitle">
        <div class="hero-media" aria-hidden="true">
          <img
            src="/images/marketing/hero-bg.jpg"
            alt=""
            width="1920"
            height="1280"
            fetchpriority="high"
            decoding="async"
          />
        </div>
        <div class="container hero-inner">
          <nav class="svc-breadcrumb" aria-label="Breadcrumb">
            <a href="/pages/website/services.html">Services</a>
            <span aria-hidden="true">/</span>
            <a href="${categoryHref}">${escapeHtml(categoryTitle)}</a>
            <span aria-hidden="true">/</span>
            <span>${escapeHtml(service.breadcrumb || service.navLabel)}</span>
          </nav>

          <div class="hero-brand" aria-label="Diaspora Legal Support Services">
            <span class="hero-brand-mark">DLSS</span>
            <span class="hero-brand-name">Diaspora Legal</span>
          </div>

          <h1 class="hero-title" id="svcHeroTitle">${escapeHtml(service.title)}</h1>

          <div class="hero-body">
            <p class="hero-lead">${escapeHtml(service.heroLead)}</p>
            <div class="hero-actions">
              <button type="button" class="btn btn-secondary btn-lg" data-modal-open="bookConsultationModal">
                Book Consultation
              </button>
              <a href="/pages/website/contact.html" class="btn btn-outline-light btn-lg">Contact Us</a>
            </div>
          </div>
        </div>
      </section>

      ${renderOverview(service)}
      ${renderProcess(service)}
      ${renderRequirements(service)}
      ${renderPricing(service)}
      ${renderFaqs(service)}
      ${renderRelated(service)}

      <section class="cta-band" id="book-consultation" aria-labelledby="svcCtaTitle">
        <div class="container cta-band-inner">
          <p class="section-eyebrow">Get Started</p>
          <h2 class="section-title" id="svcCtaTitle">Ready to proceed?</h2>
          <p class="section-lead">${escapeHtml(service.ctaLead || 'Book a consultation with a verified advocate.')}</p>
          <div class="cta-band-actions">
            <button type="button" class="btn btn-secondary btn-lg" data-modal-open="bookConsultationModal">Book Consultation</button>
            <a href="/pages/website/services.html" class="btn btn-outline-light btn-lg">All Services</a>
          </div>
        </div>
      </section>
    `;

    if (typeof window.DLSS.initFaqs === 'function') {
      window.DLSS.initFaqs();
    }
  }

  function init() {
    if (document.body.getAttribute('data-page') !== 'service-detail') return;

    const data = window.DLSS.ServicesData;
    if (!data) {
      renderNotFound(getQuerySlug());
      return;
    }

    const rawSlug = getQuerySlug();
    const resolved = data.resolveSlug(rawSlug);

    // Canonicalize legacy / redirected slugs in the address bar
    if (rawSlug && resolved && rawSlug.toLowerCase() !== resolved) {
      const url = new URL(window.location.href);
      url.searchParams.set('slug', resolved);
      window.history.replaceState({}, '', url.toString());
    }

    const service = data.getServiceBySlug(resolved);
    if (!service) {
      renderNotFound(rawSlug || resolved);
      return;
    }

    const category = data.getCategoryById(service.category);
    renderService(service, category);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.DLSS.ServiceDetail = { init };
})();
