const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Service extends Model {}

Service.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    categoryId: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    navLabel: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    breadcrumb: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    heroLead: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    overviewTitle: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    overview: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    process: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    requirements: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    pricing: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    faqs: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    ctaLead: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cardText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    legalArea: {
      type: DataTypes.ENUM(
        'immigration',
        'family_law',
        'business_law',
        'real_estate',
        'criminal_law',
        'civil_law',
        'employment_law',
        'tax_law',
        'other'
      ),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Maps marketing service to Consultation.legalArea for booking/matching',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Service',
    tableName: 'services',
  }
);

module.exports = Service;
