const express = require('express');

const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { sendMessageValidation, validateUUIDParam, paginationValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', sendMessageValidation, messageController.send);
router.get('/conversations', messageController.listConversations);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversation/:userId', validateUUIDParam('userId'), paginationValidation, messageController.getConversation);
router.patch('/conversation/:userId/read', validateUUIDParam('userId'), messageController.markConversationAsRead);
router.patch('/:id/read', validateUUIDParam(), messageController.markAsRead);
router.delete('/:id', validateUUIDParam(), messageController.remove);

module.exports = router;
