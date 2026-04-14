const express = require('express');
const router = express.Router();

// Module routers
const authRoutes = require('../modules/auth');
const farmersRoutes = require('../modules/farmers');
const adminsRoutes = require('../modules/admins');
const animalsRoutes = require('../modules/animals');
const vaccinationsRoutes = require('../modules/vaccinations');
const biosecurityRoutes = require('../modules/biosecurity');
const aiRoutes = require('../modules/ai');
const complaintsRoutes = require('../modules/complaints');
const riskRoutes = require('../modules/risk');
const weatherRoutes = require('../modules/weather');
const blogsRoutes = require('../modules/blogs');
const feedbackRoutes = require('../modules/feedback');
const zonesRoutes = require('../modules/zones');
const adminFarmersRoutes = require('../modules/adminFarmers/adminFarmers.routes');

// Routes
router.use('/farm', require('../modules/farm/route'));
router.use('/admin/farmers', adminFarmersRoutes);
router.use('/zones', zonesRoutes);
router.use('/auth', authRoutes);
router.use('/farmers', farmersRoutes);
router.use('/admins', adminsRoutes);
router.use('/animals', animalsRoutes);
router.use('/vaccinations', vaccinationsRoutes);
router.use('/biosecurity', biosecurityRoutes);
router.use('/ai', aiRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/risk', riskRoutes);
router.use('/weather', weatherRoutes);
router.use('/blogs', blogsRoutes);
router.use('/feedback', feedbackRoutes);

module.exports = router;

