-- Core tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'farmer')) DEFAULT 'farmer',
  farm_name TEXT,
  location TEXT,
  farm_size INTEGER,
  farm_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc' :: text, now()) NOT NULL
);

CREATE TABLE animals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  health_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc' :: text, now()) NOT NULL
);

CREATE TABLE vaccinations (
  id BIGSERIAL PRIMARY KEY,
  animal_id BIGINT REFERENCES animals(id),
  vaccine_type TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT
);

-- Add more tables for biosecurity, complaints, blogs etc as needed

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

