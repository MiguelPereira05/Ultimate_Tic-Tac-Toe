-- Friends table for managing friend relationships and requests
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate friend requests (either direction)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  -- Prevent self-friending
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS friends_user_id_idx ON friends(user_id);
CREATE INDEX IF NOT EXISTS friends_friend_id_idx ON friends(friend_id);
CREATE INDEX IF NOT EXISTS friends_status_idx ON friends(status);

-- Row Level Security (RLS) Policies
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users can view their own friend relationships (sent and received)
CREATE POLICY "Users can view their own friendships"
  ON friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests (insert)
CREATE POLICY "Users can send friend requests"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friend requests they received (accept/reject)
CREATE POLICY "Users can respond to friend requests"
  ON friends FOR UPDATE
  USING (auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete friendships"
  ON friends FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER friends_updated_at
  BEFORE UPDATE ON friends
  FOR EACH ROW
  EXECUTE FUNCTION update_friends_updated_at();
