const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.get('/assessment', authMiddleware, controller.getRiskAssessment);

module.exports = router;

