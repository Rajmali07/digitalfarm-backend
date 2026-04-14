const express = require('express');
const router = express.Router();
const adminsController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

router.get('/dashboard', authMiddleware, roleMiddleware([ROLES.ADMIN]), adminsController.dashboard);

module.exports = router;

