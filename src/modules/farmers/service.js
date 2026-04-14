const { supabase } = require('../../config/supabaseClient');

const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Get Profile Error:", error.message);
    throw new Error("Failed to fetch profile");
  }

  return data;
};

const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error("Update Profile Error:", error.message);
    throw new Error("Failed to update profile");
  }

  return data;
};

module.exports = { getProfile, updateProfile };