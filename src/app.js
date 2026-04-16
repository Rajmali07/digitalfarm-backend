const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { apiResponse } = require('./utils/apiResponse');
const { env } = require('./config/env');
const errorMiddleware = require('./middleware/error.middleware');
const indexRouter = require('./routes/index');

// Init app
const app = express();
const frontendPath = path.resolve(__dirname, '../../Frontend');
const hasFrontend = fs.existsSync(frontendPath);

const defaultOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'https://aidigitalfarm.netlify.app',
  'https://digitalfarm-backend.onrender.com'
];

const extraOrigins = (env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

function isRenderOrigin(origin) {
  return /\.onrender\.com$/i.test(origin);
}

// Security middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin) || isRenderOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(helmet());

// Logging
app.use(morgan('combined'));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (hasFrontend) {
  app.use(express.static(frontendPath));

  // Serve the static landing page when frontend files are available.
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('DigitalFarm Backend is running');
  });
}


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

