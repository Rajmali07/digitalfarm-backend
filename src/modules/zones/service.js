const { supabase } = require('../../config/supabaseClient');

const getZones = async () => {
  const { data, error } = await supabase
    .from('zones')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const normalizeKeywords = (keywords) => {
  if (Array.isArray(keywords)) {
    return keywords.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof keywords === 'string') {
    return keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildZonePayload = ({ name, status, keywords }) => {
  const payload = {
    name: String(name || '').trim()
  };

  if (status) {
    payload.status = String(status).trim().toLowerCase();
  }

  const normalizedKeywords = normalizeKeywords(keywords);
  if (normalizedKeywords.length) {
    payload.keywords = normalizedKeywords;
  } else if (Array.isArray(keywords)) {
    payload.keywords = [];
  }

  return payload;
};

const createZone = async ({ name, status, keywords }) => {
  const { data, error } = await supabase
    .from('zones')
    .insert([buildZonePayload({ name, status, keywords })])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const updateZone = async (id, { name, status, keywords }) => {
  const { data, error } = await supabase
    .from('zones')
    .update(buildZonePayload({ name, status, keywords }))
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteZone = async (id) => {
  const { error } = await supabase
    .from('zones')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};

module.exports = { getZones, createZone, updateZone, deleteZone };
