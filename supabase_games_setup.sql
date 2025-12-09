-- Games table for multiplayer matches
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_x_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_o_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_turn TEXT NOT NULL DEFAULT 'X' CHECK (current_turn IN ('X', 'O')),
  game_state JSONB NOT NULL DEFAULT '{"boards": [], "activeBoard": null, "miniBoardWinners": []}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS games_player_x_id_idx ON games(player_x_id);
CREATE INDEX IF NOT EXISTS games_player_o_id_idx ON games(player_o_id);
CREATE INDEX IF NOT EXISTS games_status_idx ON games(status);
CREATE INDEX IF NOT EXISTS games_updated_at_idx ON games(updated_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Players can view games they're part of
CREATE POLICY "Players can view their games"
  ON games FOR SELECT
  USING (auth.uid() = player_x_id OR auth.uid() = player_o_id);

-- Players can create games (send challenges)
CREATE POLICY "Players can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = player_x_id);

-- Players can update games they're part of (make moves)
CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (auth.uid() = player_x_id OR auth.uid() = player_o_id);

-- Players can delete their own pending games (cancel challenges)
CREATE POLICY "Players can cancel pending games"
  ON games FOR DELETE
  USING (auth.uid() = player_x_id AND status = 'pending');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;
