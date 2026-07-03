const { Notification } = require('../models');
const { getIO } = require('../config/socket');
const { AppError } = require('../utils/helpers');
const logger = require('../utils/logger');

// Persists a notification and pushes it in real time to the recipient's
// socket room (see config/socket.js - clients join a room named after their
// userId after connecting). Socket.IO may not be initialized yet in some
// contexts (e.g. scripts/tests), so the emit is best-effort.
const createNotification = async ({ userId, type, title, message, link, metadata }) => {
  const notification = await Notification.create({ userId, type, title, message, link, metadata });

  try {
    getIO().to(userId).emit('notification:new', notification);
  } catch (error) {
    logger.warn(`Skipped real-time notification emit: ${error.message}`);
  }

  return notification;
};

const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { notifications: rows, total: count, page, pages: Math.ceil(count / limit) || 1 };
};

const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ where: { id: notificationId, userId } });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

const markAllAsRead = async (userId) => {
  await Notification.update({ isRead: true, readAt: new Date() }, { where: { userId, isRead: false } });
};

const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOne({ where: { id: notificationId, userId } });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }
  await notification.destroy();
};

module.exports = { createNotification, getUserNotifications, markAsRead, markAllAsRead, deleteNotification };
