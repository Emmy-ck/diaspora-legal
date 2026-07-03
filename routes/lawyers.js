const express = require('express');

const lawyerController = require('../controllers/lawyerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  validateUUIDParam,
  paginationValidation,
  lawyerVerificationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Public lawyer directory - no auth required to browse/search
router.get('/', paginationValidation, lawyerController.list);
router.get('/:id', validateUUIDParam(), lawyerController.getOne);

// Admin-only moderation
router.patch(
  '/:id/verification',
  protect,
  authorize('admin'),
  validateUUIDParam(),
  lawyerVerificationValidation,
  lawyerController.updateVerificationStatus
);

module.exports = router;
