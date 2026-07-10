const express = require('express');

const router = express.Router();

// Central route registry - every feature router is mounted here, under its
// own base path, keeping app.js free of per-feature knowledge. To add a new
// feature: create routes/<feature>.js and add one line below.
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./users'));
router.use('/lawyers', require('./lawyers'));
router.use('/consultations', require('./consultations'));
router.use('/appointments', require('./appointments'));
router.use('/documents', require('./documents'));
router.use('/payments', require('./payments'));
router.use('/messages', require('./messages'));
router.use('/notifications', require('./notifications'));
router.use('/services', require('./services'));

module.exports = router;
