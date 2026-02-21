-- 1. Add email column to students table
ALTER TABLE public.students 
ADD COLUMN email text;

-- 2. Create shared links table for secure URL sharing
CREATE TABLE public.shared_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    roadmap_data jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

-- 3. Enable RLS on shared links
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for shared_links
-- Teachers can create and manage their own shared links
CREATE POLICY "Teachers can insert their own shared links" 
ON public.shared_links FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own shared links" 
ON public.shared_links FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own shared links" 
ON public.shared_links FOR DELETE 
USING (auth.uid() = teacher_id);

-- Anyone can view a shared link by its ID (Access control is handled at the application layer via OTP)
CREATE POLICY "Anyone can view a shared link" 
ON public.shared_links FOR SELECT 
USING (true);
