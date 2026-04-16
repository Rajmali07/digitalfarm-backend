const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiResponse } = require('./utils/apiResponse');
const errorMiddleware = require('./middleware/error.middleware');
const indexRouter = require('./routes/index');

// Init app
const app = express();

// Security middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://aidigitalfarm.netlify.app"
  ],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route (for Render testing)
app.get('/', (req, res) => {
  res.send('DigitalFarm Backend is running 🚀');
});


// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', message: 'DigitalFarm Backend running' }));

// Routes
app.use('/api/v1', indexRouter);

// 404 handler
app.use('*', (req, res) => {
  apiResponse.error(res, 'Route not found', 404);
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;

