const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ServiceCategory extends Model {}

ServiceCategory.init(
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      comment: 'Stable category key, e.g. legal-advisory',
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    lead: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'ServiceCategory',
    tableName: 'service_categories',
  }
);

module.exports = ServiceCategory;
