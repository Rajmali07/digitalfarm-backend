const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../../config/supabaseClient');
const { env } = require('../../config/env');

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const LOCATION_STOP_WORDS = new Set([
  'zone',
  'area',
  'district',
  'block',
  'sector',
  'region',
  'ward',
  'village',
  'city',
  'state',
  'farm'
]);

const tokenizeAddress = (address) => normalizeText(address)
  .split(/[\s,/-]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const getMeaningfulTokens = (value) => tokenizeAddress(value)
  .filter((token) => token.length > 2 && !LOCATION_STOP_WORDS.has(token));

const getZoneTerms = (zone) => {
  const terms = [zone.name];

  if (Array.isArray(zone.keywords)) {
    terms.push(...zone.keywords);
  }

  return terms
    .map((term) => normalizeText(term))
    .filter(Boolean);
};

const getProfileForLogin = async (authUserId, email) => {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('id', authUserId)
    .single();

  let { data: profile, error: profileError } = await query;

  if (!profileError && profile) {
    return profile;
  }

  if (email) {
    const fallbackResult = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fallbackResult.error) {
      throw new Error('User profile not found');
    }

    if (Array.isArray(fallbackResult.data) && fallbackResult.data.length) {
      return fallbackResult.data[0];
    }
  }

  throw new Error('User profile not found');
};

const register = async (body) => {
  const {
    name,
    email,
    password,
    phone,
    farm_name,
    farm_type,
    address
  } = body;

  // 🔥 STEP 1: FETCH ZONES
  const { data: zones, error: zoneError } = await supabase
    .from('zones')
    .select('*')
    .eq('status', 'active');

  if (zoneError) {
    throw new Error("Error fetching zones");
  }

  // 🔥 STEP 2: MATCH ADDRESS
  const lowerAddress = normalizeText(address);
  const addressWords = tokenizeAddress(address);
  const meaningfulAddressTokens = getMeaningfulTokens(address);
  let matchedZone = null;

  for (let zone of zones) {
    const zoneTerms = getZoneTerms(zone);

    if (zoneTerms.some((term) => {
      const termWords = tokenizeAddress(term);
      const meaningfulTermTokens = getMeaningfulTokens(term);

      return (
        lowerAddress.includes(term)
        || term.includes(lowerAddress)
        || addressWords.includes(term)
        || termWords.some((word) => addressWords.includes(word))
        || meaningfulTermTokens.some((token) => meaningfulAddressTokens.includes(token))
      );
    })) {
      matchedZone = zone;
      break;
    }
  }

  // ❌ BLOCK USER IF NO MATCH
  if (!matchedZone) {
    throw new Error("Your location is not in allowed zones ❌");
  }

  // 🔥 STEP 3: CREATE USER (SUPABASE AUTH)
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authUser.user.id;

  // 🔥 STEP 4: INSERT INTO PROFILES
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId,
        name,
        email,
        phone,
        farm_name,
        farm_type,
        address,
        role: 'FARMER',
        zone_id: matchedZone.id
      }
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    id: userId,
    email,
    zone: matchedZone.name
  };
};

const login = async (credentials) => {
  const { email, password } = credentials;

  // 1. Login via Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error('Invalid email or password');
  }

  const authUserId = data.user.id;

  // 2. Get profile data
  const profile = await getProfileForLogin(authUserId, data.user.email);

  // 3. Generate JWT
  const token = jwt.sign(
    {
      id: authUserId,
      profileId: profile.id,
      role: profile.role,
      email: profile.email || data.user.email || null
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: profile
  };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.email) {
    throw new Error('User profile not found');
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword
  });

  if (verifyError) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (updateError) {
    console.error('Password Update Error:', updateError.message);
    throw new Error('Failed to update password');
  }
};

const forgotPassword = async (email, redirectTo) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRedirect = String(redirectTo || '').trim();

  if (!normalizedEmail) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    throw new Error('Failed to verify email address');
  }

  if (!Array.isArray(profile) || !profile.length) {
    const err = new Error('No account found for this email');
    err.statusCode = 404;
    throw err;
  }

  const publicSupabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );

  const { error } = await publicSupabase.auth.resetPasswordForEmail(
    normalizedEmail,
    normalizedRedirect
      ? { redirectTo: normalizedRedirect }
      : undefined
  );

  if (error) {
    console.error('Forgot Password Error:', error.message);
    throw new Error('Failed to send password reset email');
  }

  return {
    email: normalizedEmail
  };
};

module.exports = { register, login, changePassword, forgotPassword };
