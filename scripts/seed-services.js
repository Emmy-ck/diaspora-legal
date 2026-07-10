/**
 * Seed service_categories + services from public/data/services.json.
 *
 * Usage: node scripts/seed-services.js
 *        npm run seed:services
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { connectDB, sequelize } = require('../config/database');
const { Service, ServiceCategory } = require('../models');
const logger = require('../utils/logger');

const JSON_PATH = path.join(__dirname, '..', 'public/data/services.json');

/** Map marketing slugs → Consultation.legalArea ENUM values */
const LEGAL_AREA_BY_SLUG = {
  'family-law': 'family_law',
  'property-law': 'real_estate',
  'business-law': 'business_law',
  'immigration-issues': 'immigration',
  'land-disputes': 'real_estate',
  succession: 'civil_law',
  litigation: 'civil_law',
  contracts: 'civil_law',
  agreements: 'civil_law',
  leases: 'real_estate',
  'conveyancing-documentation': 'real_estate',
  affidavits: 'civil_law',
  'drafting-contracts': 'business_law',
  notices: 'civil_law',
  'drafting-agreements': 'civil_law',
  'statutory-declarations': 'civil_law',
  pleading: 'civil_law',
  'property-searches': 'real_estate',
  'company-search': 'business_law',
  'court-search': 'civil_law',
  'business-verification': 'business_law',
  'property-verification': 'real_estate',
  'business-registration': 'business_law',
  'ngo-registration': 'business_law',
  'trademark-registration': 'business_law',
  'document-registration': 'civil_law',
  'annual-returns': 'business_law',
};

async function seed() {
  await connectDB();

  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const categories = catalog.categories || [];
  const services = catalog.services || [];

  await sequelize.transaction(async (transaction) => {
    for (let index = 0; index < categories.length; index += 1) {
      const category = categories[index];
      await ServiceCategory.upsert(
        {
          id: category.id,
          title: category.title,
          lead: category.lead || null,
          sortOrder: index,
          isActive: true,
        },
        { transaction }
      );
    }

    for (let index = 0; index < services.length; index += 1) {
      const service = services[index];
      const existing = await Service.findOne({ where: { slug: service.slug }, transaction });

      const payload = {
        slug: service.slug,
        categoryId: service.category,
        navLabel: service.navLabel,
        title: service.title,
        breadcrumb: service.breadcrumb || service.navLabel,
        metaDescription: service.metaDescription || null,
        heroLead: service.heroLead || null,
        overviewTitle: service.overviewTitle || null,
        overview: service.overview || [],
        process: service.process || [],
        requirements: service.requirements || [],
        pricing: service.pricing || [],
        faqs: service.faqs || [],
        ctaLead: service.ctaLead || null,
        cardText: service.cardText || null,
        legalArea: LEGAL_AREA_BY_SLUG[service.slug] || 'other',
        sortOrder: index,
        isActive: true,
      };

      if (existing) {
        await existing.update(payload, { transaction });
      } else {
        await Service.create(payload, { transaction });
      }
    }
  });

  const categoryCount = await ServiceCategory.count();
  const serviceCount = await Service.count();
  logger.success(`Seeded ${categoryCount} service categories and ${serviceCount} services.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Service seed failed', error.message);
    console.error(error);
    process.exit(1);
  });
