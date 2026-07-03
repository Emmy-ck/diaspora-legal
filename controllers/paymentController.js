const { Client, Lawyer } = require('../models');
const paymentService = require('../services/paymentService');
const { AppError, asyncHandler } = require('../utils/helpers');

// POST /api/payments - process a payment (clients only)
const create = asyncHandler(async (req, res) => {
  const payment = await paymentService.processPayment(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Payment processed successfully', data: { payment } });
});

// GET /api/payments - list the current user's payments
const listMine = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await paymentService.listForUser(req.user.id, req.user.role, {
    page: Number(page),
    limit: Number(limit),
  });
  res.status(200).json({ success: true, data: result });
});

// GET /api/payments/:id
const getOne = asyncHandler(async (req, res) => {
  const payment = await paymentService.getById(req.params.id);

  const [client, lawyer] = await Promise.all([
    Client.findOne({ where: { userId: req.user.id } }),
    Lawyer.findOne({ where: { userId: req.user.id } }),
  ]);

  const isOwner = (client && payment.clientId === client.id) || (lawyer && payment.lawyerId === lawyer.id);
  if (!isOwner && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to view this payment', 403);
  }

  res.status(200).json({ success: true, data: { payment } });
});

// PATCH /api/payments/:id/refund (admin only)
const refund = asyncHandler(async (req, res) => {
  const payment = await paymentService.refundPayment(req.params.id);
  res.status(200).json({ success: true, message: 'Payment refunded', data: { payment } });
});

module.exports = { create, listMine, getOne, refund };
