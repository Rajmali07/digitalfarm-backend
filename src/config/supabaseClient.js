const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');
console.log("URL:", env.SUPABASE_URL);
console.log("KEY:", env.SUPABASE_SERVICE_KEY?.slice(0, 20));

// Use SERVICE ROLE KEY for backend (IMPORTANT)
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY
);

module.exports = { supabase };