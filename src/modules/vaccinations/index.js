const express = require('express');
const router = express.Router();
const vaccinationsController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

router.get('/', authMiddleware, roleMiddleware([ROLES.FARMER]), vaccinationsController.getVaccinations);
router.post('/', authMiddleware, roleMiddleware([ROLES.FARMER]), vaccinationsController.addVaccination);

module.exports = router;

