#!/usr/bin/env node
/**
 * Sync marketing services from public/data/services.json into:
 *  1. public/js/servicesCatalog.js  (runtime catalog)
 *  2. public/pages/website/services/<slug>.html  (redirect stubs)
 *
 * Usage: node scripts/sync-services.js
 *        npm run sync:services
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'public/data/services.json');
const CATALOG_JS_PATH = path.join(ROOT, 'public/js/servicesCatalog.js');
const SERVICES_DIR = path.join(ROOT, 'public/pages/website/services');

function readCatalog() {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeCatalogJs(catalog) {
  const body = JSON.stringify(catalog, null, 2);
  const contents = `/**
 * DLSS — Services catalog (generated).
 * Source: public/data/services.json
 * Regenerate: node scripts/sync-services.js
 */
window.DLSS = window.DLSS || {};
window.DLSS.SERVICES_CATALOG = ${body};
`;
  fs.writeFileSync(CATALOG_JS_PATH, contents, 'utf8');
}

function redirectHtml(targetUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0;url=${targetUrl}" />
  <link rel="canonical" href="${targetUrl}" />
  <title>Redirecting… — DLSS</title>
  <script>location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>
  <p>Redirecting to <a href="${targetUrl}">the service page</a>…</p>
</body>
</html>
`;
}

function writeRedirectStubs(catalog) {
  fs.mkdirSync(SERVICES_DIR, { recursive: true });

  const detailPath = catalog.detailPath || '/pages/website/services/service-detail.html';
  const redirects = catalog.redirects || {};
  const written = new Set();

  for (const service of catalog.services || []) {
    const target = `${detailPath}?slug=${encodeURIComponent(service.slug)}`;
    const filePath = path.join(SERVICES_DIR, `${service.slug}.html`);
    fs.writeFileSync(filePath, redirectHtml(target), 'utf8');
    written.add(`${service.slug}.html`);
  }

  for (const [fromSlug, toSlug] of Object.entries(redirects)) {
    const target = `${detailPath}?slug=${encodeURIComponent(toSlug)}`;
    const filePath = path.join(SERVICES_DIR, `${fromSlug}.html`);
    fs.writeFileSync(filePath, redirectHtml(target), 'utf8');
    written.add(`${fromSlug}.html`);
  }

  // Keep service-detail.html; remove stale redirect stubs that are no longer in the catalog
  const keep = new Set([...written, 'service-detail.html']);
  for (const name of fs.readdirSync(SERVICES_DIR)) {
    if (!name.endsWith('.html')) continue;
    if (keep.has(name)) continue;
    fs.unlinkSync(path.join(SERVICES_DIR, name));
    console.log(`Removed stale stub: ${name}`);
  }

  return written.size;
}

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Missing catalog source: ${JSON_PATH}`);
    process.exit(1);
  }

  const catalog = readCatalog();
  const serviceCount = (catalog.services || []).length;
  const categoryCount = (catalog.categories || []).length;
  const redirectCount = Object.keys(catalog.redirects || {}).length;

  writeCatalogJs(catalog);
  const stubCount = writeRedirectStubs(catalog);

  console.log(`Synced ${serviceCount} services across ${categoryCount} categories.`);
  console.log(`Wrote ${CATALOG_JS_PATH}`);
  console.log(`Wrote ${stubCount} redirect stubs (${redirectCount} legacy redirects).`);
}

main();
