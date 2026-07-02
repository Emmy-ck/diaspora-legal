const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Document extends Model {}

Document.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    consultationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Size in bytes',
    },
    category: {
      type: DataTypes.ENUM(
        'contract',
        'evidence',
        'identification',
        'court_filing',
        'correspondence',
        'other'
      ),
      allowNull: false,
      defaultValue: 'other',
    },
    status: {
      type: DataTypes.ENUM('pending_review', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending_review',
    },
    isConfidential: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
  }
);

module.exports = Document;
