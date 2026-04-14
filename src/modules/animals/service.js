// Stub service for animals
const { supabase } = require('../../config/supabaseClient');

// ✅ GET ALL ANIMALS
const getAnimals = async (userId) => {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('farmer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};

// ✅ ADD ANIMAL
const addAnimal = async (userId, body) => {
  const insertPayload = {
    farmer_id: userId,
    animal_type: body.animalType,
    batch_id: body.batchId,
    breed_name: body.breedName,
    age_group: body.ageGroup,
    farm_unit: body.farmUnit,
    total_animals: body.totalAnimals,
    new_additions: body.newAdditions,
    mortality_count: body.mortalityCount,
    gender_group: body.genderGroup,
    current_health_state: body.currentHealthState
  };

  const { data, error } = await supabase
    .from('animals')
    .insert([insertPayload])
    .select();

  if (error) throw error;

  return data[0];
};

// ✅ GET BY ID
const getAnimalById = async (userId, id) => {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', id)
    .eq('farmer_id', userId)
    .single();

  if (error) throw error;

  return data;
};

module.exports = {
  getAnimals,
  addAnimal,
  getAnimalById
};

