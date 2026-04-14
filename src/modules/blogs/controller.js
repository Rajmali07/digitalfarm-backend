const service = require('./service');
const { apiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getBlogs = asyncHandler(async (req, res) => {
  const blogs = await service.getBlogs();
  apiResponse.success(res, 'Blogs fetched', 200, blogs);
});

const getBlogById = asyncHandler(async (req, res) => {
  const blog = await service.getBlogById(req.params.id);
  apiResponse.success(res, 'Blog details', 200, blog);
});

const createBlog = asyncHandler(async (req, res) => {
  const blog = await service.createBlog(req.user.id, req.body);
  apiResponse.success(res, 'Blog created', 201, blog);
});

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await service.updateBlog(req.params.id, req.body);
  apiResponse.success(res, 'Blog updated', 200, blog);
});

const deleteBlog = asyncHandler(async (req, res) => {
  await service.deleteBlog(req.params.id);
  apiResponse.success(res, 'Blog deleted', 200);
});

module.exports = { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog };

