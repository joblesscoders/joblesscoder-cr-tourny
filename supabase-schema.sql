-- Clash Royale Tournament Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    rules JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('setup', 'league', 'playoffs', 'completed')),
    current_phase TEXT CHECK (current_phase IN ('league', 'quarter', 'semi', 'final')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_tag TEXT,
    seed_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League matches table
CREATE TABLE league_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL,
    player1_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League standings table
CREATE TABLE league_standings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    crowns_for INTEGER DEFAULT 0,
    crowns_against INTEGER DEFAULT 0,
    crown_difference INTEGER DEFAULT 0,
    UNIQUE(tournament_id, player_id)
);

-- Playoff matches table
CREATE TABLE playoff_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round TEXT NOT NULL CHECK (round IN ('quarter', 'semi', 'final')),
    match_number INTEGER NOT NULL,
    player1_id UUID REFERENCES players(id) ON DELETE CASCADE,
    player2_id UUID REFERENCES players(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES players(id),
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_league_matches_tournament ON league_matches(tournament_id);
CREATE INDEX idx_league_standings_tournament ON league_standings(tournament_id);
CREATE INDEX idx_playoff_matches_tournament ON playoff_matches(tournament_id);
CREATE INDEX idx_playoff_matches_round ON playoff_matches(round);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_league_matches_updated_at BEFORE UPDATE ON league_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playoff_matches_updated_at BEFORE UPDATE ON playoff_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_matches ENABLE ROW LEVEL SECURITY;

-- Public read access policies (anyone can view tournaments)
CREATE POLICY "Public tournaments are viewable by everyone" ON tournaments
    FOR SELECT USING (true);

CREATE POLICY "Public players are viewable by everyone" ON players
    FOR SELECT USING (true);

CREATE POLICY "Public league matches are viewable by everyone" ON league_matches
    FOR SELECT USING (true);

CREATE POLICY "Public league standings are viewable by everyone" ON league_standings
    FOR SELECT USING (true);

CREATE POLICY "Public playoff matches are viewable by everyone" ON playoff_matches
    FOR SELECT USING (true);

-- Admin write access policies (for now, anyone can write - you can add auth later)
CREATE POLICY "Anyone can insert tournaments" ON tournaments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update tournaments" ON tournaments
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert players" ON players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update players" ON players
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete players" ON players
    FOR DELETE USING (true);

CREATE POLICY "Anyone can insert league matches" ON league_matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update league matches" ON league_matches
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert league standings" ON league_standings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update league standings" ON league_standings
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert playoff matches" ON playoff_matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update playoff matches" ON playoff_matches
    FOR UPDATE USING (true);