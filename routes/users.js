const express = require('express');

const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const {
  updateProfileValidation,
  clientProfileValidation,
  lawyerProfileValidation,
  validateUUIDParam,
  paginationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', userController.getProfile);
router.patch('/me', updateProfileValidation, userController.updateProfile);
router.post('/me/avatar', uploadSingle('avatar'), userController.uploadAvatar);
router.patch('/me/client-profile', authorize('client'), clientProfileValidation, userController.upsertClientProfile);
router.patch('/me/lawyer-profile', authorize('lawyer'), lawyerProfileValidation, userController.upsertLawyerProfile);
router.delete('/me', userController.deactivateAccount);

// Admin-only user management
router.get('/', authorize('admin'), paginationValidation, userController.listUsers);
router.get('/:id', authorize('admin'), validateUUIDParam(), userController.getUserById);

module.exports = router;
