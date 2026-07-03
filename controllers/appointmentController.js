const { Appointment, Client, Lawyer } = require('../models');
const consultationService = require('../services/consultationService');
const notificationService = require('../services/notificationService');
const { AppError, asyncHandler } = require('../utils/helpers');

// POST /api/appointments - schedule an appointment for an existing consultation
const schedule = asyncHandler(async (req, res) => {
  const { consultationId, scheduledAt, durationMinutes, mode, meetingLink, location } = req.body;
  const appointment = await consultationService.scheduleAppointment(consultationId, req.user.id, {
    scheduledAt,
    durationMinutes,
    mode,
    meetingLink,
    location,
  });
  res.status(201).json({ success: true, message: 'Appointment scheduled', data: { appointment } });
});

// GET /api/appointments - list the current user's appointments
const listMine = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const where = {};

  if (req.user.role === 'lawyer') {
    const lawyer = await Lawyer.findOne({ where: { userId: req.user.id } });
    where.lawyerId = lawyer ? lawyer.id : null;
  } else {
    const client = await Client.findOne({ where: { userId: req.user.id } });
    where.clientId = client ? client.id : null;
  }

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    order: [['scheduledAt', 'ASC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  res.status(200).json({ success: true, data: { appointments: rows, total: count, page: Number(page) } });
});

// GET /api/appointments/:id
const getOne = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const consultation = await consultationService.getConsultationOrThrow(appointment.consultationId);
  if (!consultationService.isParticipant(consultation, req.user.id) && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to view this appointment', 403);
  }

  res.status(200).json({ success: true, data: { appointment } });
});

// PATCH /api/appointments/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findByPk(req.params.id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const consultation = await consultationService.getConsultationOrThrow(appointment.consultationId);
  if (!consultationService.isParticipant(consultation, req.user.id) && req.user.role !== 'admin') {
    throw new AppError('You are not authorized to update this appointment', 403);
  }

  appointment.status = req.body.status;
  await appointment.save();

  const recipientUserId =
    req.user.id === consultation.client.user.id ? consultation.lawyer?.user?.id : consultation.client.user.id;

  if (recipientUserId) {
    await notificationService.createNotification({
      userId: recipientUserId,
      type: 'appointment',
      title: 'Appointment updated',
      message: `Appointment status changed to ${req.body.status}`,
      link: `/appointments/${appointment.id}`,
    });
  }

  res.status(200).json({ success: true, message: 'Appointment status updated', data: { appointment } });
});

module.exports = { schedule, listMine, getOne, updateStatus };
