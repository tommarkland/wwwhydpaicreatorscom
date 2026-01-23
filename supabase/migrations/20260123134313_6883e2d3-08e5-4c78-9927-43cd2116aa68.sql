-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    company_name TEXT,
    logo_url TEXT,
    brand_primary_color TEXT DEFAULT '#3B82F6',
    brand_secondary_color TEXT DEFAULT '#1E40AF',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create evaluations table
CREATE TABLE public.evaluations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_name TEXT NOT NULL,
    creator_urls TEXT,
    region TEXT NOT NULL,
    category TEXT NOT NULL,
    following_size BIGINT,
    cost DECIMAL(12, 2),
    average_views BIGINT,
    content_quality INTEGER CHECK (content_quality >= 1 AND content_quality <= 10),
    quality_score DECIMAL(5, 2),
    brand_safety_score DECIMAL(5, 2),
    brand_safety_issues JSONB DEFAULT '[]'::jsonb,
    brand_safety_summary TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on evaluations
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Evaluations policies
CREATE POLICY "Users can view their own evaluations" 
ON public.evaluations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluations" 
ON public.evaluations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations" 
ON public.evaluations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluations" 
ON public.evaluations FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();