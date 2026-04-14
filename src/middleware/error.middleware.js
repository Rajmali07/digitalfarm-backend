const { apiResponse } = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
  console.error("🔥 ERROR:", err.message);

  // Default status
  const statusCode = err.statusCode || 400;

  return apiResponse.error(
    res,
    err.message || "Something went wrong",
    statusCode,
    {
      error: err.stack
    }
  );
};

module.exports = errorMiddleware;