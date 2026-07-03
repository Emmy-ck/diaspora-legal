const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../utils/helpers');

// GET /api/notifications
const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const result = await notificationService.getUserNotifications(req.user.id, {
    page: Number(page),
    limit: Number(limit),
    unreadOnly: unreadOnly === 'true',
  });
  res.status(200).json({ success: true, data: result });
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: { notification } });
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Notification deleted' });
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead, deleteNotification };
