-- Create suggestions table
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, reviewed, implemented, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own suggestions
CREATE POLICY "Users can insert their own suggestions" 
ON public.suggestions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own suggestions (optional, but good for history)
CREATE POLICY "Users can view their own suggestions" 
ON public.suggestions FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Only service role/admins can view all (handled by service role key usually, or specific admin policy)
-- For now, basic user privacy is the priority.
