-- Create user_data table (JSONB storage for full app state)
CREATE TABLE IF NOT EXISTS public.user_data (
    user_id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert/update their own data
-- We use UPSERT logic in app, strictly matching user_id
CREATE POLICY "Users can manage own data" 
ON public.user_data 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant access (if needed for authenticated role - usually automatic)
GRANT ALL ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
