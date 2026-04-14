const express = require('express');
const router = express.Router();

const controller = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');
const roleMiddleware = require('../../middleware/role.middleware');
const { ROLES } = require('../../constants/roles');

const multer = require('multer');
const upload = multer(); // memory storage

router.post(
  '/',
  authMiddleware,
  roleMiddleware(ROLES.FARMER),
  upload.single('image'), // 👈 ADD THIS
  controller.createComplaint
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.FARMER, ROLES.ADMIN]),
  controller.getComplaints
);
router.patch('/:id/seen', controller.markComplaintSeen);
router.put('/:id', upload.single('resourceFile'), controller.updateComplaint);

module.exports = router;
