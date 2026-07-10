const { Service, ServiceCategory } = require('../models');
const { AppError, asyncHandler } = require('../utils/helpers');

const CATEGORY_INCLUDE = {
  model: ServiceCategory,
  as: 'category',
  attributes: ['id', 'title', 'lead', 'sortOrder'],
};

function serializeService(service) {
  const plain = service.toJSON ? service.toJSON() : service;
  return {
    slug: plain.slug,
    category: plain.categoryId || plain.category?.id,
    categoryMeta: plain.category
      ? { id: plain.category.id, title: plain.category.title, lead: plain.category.lead }
      : undefined,
    navLabel: plain.navLabel,
    title: plain.title,
    breadcrumb: plain.breadcrumb,
    metaDescription: plain.metaDescription,
    heroLead: plain.heroLead,
    overviewTitle: plain.overviewTitle,
    overview: plain.overview || [],
    process: plain.process || [],
    requirements: plain.requirements || [],
    pricing: plain.pricing || [],
    faqs: plain.faqs || [],
    ctaLead: plain.ctaLead,
    cardText: plain.cardText,
    image: plain.image,
    imageAlt: plain.imageAlt,
    imageCaption: plain.imageCaption,
    highlights: plain.highlights || [],
    whoItsFor: plain.whoItsFor || [],
    outcomes: plain.outcomes || [],
    legalArea: plain.legalArea,
    sortOrder: plain.sortOrder,
  };
}

// GET /api/services/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await ServiceCategory.findAll({
    where: { isActive: true },
    include: [
      {
        model: Service,
        as: 'services',
        where: { isActive: true },
        required: false,
        attributes: ['slug', 'navLabel', 'title', 'cardText', 'legalArea', 'sortOrder'],
      },
    ],
    order: [['sortOrder', 'ASC']],
  });

  res.status(200).json({
    success: true,
    data: {
      categories: categories.map((category) => {
        const plain = category.toJSON();
        return {
          id: plain.id,
          title: plain.title,
          lead: plain.lead,
          sortOrder: plain.sortOrder,
          services: (plain.services || [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((service) => ({
              slug: service.slug,
              navLabel: service.navLabel,
              title: service.title,
              cardText: service.cardText,
              legalArea: service.legalArea,
            })),
        };
      }),
    },
  });
});

// GET /api/services
const list = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = { isActive: true };
  if (category) where.categoryId = category;

  const services = await Service.findAll({
    where,
    include: [CATEGORY_INCLUDE],
    order: [
      ['sortOrder', 'ASC'],
      ['navLabel', 'ASC'],
    ],
  });

  res.status(200).json({
    success: true,
    data: {
      count: services.length,
      services: services.map(serializeService),
    },
  });
});

// GET /api/services/:slug
const getBySlug = asyncHandler(async (req, res) => {
  const service = await Service.findOne({
    where: { slug: req.params.slug, isActive: true },
    include: [CATEGORY_INCLUDE],
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { service: serializeService(service) },
  });
});

module.exports = { list, listCategories, getBySlug };
