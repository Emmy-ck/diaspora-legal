const express = require('express');

const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const {
  scheduleAppointmentValidation,
  appointmentStatusValidation,
  validateUUIDParam,
  paginationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', scheduleAppointmentValidation, appointmentController.schedule);
router.get('/', paginationValidation, appointmentController.listMine);
router.get('/:id', validateUUIDParam(), appointmentController.getOne);
router.patch('/:id/status', validateUUIDParam(), appointmentStatusValidation, appointmentController.updateStatus);

module.exports = router;
