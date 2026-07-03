const express = require('express');

const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validateUUIDParam, paginationValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', paginationValidation, notificationController.getMyNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validateUUIDParam(), notificationController.markAsRead);
router.delete('/:id', validateUUIDParam(), notificationController.deleteNotification);

module.exports = router;
