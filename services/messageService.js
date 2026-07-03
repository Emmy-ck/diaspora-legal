const { Op } = require('sequelize');
const { Message, User } = require('../models');
const { AppError } = require('../utils/helpers');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');
const consultationService = require('./consultationService');
const notificationService = require('./notificationService');

const SENDER_ATTRS = ['id', 'firstName', 'lastName', 'email', 'avatar', 'role'];

const MESSAGE_INCLUDES = [
  { model: User, as: 'sender', attributes: SENDER_ATTRS },
  { model: User, as: 'receiver', attributes: SENDER_ATTRS },
];

const getMessageOrThrow = async (id) => {
  const message = await Message.findByPk(id, { include: MESSAGE_INCLUDES });
  if (!message) {
    throw new AppError('Message not found', 404);
  }
  return message;
};

// Sends a direct message from `senderId` to `receiverId`. If `consultationId`
// is provided, both parties must be participants in that consultation.
// Persists the message then emits it in real time to the receiver's socket
// room and creates a fallback notification.
const sendMessage = async (senderId, { receiverId, consultationId, content, attachmentUrl }) => {
  if (senderId === receiverId) {
    throw new AppError('You cannot send a message to yourself', 400);
  }

  const receiver = await User.findByPk(receiverId);
  if (!receiver || !receiver.isActive) {
    throw new AppError('Recipient not found', 404);
  }

  if (consultationId) {
    const consultation = await consultationService.getConsultationOrThrow(consultationId);
    if (
      !consultationService.isParticipant(consultation, senderId) ||
      !consultationService.isParticipant(consultation, receiverId)
    ) {
      throw new AppError('Both users must be participants in this consultation', 403);
    }
  }

  const message = await Message.create({
    consultationId: consultationId || null,
    senderId,
    receiverId,
    content,
    attachmentUrl: attachmentUrl || null,
  });

  const fullMessage = await getMessageOrThrow(message.id);

  try {
    getIO().to(receiverId).emit('message:new', fullMessage);
  } catch (error) {
    logger.warn(`Skipped real-time message emit: ${error.message}`);
  }

  await notificationService.createNotification({
    userId: receiverId,
    type: 'message',
    title: 'New message',
    message: `${fullMessage.sender.firstName} ${fullMessage.sender.lastName} sent you a message`,
    link: consultationId ? `/consultations/${consultationId}/messages` : `/messages/${senderId}`,
  });

  return fullMessage;
};

// Paginated message thread between the current user and another user,
// oldest-to-newest, optionally scoped to a single consultation.
const getConversation = async (userId, otherUserId, { consultationId, page = 1, limit = 30 } = {}) => {
  const other = await User.findByPk(otherUserId);
  if (!other) {
    throw new AppError('User not found', 404);
  }

  const where = {
    [Op.or]: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  };
  if (consultationId) {
    where.consultationId = consultationId;
  }

  const { rows, count } = await Message.findAndCountAll({
    where,
    include: MESSAGE_INCLUDES,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    messages: rows.reverse(),
    total: count,
    page,
    pages: Math.ceil(count / limit) || 1,
  };
};

// Groups the user's messages by conversation partner, returning the most
// recent message and unread count for each - i.e. an inbox view.
const listConversations = async (userId) => {
  const messages = await Message.findAll({
    where: { [Op.or]: [{ senderId: userId }, { receiverId: userId }] },
    include: MESSAGE_INCLUDES,
    order: [['createdAt', 'DESC']],
  });

  const conversations = new Map();

  for (const message of messages) {
    const partner = message.senderId === userId ? message.receiver : message.sender;
    const partnerId = partner.id;

    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, {
        partner,
        lastMessage: message,
        unreadCount: 0,
      });
    }

    if (message.receiverId === userId && !message.isRead) {
      conversations.get(partnerId).unreadCount += 1;
    }
  }

  return Array.from(conversations.values());
};

const markAsRead = async (userId, messageId) => {
  const message = await Message.findOne({ where: { id: messageId, receiverId: userId } });
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (!message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  return message;
};

// Marks every unread message from `otherUserId` to the current user as read,
// e.g. when the user opens that conversation thread.
const markConversationAsRead = async (userId, otherUserId) => {
  await Message.update(
    { isRead: true, readAt: new Date() },
    { where: { senderId: otherUserId, receiverId: userId, isRead: false } }
  );
};

const getUnreadCount = async (userId) => {
  const count = await Message.count({ where: { receiverId: userId, isRead: false } });
  return count;
};

const deleteMessage = async (userId, messageId) => {
  const message = await Message.findOne({ where: { id: messageId, senderId: userId } });
  if (!message) {
    throw new AppError('Message not found', 404);
  }
  await message.destroy();
};

module.exports = {
  getMessageOrThrow,
  sendMessage,
  getConversation,
  listConversations,
  markAsRead,
  markConversationAsRead,
  getUnreadCount,
  deleteMessage,
};
