-- Create a table for shared reports with public access tokens
CREATE TABLE public.shared_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Create index for fast token lookups
CREATE INDEX idx_shared_reports_token ON public.shared_reports(token);

-- Enable RLS
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Users can create shares for their own evaluations
CREATE POLICY "Users can create their own shares"
ON public.shared_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own shares
CREATE POLICY "Users can view their own shares"
ON public.shared_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.shared_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Public access to shared reports via token (for non-authenticated users)
CREATE POLICY "Anyone can view shared reports by token"
ON public.shared_reports
FOR SELECT
USING (true);