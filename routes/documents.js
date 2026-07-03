const express = require('express');

const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const {
  uploadDocumentValidation,
  validateUUIDParam,
  paginationValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', uploadSingle('file'), uploadDocumentValidation, documentController.upload);
router.get('/', paginationValidation, documentController.listMine);
router.get('/:id', validateUUIDParam(), documentController.getOne);
router.delete('/:id', validateUUIDParam(), documentController.remove);

module.exports = router;
