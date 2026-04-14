const { supabase } = require('../../config/supabaseClient');

// ✅ GET ALL VACCINATIONS
const getVaccinations = async (userId) => {
  const { data, error } = await supabase
    .from('vaccinations')
    .select('*')
    .eq('farmer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};

// ✅ ADD VACCINATION
const addVaccination = async (userId, body) => {
  const { data, error } = await supabase
    .from('vaccinations')
    .insert([
      {
        farmer_id: userId,
        animal_type: body.animalType,
        disease_name: body.diseaseName,
        target_group: body.targetGroup,
        dose_count: body.doseCount,
        date_administered: body.dateAdministered,
        next_due_date: body.nextDueDate,
        notes: body.notes
      }
    ])
    .select();

  if (error) throw error;

  return data[0];
};

module.exports = {
  getVaccinations,
  addVaccination
};