const { apiResponse } = require('../utils/apiResponse');

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const roles = allowedRoles.flat();

      const userRole = req.user?.role || req.user?.user_metadata?.role;

      console.log("User Role:", userRole);
      console.log("Allowed Roles:", roles);

      if (!req.user || !userRole) {
        return apiResponse.error(res, 'User role not found', 403);
      }

      if (!roles.includes(userRole)) {
        return apiResponse.error(
          res,
          'Access denied. Insufficient permissions.',
          403
        );
      }

      next();

    } catch (error) {
      console.error("Role Middleware Error:", error);
      return apiResponse.error(res, 'Authorization error', 500);
    }
  };
};

module.exports = roleMiddleware;