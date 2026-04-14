router.put(
  '/change-password',
  authMiddleware,
  authController.changePassword
);