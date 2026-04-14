const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { ROLES } = require('../../constants/roles');

router.get('/checklist', authMiddleware, controller.getChecklist);
router.post('/report', authMiddleware, controller.reportIssue);

module.exports = router;

