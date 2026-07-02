const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Consultation extends Model {}

Consultation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    lawyerId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Assigned once a lawyer accepts the consultation request',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    },
    urgency: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Consultation',
    tableName: 'consultations',
  }
);

module.exports = Consultation;
