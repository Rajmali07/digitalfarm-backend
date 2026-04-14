const { supabase } = require('../../config/supabaseClient');

exports.getFarmStats = async (userId) => {
  // 🔹 get all animals of this farmer
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('farmer_id', userId);

  if (error) throw error;

  const animals = data || [];

  // 🔹 unique animal types
  const uniqueTypes = new Set(
    animals
      .map((a) => a.animal_type)
      .filter(Boolean)
  );
  const animalTypes = uniqueTypes.size;

  // 🔹 active units: count distinct farm units present in animals table
  const uniqueUnits = new Set(
    animals
      .map((a) => String(a.farm_unit || '').trim())
      .filter(Boolean)
  );
  const activeUnits = uniqueUnits.size || animals.length;

  return {
    activeUnits,
    animalTypes
  };
};