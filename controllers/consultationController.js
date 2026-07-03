const consultationService = require('../services/consultationService');
const { AppError, asyncHandler } = require('../utils/helpers');

// POST /api/consultations - book a new consultation (clients only)
const book = asyncHandler(async (req, res) => {
  const consultation = await consultationService.bookConsultation(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Consultation request submitted', data: { consultation } });
});

// GET /api/consultations - list the current user's consultations
const listMine = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const result = await consultationService.listForUser(req.user.id, req.user.role, {
    page: Number(page),
    limit: Number(limit),
    status,
  });
  res.status(200).json({ success: true, data: result });
});

// GET /api/consultations/:id
const getOne = asyncHandler(async (req, res) => {
  const consultation = await consultationService.getConsultationOrThrow(req.params.id);

  if (!consultationService.isParticipant(consultation, req.user.id) && req.user.role !== 'admin') {
    throw new AppError('You are not a participant in this consultation', 403);
  }

  res.status(200).json({ success: true, data: { consultation } });
});

// PATCH /api/consultations/:id/accept - lawyer accepts a pending consultation
const accept = asyncHandler(async (req, res) => {
  const consultation = await consultationService.acceptConsultation(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Consultation accepted', data: { consultation } });
});

// PATCH /api/consultations/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const consultation = await consultationService.updateStatus(req.params.id, req.user.id, req.body.status);
  res.status(200).json({ success: true, message: 'Consultation status updated', data: { consultation } });
});

module.exports = { book, listMine, getOne, accept, updateStatus };
