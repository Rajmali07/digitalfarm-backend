const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authMiddleware = require('../../middleware/auth.middleware');

router.get('/', controller.getBlogs);
router.get('/:id', controller.getBlogById);
router.post('/', authMiddleware, controller.createBlog);
router.put('/:id', authMiddleware, controller.updateBlog);
router.delete('/:id', authMiddleware, controller.deleteBlog);

module.exports = router;

