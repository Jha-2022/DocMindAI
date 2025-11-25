-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('docx', 'pptx')),
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sections table (handles both Word sections and PowerPoint slides)
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refinement history table
CREATE TABLE public.refinement_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  is_liked BOOLEAN,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refinement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sections
CREATE POLICY "Users can view sections of their projects"
  ON public.sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = sections.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sections in their projects"
  ON public.sections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = sections.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sections in their projects"
  ON public.sections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = sections.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sections in their projects"
  ON public.sections FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = sections.project_id
    AND projects.user_id = auth.uid()
  ));

-- RLS Policies for refinement_history
CREATE POLICY "Users can view refinement history of their sections"
  ON public.refinement_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sections
    JOIN public.projects ON projects.id = sections.project_id
    WHERE sections.id = refinement_history.section_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create refinement history for their sections"
  ON public.refinement_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sections
    JOIN public.projects ON projects.id = sections.project_id
    WHERE sections.id = refinement_history.section_id
    AND projects.user_id = auth.uid()
  ));

-- RLS Policies for feedback
CREATE POLICY "Users can view feedback on their sections"
  ON public.feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sections
    JOIN public.projects ON projects.id = sections.project_id
    WHERE sections.id = feedback.section_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create feedback on their sections"
  ON public.feedback FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sections
    JOIN public.projects ON projects.id = sections.project_id
    WHERE sections.id = feedback.section_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update feedback on their sections"
  ON public.feedback FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.sections
    JOIN public.projects ON projects.id = sections.project_id
    WHERE sections.id = feedback.section_id
    AND projects.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_sections_project_id ON public.sections(project_id);
CREATE INDEX idx_sections_order ON public.sections(project_id, order_index);
CREATE INDEX idx_refinement_history_section_id ON public.refinement_history(section_id);
CREATE INDEX idx_feedback_section_id ON public.feedback(section_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();