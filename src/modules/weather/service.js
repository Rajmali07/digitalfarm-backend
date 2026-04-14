const axios = require('axios');
const { supabase } = require('../../config/supabaseClient');
const { env } = require('../../config/env');

const DEFAULT_EXTERNAL_FIELDS = {
  governmentAlertLevel: 'Low',
  nearbyInfections: 0
};

const getProfileLocation = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, address, state, district, village')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data;
};

const buildLocationCandidates = (profile) => {
  const address = String(profile.address || '').trim();
  const rawParts = [profile.village, profile.district, profile.state]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const candidates = [];

  if (address) {
    candidates.push(address);
    candidates.push(`${address}, IN`);
  }

  if (rawParts.length === 3) {
    candidates.push(`${rawParts[0]}, ${rawParts[1]}, ${rawParts[2]}, IN`);
  }
  if (rawParts.length >= 2) {
    candidates.push(`${rawParts.slice(-2).join(', ')}, IN`);
  }
  if (rawParts.length >= 1) {
    candidates.push(`${rawParts[0]}, IN`);
    candidates.push(`${rawParts[rawParts.length - 1]}, IN`);
  }

  return [...new Set(candidates)];
};

const geocodeLocation = async (candidates) => {
  for (const locationQuery of candidates) {
    const response = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: locationQuery,
        limit: 1,
        appid: env.WEATHER_API_KEY
      }
    });

    const [match] = response.data || [];

    if (match?.lat && match?.lon) {
      return {
        query: locationQuery,
        match
      };
    }
  }

  throw new Error('Unable to resolve farmer location for weather lookup');
};

const fetchCurrentWeather = async (lat, lon) => {
  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat,
      lon,
      appid: env.WEATHER_API_KEY,
      units: 'metric'
    }
  });

  return response.data;
};

const fetchWeatherForecast = async (lat, lon) => {
  const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
    params: {
      lat,
      lon,
      appid: env.WEATHER_API_KEY,
      units: 'metric'
    }
  });

  return response.data;
};

const mapForecastPayload = (forecastData) => {
  const forecastList = Array.isArray(forecastData?.list) ? forecastData.list : [];
  const byDate = new Map();

  forecastList.forEach((item) => {
    const timestamp = Number(item.dt ?? 0) * 1000;
    const date = new Date(timestamp);
    const dateKey = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);

    if (!dateKey || byDate.has(dateKey)) {
      return;
    }

    const sameDayItems = forecastList.filter((entry) => {
      const entryDate = new Date(Number(entry.dt ?? 0) * 1000);
      return !Number.isNaN(entryDate.getTime()) && entryDate.toISOString().slice(0, 10) === dateKey;
    });

    const preferred = sameDayItems.reduce((closest, candidate) => {
      const candidateHour = new Date(Number(candidate.dt ?? 0) * 1000).getHours();
      const closestHour = new Date(Number(closest.dt ?? 0) * 1000).getHours();
      return Math.abs(candidateHour - 12) < Math.abs(closestHour - 12) ? candidate : closest;
    }, sameDayItems[0]);

    byDate.set(dateKey, preferred);
  });

  return Array.from(byDate.values())
    .slice(0, 6)
    .map((item) => {
      const date = new Date(Number(item.dt ?? 0) * 1000);

      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        weatherCondition: item.weather?.[0]?.main || 'Clear',
        temperature: Math.round(item.main?.temp ?? 0)
      };
    });
};

const mapWeatherPayload = (weatherData, forecastData, geocodeData, profile) => ({
  cityName: weatherData.name || geocodeData.match.name || profile.village || profile.district || profile.state || profile.address || 'Unknown',
  temperature: Math.round(weatherData.main?.temp ?? 0),
  humidity: Number(weatherData.main?.humidity ?? 0),
  weatherCondition: weatherData.weather?.[0]?.main || 'Unknown',
  weatherDescription: weatherData.weather?.[0]?.description || '',
  windSpeed: Math.round(weatherData.wind?.speed ?? 0),
  minTemp: Math.round(weatherData.main?.temp_min ?? weatherData.main?.temp ?? 0),
  maxTemp: Math.round(weatherData.main?.temp_max ?? weatherData.main?.temp ?? 0),
  notes: `Live weather fetched for ${geocodeData.query}`,
  address: profile.address || null,
  state: profile.state || null,
  district: profile.district || null,
  village: profile.village || null,
  forecast: mapForecastPayload(forecastData),
  fetchedAt: new Date().toISOString(),
  ...DEFAULT_EXTERNAL_FIELDS
});

const saveWeather = async (userId, weather) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .insert([{
      farmer_id: userId,
      city: weather.cityName,
      temperature: weather.temperature,
      humidity: weather.humidity,
      condition: weather.weatherCondition,
      wind_speed: weather.windSpeed,
      min_temp: weather.minTemp,
      max_temp: weather.maxTemp
    }])
    .select()
    .single();

  if (error) throw error;

  return data;
};

const getLatestWeather = async (userId) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .select('*')
    .eq('farmer_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    cityName: data.city,
    temperature: data.temperature,
    humidity: data.humidity,
    weatherCondition: data.condition,
    windSpeed: data.wind_speed,
    minTemp: data.min_temp,
    maxTemp: data.max_temp,
    fetchedAt: data.created_at,
    notes: `Latest saved weather for ${data.city}`,
    ...DEFAULT_EXTERNAL_FIELDS
  };
};

const refreshCurrentWeather = async (userId) => {
  if (!env.WEATHER_API_KEY) {
    throw new Error('WEATHER_API_KEY is missing in backend environment');
  }

  const profile = await getProfileLocation(userId);
  const locationCandidates = buildLocationCandidates(profile);

  if (!locationCandidates.length) {
    throw new Error('Farmer profile is missing address and location details');
  }

  const geocodeData = await geocodeLocation(locationCandidates);
  const currentWeather = await fetchCurrentWeather(geocodeData.match.lat, geocodeData.match.lon);
  const forecastWeather = await fetchWeatherForecast(geocodeData.match.lat, geocodeData.match.lon);
  const mappedWeather = mapWeatherPayload(currentWeather, forecastWeather, geocodeData, profile);
  const saved = await saveWeather(userId, mappedWeather);

  return {
    weather: {
      ...mappedWeather,
      savedId: saved.id
    },
    saved
  };
};

module.exports = { saveWeather, getLatestWeather, refreshCurrentWeather };
