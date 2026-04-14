const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
};

// 🔥 Debug (temporary)
console.log("ENV CHECK:");
console.log("SUPABASE_URL:", env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_KEY EXISTS:", !!env.SUPABASE_SERVICE_KEY);

module.exports = { env };

