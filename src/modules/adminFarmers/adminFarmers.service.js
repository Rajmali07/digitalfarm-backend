const { supabase } = require('../../config/supabaseClient');

const getAllFarmers = async (filters) => {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'FARMER'); // important

  if (filters.state && filters.state !== 'all') {
    query = query.eq('state', filters.state);
  }

  if (filters.district && filters.district !== 'all') {
    query = query.eq('district', filters.district);
  }

  if (filters.village && filters.village !== 'all') {
    query = query.eq('village', filters.village);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
};

module.exports = { getAllFarmers };