const crypto = require('crypto');
const { Payment, Consultation, Client, Lawyer } = require('../models');
const { AppError } = require('../utils/helpers');
const notificationService = require('./notificationService');

const PLATFORM_FEE_RATE = 0.1; // 10% platform commission

// Simulates charging a payment provider. Swap this out for a real gateway
// integration (Stripe, Flutterwave, Paystack, etc) - the rest of the flow
// (fee split, ledger, notifications) stays the same regardless of provider.
const chargeProvider = async () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, reference: `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}` });
    }, 10);
  });

const processPayment = async (userId, { consultationId, amount, currency, method }) => {
  const client = await Client.findOne({ where: { userId } });
  if (!client) {
    throw new AppError('Only clients can make payments', 403);
  }

  let lawyerId = null;
  if (consultationId) {
    const consultation = await Consultation.findByPk(consultationId);
    if (!consultation) {
      throw new AppError('Consultation not found', 404);
    }
    if (consultation.clientId !== client.id) {
      throw new AppError('This is not your consultation', 403);
    }
    lawyerId = consultation.lawyerId;
  }

  const platformFee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const lawyerPayout = Math.round((amount - platformFee) * 100) / 100;

  const payment = await Payment.create({
    consultationId: consultationId || null,
    clientId: client.id,
    lawyerId,
    amount,
    currency: currency || 'USD',
    method,
    status: 'pending',
    platformFee,
    lawyerPayout,
  });

  const result = await chargeProvider({ amount, method });

  if (!result.success) {
    payment.status = 'failed';
    await payment.save();
    throw new AppError('Payment could not be processed', 402);
  }

  payment.status = 'completed';
  payment.transactionReference = result.reference;
  payment.paidAt = new Date();
  await payment.save();

  await notificationService.createNotification({
    userId,
    type: 'payment',
    title: 'Payment successful',
    message: `Your payment of ${payment.currency} ${amount} was processed successfully`,
    link: `/payments/${payment.id}`,
  });

  if (lawyerId) {
    const lawyer = await Lawyer.findByPk(lawyerId);
    if (lawyer) {
      await notificationService.createNotification({
        userId: lawyer.userId,
        type: 'payment',
        title: 'Payment received',
        message: `You received a payment of ${payment.currency} ${lawyerPayout} for a consultation`,
        link: `/payments/${payment.id}`,
      });
    }
  }

  return payment;
};

const refundPayment = async (paymentId) => {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  if (payment.status !== 'completed') {
    throw new AppError('Only completed payments can be refunded', 400);
  }

  payment.status = 'refunded';
  await payment.save();

  await notificationService.createNotification({
    userId: (await Client.findByPk(payment.clientId)).userId,
    type: 'payment',
    title: 'Payment refunded',
    message: `Your payment of ${payment.currency} ${payment.amount} has been refunded`,
    link: `/payments/${payment.id}`,
  });

  return payment;
};

const listForUser = async (userId, role, { page = 1, limit = 20 } = {}) => {
  const where = {};

  if (role === 'lawyer') {
    const lawyer = await Lawyer.findOne({ where: { userId } });
    where.lawyerId = lawyer ? lawyer.id : null;
  } else {
    const client = await Client.findOne({ where: { userId } });
    where.clientId = client ? client.id : null;
  }

  const { rows, count } = await Payment.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { payments: rows, total: count, page, pages: Math.ceil(count / limit) || 1 };
};

const getById = async (paymentId) => {
  const payment = await Payment.findByPk(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  return payment;
};

module.exports = { processPayment, refundPayment, listForUser, getById };
