const app = require('./app');
const { env } = require('./config/env');
const logger = require('./utils/logger');

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = server;

