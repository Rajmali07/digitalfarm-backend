const { supabase } = require('../../config/supabaseClient');

// CREATE FEEDBACK
const createFeedback = async (body) => {
  const { sender, email, subject, message } = body;

  const { data, error } = await supabase
    .from('feedback')
    .insert([{
      sender,
      email,
      subject,
      message,
      status: "Unreviewed",
      impact_score: 5,
      admin_notes: ""
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const updateFeedback = async (id, body) => {
  const { status, impact_score, admin_notes } = body;

  const { data, error } = await supabase
    .from('feedback')
    .update({
      status,
      impact_score,
      admin_notes
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// GET ALL FEEDBACK
const getFeedbacks = async () => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

module.exports = { createFeedback, getFeedbacks, updateFeedback };
