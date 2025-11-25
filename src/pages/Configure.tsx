import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Presentation, Plus, Trash2, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Configure() {
  const [documentType, setDocumentType] = useState<'docx' | 'pptx'>('docx');
  const [topic, setTopic] = useState('');
  const [sections, setSections] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addSection = () => {
    setSections([...sections, '']);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const updateSection = (index: number, value: string) => {
    const newSections = [...sections];
    newSections[index] = value;
    setSections(newSections);
  };

  const generateOutline = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-outline', {
        body: { topic, documentType },
      });

      if (error) throw error;
      setSections(data.outline);
      toast.success('Outline generated successfully!');
    } catch (error) {
      console.error('Error generating outline:', error);
      toast.error('Failed to generate outline');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim() || sections.some(s => !s.trim())) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        toast.error('You must be logged in to create a project');
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          document_type: documentType,
          topic: topic.trim(),
          status: 'draft' as const,
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      const sectionsData = sections.map((title, index) => ({
        project_id: project.id,
        title: title.trim(),
        order_index: index,
      }));

      const { error: sectionsError } = await supabase
        .from('sections')
        .insert(sectionsData);

      if (sectionsError) throw sectionsError;

      toast.success('Project created successfully!');
      navigate(`/editor/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Configure New Project</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Document Type</CardTitle>
              <CardDescription>Choose the type of document you want to create</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={documentType} onValueChange={(value) => setDocumentType(value as 'docx' | 'pptx')}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Label
                    htmlFor="docx"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-6 transition-colors ${
                      documentType === 'docx' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="docx" id="docx" className="sr-only" />
                    <FileText className="mb-3 h-12 w-12 text-primary" />
                    <span className="font-semibold">Word Document</span>
                    <span className="mt-1 text-sm text-muted-foreground">.docx format</span>
                  </Label>
                  <Label
                    htmlFor="pptx"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-6 transition-colors ${
                      documentType === 'pptx' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="pptx" id="pptx" className="sr-only" />
                    <Presentation className="mb-3 h-12 w-12 text-accent" />
                    <span className="font-semibold">PowerPoint</span>
                    <span className="mt-1 text-sm text-muted-foreground">.pptx format</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Topic</CardTitle>
              <CardDescription>What is the main subject of your document?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., A market analysis of the EV industry in 2025"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[100px]"
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{documentType === 'docx' ? 'Section Outline' : 'Slide Titles'}</CardTitle>
                  <CardDescription>
                    {documentType === 'docx' 
                      ? 'Define the sections for your Word document'
                      : 'Specify titles for each PowerPoint slide'}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={generateOutline} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Suggest
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((section, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={documentType === 'docx' ? `Section ${index + 1} title` : `Slide ${index + 1} title`}
                    value={section}
                    onChange={(e) => updateSection(index, e.target.value)}
                    required
                  />
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSection} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add {documentType === 'docx' ? 'Section' : 'Slide'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
