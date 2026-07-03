const express = require('express');

const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { paymentValidation, validateUUIDParam, paginationValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('client'), paymentValidation, paymentController.create);
router.get('/', paginationValidation, paymentController.listMine);
router.get('/:id', validateUUIDParam(), paymentController.getOne);
router.patch('/:id/refund', authorize('admin'), validateUUIDParam(), paymentController.refund);

module.exports = router;
