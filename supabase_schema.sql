-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'referee', 'coach', 'player', 'user');
CREATE TYPE entity_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE team_category AS ENUM ('Junior', 'Youth', 'Collegiate', 'Open');
CREATE TYPE player_position AS ENUM ('Striker', 'Defender', 'Goalkeeper', 'Flex');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'paused', 'finished');
CREATE TYPE penalty_type AS ENUM ('Minor', 'Major', 'Technical');
CREATE TYPE announcement_category AS ENUM ('General', 'Tournament', 'Rule Update', 'Maintenance', 'Urgent');
CREATE TYPE tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE matchmaking_type AS ENUM ('auto', 'manual');

-- Users Table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  team_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Teams Table
CREATE TABLE public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category team_category NOT NULL,
  coach_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  logo_url TEXT,
  status entity_status DEFAULT 'pending'::entity_status NOT NULL,
  owner_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Players Table
CREATE TABLE public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  number INTEGER NOT NULL,
  position player_position NOT NULL,
  student_id TEXT,
  date_of_birth DATE,
  status entity_status DEFAULT 'pending'::entity_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Announcements Table
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category announcement_category NOT NULL,
  author TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tournaments Table
CREATE TABLE public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category team_category,
  status tournament_status DEFAULT 'draft'::tournament_status NOT NULL,
  matchmaking_type matchmaking_type,
  team_quota INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  ,group_stage_enabled BOOLEAN DEFAULT FALSE NOT NULL
  ,group_count INTEGER
  ,qualifiers_per_group INTEGER
  ,group_scoring_system TEXT DEFAULT 'three-one-zero'
  ,logo_url TEXT
  ,banner_url TEXT
  ,half_duration_minutes INTEGER DEFAULT 5 NOT NULL
  ,halftime_duration_minutes INTEGER DEFAULT 2 NOT NULL
  ,warmup_duration_minutes INTEGER DEFAULT 5 NOT NULL
  ,overtime_duration_minutes INTEGER DEFAULT 3 NOT NULL
);

-- Tournament Teams (Many-to-Many)
CREATE TABLE public.tournament_teams (
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, team_id)
);

-- Tournament Matches
CREATE TABLE public.tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  slot INTEGER NOT NULL,
  team_a_id UUID REFERENCES public.teams(id),
  team_b_id UUID REFERENCES public.teams(id),
  winner_id UUID REFERENCES public.teams(id),
  is_bye BOOLEAN DEFAULT FALSE NOT NULL,
  scheduled_date TEXT,
  scheduled_time TEXT
  ,phase TEXT DEFAULT 'knockout' NOT NULL
  ,group_number INTEGER
  ,result TEXT
);

-- Run these statements when upgrading an existing database created before group stages.
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS group_stage_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS group_count INTEGER;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS qualifiers_per_group INTEGER;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS half_duration_minutes INTEGER DEFAULT 5 NOT NULL;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS halftime_duration_minutes INTEGER DEFAULT 2 NOT NULL;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS warmup_duration_minutes INTEGER DEFAULT 5 NOT NULL;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS overtime_duration_minutes INTEGER DEFAULT 3 NOT NULL;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'knockout' NOT NULL;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS group_number INTEGER;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS group_scoring_system TEXT DEFAULT 'three-one-zero';

-- Match Slots
CREATE TABLE public.match_slots (
  slot_id INTEGER PRIMARY KEY,
  tournament_match_id UUID REFERENCES public.tournament_matches(id),
  team_a_name TEXT NOT NULL,
  team_b_name TEXT NOT NULL,
  score_a INTEGER DEFAULT 0 NOT NULL,
  score_b INTEGER DEFAULT 0 NOT NULL,
  status match_status DEFAULT 'scheduled'::match_status NOT NULL,
  elapsed_ms BIGINT DEFAULT 0 NOT NULL,
  running_since BIGINT,
  visible_on_scoreboard BOOLEAN DEFAULT TRUE NOT NULL,
  last_active_at BIGINT
);

-- Match Events
CREATE TABLE public.match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id INTEGER REFERENCES public.match_slots(slot_id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Penalties
CREATE TABLE public.penalties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id INTEGER REFERENCES public.match_slots(slot_id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  side TEXT NOT NULL, -- 'A' or 'B'
  type penalty_type NOT NULL,
  created_at BIGINT NOT NULL
);

-- Shared referee-created mock battles
CREATE TABLE public.mock_battles (
  id UUID PRIMARY KEY REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  red_team_name TEXT NOT NULL DEFAULT 'Red Team',
  blue_team_name TEXT NOT NULL DEFAULT 'Blue Team',
  created_by TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  target TEXT NOT NULL,
  category TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  details TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Read by everyone, update by themselves or admin
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Teams: Read by everyone, insert by coach/admin, update by owner/admin
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Coaches can insert teams" ON public.teams FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('coach', 'admin')));
CREATE POLICY "Team owners can update their teams" ON public.teams FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage all teams" ON public.teams FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Players: Read by everyone, insert by team owner/admin, update by team owner/admin
CREATE POLICY "Players are viewable by everyone" ON public.players FOR SELECT USING (true);
CREATE POLICY "Team owners can insert players" ON public.players FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()));
CREATE POLICY "Team owners can update players" ON public.players FOR UPDATE USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid()));
CREATE POLICY "Admins can manage all players" ON public.players FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Announcements: Read by everyone, manage by admin
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Tournaments and Matchmaking: Read by everyone, manage by admin
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournaments" ON public.tournaments FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tournament Teams are viewable by everyone" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournament teams" ON public.tournament_teams FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Tournament Matches are viewable by everyone" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage tournament matches" ON public.tournament_matches FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Referees can update tournament matches" ON public.tournament_matches FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'referee'));
CREATE POLICY "Referees can insert mock tournament matches" ON public.tournament_matches FOR INSERT WITH CHECK (phase = 'mock' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));

CREATE POLICY "Mock battles are viewable by referees" ON public.mock_battles FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));
CREATE POLICY "Referees can create mock battles" ON public.mock_battles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));

-- Live Matches & Slots: Read by everyone, manage by referee/admin
CREATE POLICY "Match slots are viewable by everyone" ON public.match_slots FOR SELECT USING (true);
CREATE POLICY "Referees can manage match slots" ON public.match_slots FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));

CREATE POLICY "Match events are viewable by everyone" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "Referees can insert match events" ON public.match_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));
CREATE POLICY "Referees can delete match events" ON public.match_events FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));

CREATE POLICY "Penalties are viewable by everyone" ON public.penalties FOR SELECT USING (true);
CREATE POLICY "Referees can insert penalties" ON public.penalties FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));
CREATE POLICY "Referees can delete penalties" ON public.penalties FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('referee', 'admin')));

-- Audit Logs: Insert by admin/system, Read by admin
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins and referees can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'referee')));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
    CASE
      WHEN COALESCE((new.raw_user_meta_data->>'role')::user_role, 'user'::user_role) = 'referee'::user_role
        THEN 'pending'
      ELSE 'active'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Initial Match Slots
INSERT INTO public.match_slots (slot_id, team_a_name, team_b_name) VALUES (1, 'TBD', 'TBD');
INSERT INTO public.match_slots (slot_id, team_a_name, team_b_name) VALUES (2, 'TBD', 'TBD');
