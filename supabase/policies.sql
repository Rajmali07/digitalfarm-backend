-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Farmers can view own animals" ON animals
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Farmers can insert own animals" ON animals
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Farmers can update own animals" ON animals
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Farmers can insert vaccinations for own animals" ON vaccinations
FOR INSERT WITH CHECK (
  animal_id IN (SELECT id FROM animals WHERE user_id = auth.uid())
);

-- Add policies for other tables

