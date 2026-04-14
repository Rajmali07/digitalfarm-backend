const router = require('express').Router();
const controller = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.get('/profile', authMiddleware, controller.getFarmProfile);

module.exports = router;