const express = require('express');
const router = express.Router();
const aiController = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');

const upload = require('../../middleware/upload.middleware');

router.post(
  '/analyze-risk',
  authMiddleware,
  upload.single('image'),   // 🔥 THIS LINE IS IMPORTANT
  aiController.analyzeRisk
);
router.get('/history', authMiddleware, aiController.getHistory);
router.post('/risk-summary', authMiddleware, aiController.getRiskSummary);

module.exports = router;

