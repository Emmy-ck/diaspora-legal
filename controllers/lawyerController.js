const { Op } = require('sequelize');
const { Lawyer, User } = require('../models');
const { AppError, asyncHandler } = require('../utils/helpers');

const LAWYER_USER_INCLUDE = {
  model: User,
  as: 'user',
  attributes: ['id', 'firstName', 'lastName', 'avatar', 'email'],
};

// GET /api/lawyers - public directory, supports filtering + pagination
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, specialization, country, minRating } = req.query;

  const where = { verificationStatus: 'verified', isAvailable: true };
  if (country) where.country = country;
  if (minRating) where.rating = { [Op.gte]: Number(minRating) };

  let lawyers = await Lawyer.findAll({
    where,
    include: [LAWYER_USER_INCLUDE],
    order: [['rating', 'DESC']],
  });

  if (specialization) {
    lawyers = lawyers.filter(
      (lawyer) => Array.isArray(lawyer.specialization) && lawyer.specialization.includes(specialization)
    );
  }

  const total = lawyers.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = lawyers.slice(start, start + Number(limit));

  res.status(200).json({ success: true, data: { lawyers: paged, total, page: Number(page) } });
});

// GET /api/lawyers/:id
const getOne = asyncHandler(async (req, res) => {
  const lawyer = await Lawyer.findByPk(req.params.id, { include: [LAWYER_USER_INCLUDE] });
  if (!lawyer) {
    throw new AppError('Lawyer not found', 404);
  }
  res.status(200).json({ success: true, data: { lawyer } });
});

// PATCH /api/lawyers/:id/verification (admin) - approve/reject a lawyer application
const updateVerificationStatus = asyncHandler(async (req, res) => {
  const lawyer = await Lawyer.findByPk(req.params.id);
  if (!lawyer) {
    throw new AppError('Lawyer not found', 404);
  }

  lawyer.verificationStatus = req.body.verificationStatus;
  await lawyer.save();

  res.status(200).json({ success: true, message: 'Lawyer verification status updated', data: { lawyer } });
});

module.exports = { list, getOne, updateVerificationStatus };
