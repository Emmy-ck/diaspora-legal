const documentService = require('../services/documentService');
const { AppError, asyncHandler } = require('../utils/helpers');

// POST /api/documents - upload a legal document
const upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('A file is required', 400);
  }

  const document = await documentService.uploadDocument({
    uploadedBy: req.user.id,
    file: req.file,
    consultationId: req.body.consultationId,
    title: req.body.title,
    category: req.body.category,
    isConfidential: req.body.isConfidential,
  });

  res.status(201).json({ success: true, message: 'Document uploaded successfully', data: { document } });
});

// GET /api/documents - list documents uploaded by, or shared with, the current user
const listMine = asyncHandler(async (req, res) => {
  const { consultationId, page = 1, limit = 20 } = req.query;
  const result = await documentService.listForUser(req.user.id, {
    consultationId,
    page: Number(page),
    limit: Number(limit),
  });
  res.status(200).json({ success: true, data: result });
});

// GET /api/documents/:id
const getOne = asyncHandler(async (req, res) => {
  const document = await documentService.getDocumentOrThrow(req.params.id);

  const allowed = await documentService.canAccessDocument(document, req.user.id);
  if (!allowed && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to view this document', 403);
  }

  res.status(200).json({ success: true, data: { document } });
});

// DELETE /api/documents/:id
const remove = asyncHandler(async (req, res) => {
  await documentService.deleteDocument(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Document deleted successfully' });
});

module.exports = { upload, listMine, getOne, remove };
