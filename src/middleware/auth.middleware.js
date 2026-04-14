const { apiResponse } = require('../utils/apiResponse');
const { supabase } = require('../config/supabaseClient');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.error(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // ✅ Decode token
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    const userId = decoded.sub || decoded.id || decoded.profileId;

    console.log("TOKEN PAYLOAD:", decoded);
    console.log("TOKEN USER ID:", userId);

    // ✅ Fetch from DB
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

      console.log("USER ROLE:", data.role);
    console.log("DB USER:", data); // 🔥 IMPORTANT DEBUG

    if (error || !data) {
      return apiResponse.error(res, 'User not found', 401);
    }

    // ✅ THIS IS THE KEY LINE
    req.user = data;

    next();

  } catch (err) {
    console.error(err);
    return apiResponse.error(res, 'Auth failed', 401);
  }
};

module.exports = authMiddleware;