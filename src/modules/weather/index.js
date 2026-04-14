const express = require('express');
const router = express.Router();
const weatherController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.post('/save', authMiddleware, weatherController.saveWeather);
router.get('/latest', authMiddleware, weatherController.getLatestWeather);
router.get('/current', authMiddleware, weatherController.refreshCurrentWeather);

module.exports = router;
