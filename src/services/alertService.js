const { supabase } = require('../config/supabaseClient');

const extractMissingColumn = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : null;
};

const sendAlert = async (userId, payload = {}) => {
  const message = payload.message || 'Admin prescription available';
  const insertPayload = {
    farmer_id: userId,
    message,
    type: 'complaint_prescription',
    status: 'Unread',
    complaint_id: payload.complaintId || null,
    prescription_detail: payload.prescriptionDetail || null,
    internal_diagnosis: payload.internalDiagnosis || null,
    prescription_file_url: payload.prescriptionFileUrl || null,
    seen_at: payload.seenAt || null
  };

  let mutablePayload = { ...insertPayload };
  let lastResult = null;

  while (Object.keys(mutablePayload).length) {
    lastResult = await supabase
      .from('alerts')
      .insert([mutablePayload])
      .select()
      .single();

    if (!lastResult.error) {
      return lastResult.data;
    }

    const missingColumn = extractMissingColumn(lastResult.error);
    if (!missingColumn || !(missingColumn in mutablePayload)) {
      break;
    }

    delete mutablePayload[missingColumn];
  }

  throw lastResult?.error || new Error('Failed to insert alert record');
};

module.exports = { sendAlert };

