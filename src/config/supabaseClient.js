const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

if (!env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL in backend environment');
}

if (!env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase service key. Set SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
}

// Use SERVICE ROLE KEY for backend (IMPORTANT)
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase };