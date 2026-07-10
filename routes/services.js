const express = require('express');

const serviceController = require('../controllers/serviceController');

const router = express.Router();

// Public marketing catalog — no auth required
router.get('/categories', serviceController.listCategories);
router.get('/', serviceController.list);
router.get('/:slug', serviceController.getBySlug);

module.exports = router;
