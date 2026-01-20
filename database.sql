
-- Create the leaderboard table
CREATE TABLE IF NOT EXISTS public.game_leaderboard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_name TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    time_seconds FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.game_leaderboard ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read the leaderboard
CREATE POLICY "Allow public read access" ON public.game_leaderboard
    FOR SELECT USING (true);

-- Create a policy that allows anyone to insert their score
CREATE POLICY "Allow public insert access" ON public.game_leaderboard
    FOR INSERT WITH CHECK (true);

-- Index for performance on leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.game_leaderboard (attempts ASC, time_seconds ASC);
