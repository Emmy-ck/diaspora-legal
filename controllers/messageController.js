const messageService = require('../services/messageService');
const { asyncHandler } = require('../utils/helpers');

// POST /api/messages - send a direct message
const send = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Message sent', data: { message } });
});

// GET /api/messages/conversations - inbox: one entry per conversation partner
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await messageService.listConversations(req.user.id);
  res.status(200).json({ success: true, data: { conversations } });
});

// GET /api/messages/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await messageService.getUnreadCount(req.user.id);
  res.status(200).json({ success: true, data: { count } });
});

// GET /api/messages/conversation/:userId - paginated thread with a specific user
const getConversation = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, consultationId } = req.query;
  const result = await messageService.getConversation(req.user.id, req.params.userId, {
    consultationId,
    page: Number(page),
    limit: Number(limit),
  });
  res.status(200).json({ success: true, data: result });
});

// PATCH /api/messages/conversation/:userId/read - mark all messages from :userId as read
const markConversationAsRead = asyncHandler(async (req, res) => {
  await messageService.markConversationAsRead(req.user.id, req.params.userId);
  res.status(200).json({ success: true, message: 'Conversation marked as read' });
});

// PATCH /api/messages/:id/read - mark a single message as read
const markAsRead = asyncHandler(async (req, res) => {
  const message = await messageService.markAsRead(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: { message } });
});

// DELETE /api/messages/:id
const remove = asyncHandler(async (req, res) => {
  await messageService.deleteMessage(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Message deleted' });
});

module.exports = {
  send,
  listConversations,
  getUnreadCount,
  getConversation,
  markConversationAsRead,
  markAsRead,
  remove,
};
