const fs = require('fs');
const { Document } = require('../models');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');
const consultationService = require('./consultationService');

const uploadDocument = async ({ uploadedBy, file, consultationId, title, category, isConfidential }) => {
  if (!file) {
    throw new AppError('A file is required', 400);
  }

  if (consultationId) {
    const consultation = await consultationService.getConsultationOrThrow(consultationId);
    if (!consultationService.isParticipant(consultation, uploadedBy)) {
      throw new AppError('You are not a participant in this consultation', 403);
    }
  }

  const document = await Document.create({
    consultationId: consultationId || null,
    uploadedBy,
    title: title || file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileType: file.mimetype,
    fileSize: file.size,
    category: category || 'other',
    isConfidential: isConfidential !== 'false' && isConfidential !== false,
  });

  return document;
};

const getDocumentOrThrow = async (id) => {
  const document = await Document.findByPk(id);
  if (!document) {
    throw new AppError('Document not found', 404);
  }
  return document;
};

// The uploader always has access; otherwise the document must belong to a
// consultation the requesting user participates in.
const canAccessDocument = async (document, userId) => {
  if (document.uploadedBy === userId) {
    return true;
  }
  if (!document.consultationId) {
    return false;
  }

  const consultation = await consultationService.getConsultationOrThrow(document.consultationId);
  return consultationService.isParticipant(consultation, userId);
};

const listForUser = async (userId, { consultationId, page = 1, limit = 20 } = {}) => {
  const where = {};

  if (consultationId) {
    const consultation = await consultationService.getConsultationOrThrow(consultationId);
    if (!consultationService.isParticipant(consultation, userId)) {
      throw new AppError('You are not a participant in this consultation', 403);
    }
    where.consultationId = consultationId;
  } else {
    where.uploadedBy = userId;
  }

  const { rows, count } = await Document.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { documents: rows, total: count, page, pages: Math.ceil(count / limit) || 1 };
};

const deleteDocument = async (documentId, userId) => {
  const document = await getDocumentOrThrow(documentId);

  if (document.uploadedBy !== userId) {
    throw new AppError('Only the uploader can delete this document', 403);
  }

  await document.destroy();

  fs.unlink(document.filePath, (error) => {
    if (error) {
      logger.warn(`Failed to remove file from disk: ${document.filePath} (${error.message})`);
    }
  });

  return document;
};

module.exports = { uploadDocument, getDocumentOrThrow, canAccessDocument, listForUser, deleteDocument };
