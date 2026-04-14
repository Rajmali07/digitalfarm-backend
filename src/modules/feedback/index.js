const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/', controller.createFeedback);
router.get('/', controller.getFeedbacks);
router.put('/:id', controller.updateFeedback);

module.exports = router;
