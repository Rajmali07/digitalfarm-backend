const express = require('express');
const router = express.Router();
const farmersController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

router.get('/profile', authMiddleware, roleMiddleware([ROLES.FARMER]), farmersController.getProfile);
router.put('/profile', authMiddleware, roleMiddleware([ROLES.FARMER]), farmersController.updateProfile);

module.exports = router;

