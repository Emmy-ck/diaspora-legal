const express = require('express');

const consultationController = require('../controllers/consultationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  bookConsultationValidation,
  consultationStatusValidation,
  validateUUIDParam,
  paginationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('client'), bookConsultationValidation, consultationController.book);
router.get('/', paginationValidation, consultationController.listMine);
router.get('/:id', validateUUIDParam(), consultationController.getOne);
router.patch('/:id/accept', authorize('lawyer'), validateUUIDParam(), consultationController.accept);
router.patch('/:id/status', validateUUIDParam(), consultationStatusValidation, consultationController.updateStatus);

module.exports = router;
