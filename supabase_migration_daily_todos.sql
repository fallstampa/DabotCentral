-- Create daily_todos table
CREATE TABLE IF NOT EXISTS daily_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_daily_todos_user_id ON daily_todos(user_id);

-- Enable Row Level Security
ALTER TABLE daily_todos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own todos
CREATE POLICY "Users can read own todos" ON daily_todos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own todos
CREATE POLICY "Users can insert own todos" ON daily_todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own todos
CREATE POLICY "Users can update own todos" ON daily_todos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own todos
CREATE POLICY "Users can delete own todos" ON daily_todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_daily_todos_updated_at_trigger
  BEFORE UPDATE ON daily_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_todos_updated_at();
