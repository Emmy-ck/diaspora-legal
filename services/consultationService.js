const { Consultation, Client, Lawyer, Appointment, User } = require('../models');
const { AppError } = require('../utils/helpers');
const notificationService = require('./notificationService');

const CONSULTATION_INCLUDES = [
  {
    model: Client,
    as: 'client',
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] }],
  },
  {
    model: Lawyer,
    as: 'lawyer',
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'] }],
  },
];

const getConsultationOrThrow = async (id) => {
  const consultation = await Consultation.findByPk(id, { include: CONSULTATION_INCLUDES });
  if (!consultation) {
    throw new AppError('Consultation not found', 404);
  }
  return consultation;
};

// True if the given userId is either the client or the assigned lawyer on
// this consultation. Requires the consultation to have been loaded with
// CONSULTATION_INCLUDES (client.user / lawyer.user).
const isParticipant = (consultation, userId) => {
  const clientUserId = consultation.client?.user?.id || consultation.client?.userId;
  const lawyerUserId = consultation.lawyer?.user?.id || consultation.lawyer?.userId;
  return clientUserId === userId || lawyerUserId === userId;
};

// Finds verified, available lawyers - preferring ones whose specialization
// matches the consultation's legal area - and notifies them that an
// unassigned consultation is available to accept. This is the "lawyer
// matching" step that runs when a client books without picking a lawyer.
const matchLawyers = async (consultation) => {
  const candidates = await Lawyer.findAll({
    where: { isAvailable: true, verificationStatus: 'verified' },
    limit: 50,
  });

  const specialized = candidates.filter(
    (lawyer) => Array.isArray(lawyer.specialization) && lawyer.specialization.includes(consultation.legalArea)
  );

  const pool = (specialized.length ? specialized : candidates).slice(0, 10);

  await Promise.all(
    pool.map((lawyer) =>
      notificationService.createNotification({
        userId: lawyer.userId,
        type: 'consultation',
        title: 'New consultation opportunity',
        message: `A new ${consultation.legalArea.replace('_', ' ')} consultation is available: "${consultation.title}"`,
        link: `/consultations/${consultation.id}`,
      })
    )
  );

  return pool;
};

// Books a new consultation on behalf of the logged-in client. If a specific
// lawyer is requested, they're notified directly; otherwise matching lawyers
// are notified so any of them can accept it.
const bookConsultation = async (userId, { title, description, legalArea, urgency, lawyerId }) => {
  const client = await Client.findOne({ where: { userId } });
  if (!client) {
    throw new AppError('Complete your client profile before booking a consultation', 400);
  }

  let lawyer = null;
  if (lawyerId) {
    lawyer = await Lawyer.findByPk(lawyerId);
    if (!lawyer || !lawyer.isAvailable || lawyer.verificationStatus !== 'verified') {
      throw new AppError('Selected lawyer is not available', 400);
    }
  }

  const consultation = await Consultation.create({
    clientId: client.id,
    lawyerId: lawyer ? lawyer.id : null,
    title,
    description,
    legalArea,
    urgency: urgency || 'medium',
    status: 'pending',
  });

  if (lawyer) {
    await notificationService.createNotification({
      userId: lawyer.userId,
      type: 'consultation',
      title: 'New consultation request',
      message: `You have a new ${legalArea.replace('_', ' ')} consultation request: "${title}"`,
      link: `/consultations/${consultation.id}`,
    });
  } else {
    await matchLawyers(consultation);
  }

  return getConsultationOrThrow(consultation.id);
};

// A lawyer accepts an unassigned, pending consultation.
const acceptConsultation = async (consultationId, lawyerUserId) => {
  const lawyer = await Lawyer.findOne({ where: { userId: lawyerUserId } });
  if (!lawyer) {
    throw new AppError('Only lawyers can accept consultations', 403);
  }

  const consultation = await Consultation.findByPk(consultationId);
  if (!consultation) {
    throw new AppError('Consultation not found', 404);
  }
  if (consultation.status !== 'pending') {
    throw new AppError('Consultation is no longer pending', 400);
  }

  consultation.lawyerId = lawyer.id;
  consultation.status = 'accepted';
  consultation.startedAt = new Date();
  await consultation.save();

  const client = await Client.findByPk(consultation.clientId);
  await notificationService.createNotification({
    userId: client.userId,
    type: 'consultation',
    title: 'Consultation accepted',
    message: `Your consultation "${consultation.title}" was accepted by a lawyer`,
    link: `/consultations/${consultation.id}`,
  });

  return getConsultationOrThrow(consultation.id);
};

const ALLOWED_TRANSITIONS = {
  pending: ['cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

const updateStatus = async (consultationId, userId, status) => {
  const consultation = await getConsultationOrThrow(consultationId);

  if (!isParticipant(consultation, userId)) {
    throw new AppError('You are not a participant in this consultation', 403);
  }

  const allowed = ALLOWED_TRANSITIONS[consultation.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition consultation from ${consultation.status} to ${status}`, 400);
  }

  consultation.status = status;
  if (status === 'completed') {
    consultation.completedAt = new Date();
  }
  await consultation.save();

  return consultation;
};

const listForUser = async (userId, role, { page = 1, limit = 20, status } = {}) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  if (role === 'lawyer') {
    const lawyer = await Lawyer.findOne({ where: { userId } });
    where.lawyerId = lawyer ? lawyer.id : null;
  } else {
    const client = await Client.findOne({ where: { userId } });
    where.clientId = client ? client.id : null;
  }

  const { rows, count } = await Consultation.findAndCountAll({
    where,
    include: CONSULTATION_INCLUDES,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { consultations: rows, total: count, page, pages: Math.ceil(count / limit) || 1 };
};

// Schedules an appointment for a consultation that already has an assigned
// lawyer. Notifies whichever participant didn't initiate the scheduling.
const scheduleAppointment = async (
  consultationId,
  userId,
  { scheduledAt, durationMinutes, mode, meetingLink, location }
) => {
  const consultation = await getConsultationOrThrow(consultationId);

  if (!isParticipant(consultation, userId)) {
    throw new AppError('You are not a participant in this consultation', 403);
  }
  if (!consultation.lawyerId) {
    throw new AppError('Consultation must have an assigned lawyer before scheduling an appointment', 400);
  }

  const appointment = await Appointment.create({
    consultationId: consultation.id,
    clientId: consultation.clientId,
    lawyerId: consultation.lawyerId,
    scheduledAt,
    durationMinutes: durationMinutes || 30,
    mode: mode || 'video',
    meetingLink,
    location,
    status: 'scheduled',
  });

  const recipientUserId =
    userId === consultation.client.user.id ? consultation.lawyer?.user?.id : consultation.client.user.id;

  if (recipientUserId) {
    await notificationService.createNotification({
      userId: recipientUserId,
      type: 'appointment',
      title: 'New appointment scheduled',
      message: `An appointment was scheduled for "${consultation.title}"`,
      link: `/appointments/${appointment.id}`,
    });
  }

  return appointment;
};

module.exports = {
  getConsultationOrThrow,
  isParticipant,
  matchLawyers,
  bookConsultation,
  acceptConsultation,
  updateStatus,
  listForUser,
  scheduleAppointment,
};
