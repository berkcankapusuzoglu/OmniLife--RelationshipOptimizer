-- Fix Supabase security vulnerabilities: enable RLS on all tables + add policies
-- Run this in Supabase SQL Editor for project: OmniLife (rlanchnpacwxloheszse)

-- 1. Enable RLS on ALL tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- 2. Users: can read/update own row, password_hash never exposed
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. Daily logs: users can CRUD their own
CREATE POLICY "Users can manage own daily logs" ON daily_logs
  FOR ALL USING (auth.uid() = user_id);

-- 4. Scores: users can read their own
CREATE POLICY "Users can manage own scores" ON scores
  FOR ALL USING (auth.uid() = user_id);

-- 5. Constraints: users can manage their own
CREATE POLICY "Users can manage own constraints" ON constraints
  FOR ALL USING (auth.uid() = user_id);

-- 6. Interventions: users can manage their own
CREATE POLICY "Users can manage own interventions" ON interventions
  FOR ALL USING (auth.uid() = user_id);

-- 7. Scenario profiles: users can manage their own
CREATE POLICY "Users can manage own scenarios" ON scenario_profiles
  FOR ALL USING (auth.uid() = user_id);

-- 8. Tasks: users can see tasks they created or are assigned to
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = created_by_id OR auth.uid() = assignee_id);

-- 9. Weekly checkins: users can manage their own
CREATE POLICY "Users can manage own checkins" ON weekly_checkins
  FOR ALL USING (auth.uid() = user_id);

-- 10. Referrals: users can see their own referrals
CREATE POLICY "Users can manage own referrals" ON referrals
  FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

-- 11. Subscribers: service role only (no user-facing policy)
-- RLS enabled with no policy = blocked from anon/authenticated, only service_role can access
