const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.get('/', controller.getZones);
router.post('/', controller.createZone);
router.put('/:id', controller.updateZone);
router.delete('/:id', controller.deleteZone);

module.exports = router;