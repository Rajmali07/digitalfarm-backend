const { supabase } = require('../../config/supabaseClient');
const { analyzeRisk } = require('../../services/aiService');
const { analyzeDashboardRiskNarrative } = require('../../services/aiService');
const { randomUUID } = require('crypto');

const analyzeAndSave = async (userId, farmData, file) => {
  let imageUrl = null;

  // ✅ Upload image to Supabase Storage
  if (file) {
    const fileName = `ai-${Date.now()}-${randomUUID()}`;

    const { data, error } = await supabase.storage
      .from('ai-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      console.error('AI image upload error:', error.message || error);
    } else {

    // ✅ Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('ai-images')
      .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }
  }

  // ✅ AI Analysis
  const result = await analyzeRisk(farmData, file);

  // ✅ Save to DB
  const { data, error } = await supabase
    .from('ai_diagnosis')
    .insert([
      {
        farmer_id: userId,
        symptoms: farmData.symptoms,
        predicted_disease: result.disease,
        confidence: parseFloat(result.confidence) || 0,
        severity: result.severity,
        recommendation: result.recommendation,
        image_url: imageUrl, // 🔥 IMPORTANT
      },
    ])
    .select();

  if (error) throw error;

  return {
    analysis: result,
    saved: data[0],
  };
};

const getHistory = async (userId) => {
  const { data, error } = await supabase
    .from('ai_diagnosis')
    .select('id, symptoms, predicted_disease, confidence, severity, recommendation, created_at, image_url')
    .eq('farmer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('AI diagnosis save error:', error.message || error);
    return [];
  }

  return data;
};

const getRiskSummary = async (userId, payload = {}) => {
  const result = await analyzeDashboardRiskNarrative({
    ...payload,
    userId,
  });

  return result;
};

module.exports = { analyzeAndSave, getHistory, getRiskSummary };
