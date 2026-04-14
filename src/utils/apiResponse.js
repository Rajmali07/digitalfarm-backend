const sendResponse = (res, statusCode, success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    data,
    ...(meta && { meta })
  };

  res.status(statusCode).json(response);
};

const apiResponse = {
  success: (res, message, statusCode = 200, data = null, meta = null) => {
    sendResponse(res, statusCode, true, message, data, meta);
  },
  error: (res, message, statusCode = 500, error = null) => {
    sendResponse(res, statusCode, false, message, null, { error });
  }
};

module.exports = { apiResponse };

