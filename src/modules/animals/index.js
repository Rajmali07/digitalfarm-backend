const express = require('express');
const router = express.Router();
const animalsController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

router.get('/', authMiddleware, roleMiddleware([ROLES.FARMER]), animalsController.getAnimals);
router.post('/', authMiddleware, roleMiddleware([ROLES.FARMER]), animalsController.addAnimal);
router.get('/:id', authMiddleware, roleMiddleware([ROLES.FARMER]), animalsController.getAnimalById);

module.exports = router;

