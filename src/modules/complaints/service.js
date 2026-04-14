const { supabase } = require('../../config/supabaseClient');
const { sendAlert } = require('../../services/alertService');
const COMPLAINTS_BUCKET_CANDIDATES = ['Complaints', 'complaints'];
const PRESCRIPTIONS_BUCKET = 'prescriptions';

const extractMissingColumn = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : null;
};

const uploadComplaintImage = async (file) => {
  if (!file) {
    return null;
  }

  const safeName = String(file.originalname || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `complaints/${Date.now()}_${safeName}`;
  let lastUploadError = null;

  for (const bucketName of COMPLAINTS_BUCKET_CANDIDATES) {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) {
      lastUploadError = uploadError;
      continue;
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return data?.publicUrl || null;
  }

  console.error('Complaint image upload skipped:', lastUploadError);
  return null;
};

const createComplaint = async (userId, body, file) => {
  const imageUrl = await uploadComplaintImage(file);

  const { data, error } = await supabase
    .from('complaints')
    .insert([
      {
        farmer_id: userId,
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        animal_type: body.animalType,
        incident_type: body.incidentType,
        urgency_level: body.urgencyLevel,
        affected_count: body.affectedCount,
        location: body.location,
        incident_date: body.incidentDate,
        symptoms: body.symptoms,
        contact_preference: body.contactPreference,
        status: 'pending',
        image_url: imageUrl,
        seen_by_admin: false
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('DB Error:', error);
    throw error;
  }

  return data;
};

const getComplaints = async (userId, role) => {
  let query = supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId && role === 'FARMER') {
    query = query.eq('farmer_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
};

const markComplaintSeen = async (complaintId) => {
  const { data, error } = await supabase
    .from('complaints')
    .update({ seen_by_admin: true })
    .eq('id', complaintId)
    .select()
    .single();

  if (error) throw error;

  return data;
};

const updateComplaint = async (complaintId, payload, file) => {
  const normalizedPayload = { ...payload };

  if (file) {
    const safeName = String(file.originalname || 'resource').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `complaint-${complaintId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'application/octet-stream'
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRESCRIPTIONS_BUCKET)
      .getPublicUrl(filePath);

    normalizedPayload.prescriptionFileUrl = publicUrlData?.publicUrl || null;
  }

  const { data: complaintBeforeUpdate, error: complaintFetchError } = await supabase
    .from('complaints')
    .select('id, farmer_id, title, incident_type, animal_type')
    .eq('id', complaintId)
    .single();

  if (complaintFetchError) {
    throw complaintFetchError;
  }

  const updateData = {};

  if (normalizedPayload.adminPrescription !== undefined) {
    updateData.admin_response = normalizedPayload.adminPrescription;
  }

  if (normalizedPayload.internalDiagnosis !== undefined) {
    updateData.internal_diagnosis = normalizedPayload.internalDiagnosis;
  }

  if (normalizedPayload.prescriptionFileUrl !== undefined) {
    updateData.prescription_file_url = normalizedPayload.prescriptionFileUrl;
  }

  if (normalizedPayload.status !== undefined) {
    updateData.status = normalizedPayload.status;
  }

  if (!Object.keys(updateData).length) {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (error) throw error;

    return data;
  }

  let mutableUpdateData = { ...updateData };
  let complaintUpdate = null;

  while (Object.keys(mutableUpdateData).length) {
    complaintUpdate = await supabase
      .from('complaints')
      .update(mutableUpdateData)
      .eq('id', complaintId)
      .select()
      .single();

    if (!complaintUpdate.error) {
      break;
    }

    const missingColumn = extractMissingColumn(complaintUpdate.error);
    if (!missingColumn || !(missingColumn in mutableUpdateData)) {
      break;
    }

    delete mutableUpdateData[missingColumn];
  }

  if (complaintUpdate.error) throw complaintUpdate.error;

  const data = complaintUpdate.data;

  if (normalizedPayload.adminPrescription !== undefined && complaintBeforeUpdate?.farmer_id) {
    const caseLabel = complaintBeforeUpdate.title || complaintBeforeUpdate.incident_type || 'Complaint';
    const animalLabel = complaintBeforeUpdate.animal_type || 'Animal';
    const diagnosisPart = normalizedPayload.internalDiagnosis ? ` | Diagnosis: ${normalizedPayload.internalDiagnosis}` : '';
    const filePart = normalizedPayload.prescriptionFileUrl ? ' | Attachment provided' : '';
    const alertMessage = `Admin prescription for ${caseLabel} (${animalLabel}): ${normalizedPayload.adminPrescription}${diagnosisPart}${filePart}`;

    try {
      await sendAlert(complaintBeforeUpdate.farmer_id, {
        complaintId,
        message: alertMessage,
        prescriptionDetail: normalizedPayload.adminPrescription,
        internalDiagnosis: normalizedPayload.internalDiagnosis,
        prescriptionFileUrl: normalizedPayload.prescriptionFileUrl || null
      });
    } catch (alertError) {
      console.error('Failed to store admin prescription alert:', alertError);
    }
  }

  return data;
};

module.exports = { createComplaint, getComplaints, markComplaintSeen, updateComplaint };
