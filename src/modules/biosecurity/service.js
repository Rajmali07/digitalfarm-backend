const { supabase } = require('../../config/supabaseClient');
const { RISK_LEVELS } = require('../../constants/riskLevels');

const DAILY_SUBMISSION_LIMIT = 3;

const ensureProfileExists = async (userId) => {
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return;
  }

  if (profileLookupError && profileLookupError.code !== 'PGRST116') {
    throw profileLookupError;
  }

  const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);

  if (authUserError || !authUserData?.user) {
    throw new Error('Unable to validate farmer account');
  }

  const authUser = authUserData.user;
  const metadata = authUser.user_metadata || {};

  const { error: insertProfileError } = await supabase.from('profiles').insert([
    {
      id: userId,
      role: 'FARMER',
      email: authUser.email || null,
      name: metadata.name || authUser.email || 'Farmer'
    }
  ]);

  if (insertProfileError) {
    throw insertProfileError;
  }
};

const getChecklist = async (userId) => {
  await ensureProfileExists(userId);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const { data, error } = await supabase
    .from('biosecurity_audits')
    .select('*')
    .eq('farmer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const { count, error: countError } = await supabase
    .from('biosecurity_audits')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', userId)
    .gte('created_at', startOfToday.toISOString())
    .lt('created_at', endOfToday.toISOString());

  if (countError) throw countError;

  return data
    ? {
        ...data,
        submissionCountToday: count || 0,
        remainingToday: Math.max(DAILY_SUBMISSION_LIMIT - (count || 0), 0),
        dailySubmissionLimit: DAILY_SUBMISSION_LIMIT
      }
    : {
        submissionCountToday: count || 0,
        remainingToday: Math.max(DAILY_SUBMISSION_LIMIT - (count || 0), 0),
        dailySubmissionLimit: DAILY_SUBMISSION_LIMIT
      };
};

const toSafeBoolean = (value) => value === true;

const scoreChecklist = (responses = {}) => {
  const normalized = {
    entry_restricted: toSafeBoolean(responses.entry_restricted),
    visitor_log: toSafeBoolean(responses.visitor_log),
    footbath_used: toSafeBoolean(responses.footbath_used),
    vehicles_disinfected: toSafeBoolean(responses.vehicles_disinfected),
    daily_clean: toSafeBoolean(responses.daily_clean),
    tools_disinfected: toSafeBoolean(responses.tools_disinfected),
    has_symptoms: toSafeBoolean(responses.has_symptoms),
    health_check_done: toSafeBoolean(responses.health_check_done),
    vax_status: toSafeBoolean(responses.vax_status),
    vet_consult: toSafeBoolean(responses.vet_consult),
    is_isolated: toSafeBoolean(responses.is_isolated),
    is_quarantined: toSafeBoolean(responses.is_quarantined),
    pest_control: toSafeBoolean(responses.pest_control),
    wildlife_restricted: toSafeBoolean(responses.wildlife_restricted),
    equipment_shared: toSafeBoolean(responses.equipment_shared),
    water_test_done: toSafeBoolean(responses.water_test_done),
    feed_mold_free: toSafeBoolean(responses.feed_mold_free),
    isolation_ready: toSafeBoolean(responses.isolation_ready)
  };

  const sanitationChecks = [
    normalized.daily_clean,
    normalized.tools_disinfected,
    normalized.footbath_used,
    normalized.vehicles_disinfected,
    normalized.equipment_shared
  ];

  const positiveChecks = [
    normalized.entry_restricted,
    normalized.visitor_log,
    normalized.footbath_used,
    normalized.vehicles_disinfected,
    normalized.daily_clean,
    normalized.tools_disinfected,
    !normalized.has_symptoms,
    normalized.health_check_done,
    normalized.vax_status,
    normalized.vet_consult,
    normalized.is_isolated,
    normalized.is_quarantined,
    normalized.pest_control,
    normalized.wildlife_restricted,
    normalized.equipment_shared,
    normalized.water_test_done,
    normalized.feed_mold_free,
    normalized.isolation_ready
  ];

  const yesCount = positiveChecks.filter(Boolean).length;
  const overallScore = Math.round((yesCount / positiveChecks.length) * 100);
  const sanitationScore = Math.round(
    (sanitationChecks.filter(Boolean).length / sanitationChecks.length) * 100
  );

  let riskLevel = RISK_LEVELS.LOW;

  if (
    (normalized.has_symptoms && !normalized.is_isolated) ||
    (normalized.has_symptoms && !normalized.vax_status)
  ) {
    riskLevel = RISK_LEVELS.CRITICAL;
  } else if (
    !normalized.daily_clean ||
    !normalized.entry_restricted ||
    normalized.has_symptoms ||
    !normalized.tools_disinfected ||
    !normalized.visitor_log
  ) {
    riskLevel = RISK_LEVELS.HIGH;
  } else if (overallScore < 85) {
    riskLevel = RISK_LEVELS.MEDIUM;
  }

  return {
    sanitation_score: sanitationScore,
    visitor_control: normalized.entry_restricted && normalized.visitor_log,
    isolation_facility: normalized.is_isolated && normalized.isolation_ready,
    waste_management: normalized.daily_clean,
    water_cleanliness: normalized.water_test_done && normalized.feed_mold_free,
    overall_score: overallScore,
    risk_level: riskLevel
  };
};

const reportIssue = async (userId, payload) => {
  await ensureProfileExists(userId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const { count, error: countError } = await supabase
    .from('biosecurity_audits')
    .select('*', { count: 'exact', head: true })
    .eq('farmer_id', userId)
    .gte('created_at', startOfToday.toISOString())
    .lt('created_at', endOfToday.toISOString());

  if (countError) throw countError;

  if ((count || 0) >= DAILY_SUBMISSION_LIMIT) {
    const error = new Error('Daily biosecurity checklist limit reached. You can submit it only 3 times per day.');
    error.statusCode = 429;
    throw error;
  }

  const responses = payload.responses || {};
  const derivedFields = scoreChecklist(responses);

  const { data, error } = await supabase
    .from('biosecurity_audits')
    .insert([
      {
        farmer_id: userId,
        responses,
        remarks: payload.remarks,
        status: payload.status,
        ...derivedFields
      }
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    submissionCountToday: (count || 0) + 1,
    remainingToday: Math.max(DAILY_SUBMISSION_LIMIT - ((count || 0) + 1), 0),
    dailySubmissionLimit: DAILY_SUBMISSION_LIMIT
  };
};

module.exports = { getChecklist, reportIssue };
