const express = require('express');
const Joi = require('joi');
const router = express.Router();
const authController = require('./controller');
const validateMiddleware = require('../../middleware/validate.middleware');
const authMiddleware = require('../../middleware/auth.middleware');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  address: Joi.string().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  farm_name: Joi.string().required(),
  farm_type: Joi.string().required(),
  role: Joi.string().valid('farmer', 'admin').optional()
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  redirectTo: Joi.string().uri().optional()
});
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

router.post('/register', validateMiddleware(registerSchema), authController.register);
router.post('/login', validateMiddleware(loginSchema), authController.login);
router.post('/forgot-password', validateMiddleware(forgotPasswordSchema), authController.forgotPassword);
router.put('/change-password', authMiddleware, validateMiddleware(changePasswordSchema), authController.changePassword);

module.exports = router;
