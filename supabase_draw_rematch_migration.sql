-- Migration to add draw and rematch functionality to games table

-- Add is_draw column to track draw games
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS is_draw BOOLEAN DEFAULT FALSE;

-- Add rematch_requested_by column to track rematch requests
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS rematch_requested_by UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_rematch_requested 
ON games(rematch_requested_by) 
WHERE rematch_requested_by IS NOT NULL;

-- Update RLS policies to allow rematch updates (if not already covered)
-- Users should be able to update rematch_requested_by for games they're part of
CREATE POLICY IF NOT EXISTS "Users can request rematch for their games"
ON games FOR UPDATE
USING (
  auth.uid() = player_x_id OR 
  auth.uid() = player_o_id
)
WITH CHECK (
  auth.uid() = player_x_id OR 
  auth.uid() = player_o_id
);
