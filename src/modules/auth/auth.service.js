const { supabase } = require('../../config/supabaseClient');

const changePassword = async (userId, newPassword) => {
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (error) {
    console.error("Password Update Error:", error.message);
    throw new Error("Failed to update password");
  }

  return data;
};

module.exports = {
  // keep your existing exports
  changePassword
};