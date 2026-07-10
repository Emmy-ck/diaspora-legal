/**
 * DLSS — Services catalog helpers.
 * Depends on window.DLSS.SERVICES_CATALOG (from servicesCatalog.js).
 */
window.DLSS = window.DLSS || {};

(function () {
  'use strict';

  function getCatalog() {
    return window.DLSS.SERVICES_CATALOG || { categories: [], services: [], redirects: {}, detailPath: '' };
  }

  function getDetailPath() {
    return getCatalog().detailPath || '/pages/website/services/service-detail.html';
  }

  function detailUrl(slug) {
    return `${getDetailPath()}?slug=${encodeURIComponent(slug)}`;
  }

  function resolveSlug(rawSlug) {
    if (!rawSlug) return null;
    const slug = String(rawSlug).trim().toLowerCase();
    const catalog = getCatalog();
    if (catalog.redirects && catalog.redirects[slug]) {
      return catalog.redirects[slug];
    }
    return slug;
  }

  function getServiceBySlug(rawSlug) {
    const slug = resolveSlug(rawSlug);
    if (!slug) return null;
    return (getCatalog().services || []).find((service) => service.slug === slug) || null;
  }

  function getCategoryById(categoryId) {
    return (getCatalog().categories || []).find((category) => category.id === categoryId) || null;
  }

  function getServicesByCategory(categoryId) {
    return (getCatalog().services || []).filter((service) => service.category === categoryId);
  }

  function getAllServices() {
    return getCatalog().services || [];
  }

  function getAllCategories() {
    return getCatalog().categories || [];
  }

  function getRelatedServices(service, limit = 3) {
    if (!service) return [];
    return getServicesByCategory(service.category)
      .filter((item) => item.slug !== service.slug)
      .slice(0, limit);
  }

  window.DLSS.ServicesData = {
    getCatalog,
    getDetailPath,
    detailUrl,
    resolveSlug,
    getServiceBySlug,
    getCategoryById,
    getServicesByCategory,
    getAllServices,
    getAllCategories,
    getRelatedServices,
  };
})();
