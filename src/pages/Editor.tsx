import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Loader2, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { saveAs } from 'file-saver';

interface Section {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
  is_generated: boolean;
}

interface Project {
  id: string;
  document_type: 'docx' | 'pptx';
  topic: string;
  status: string;
}

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState<string | null>(null);
  const [refinementPrompts, setRefinementPrompts] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData as Project);

      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .eq('project_id', id)
        .order('order_index');

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const generateAllContent = async () => {
    if (!project) return;

    setGenerating(true);
    try {
      await supabase
        .from('projects')
        .update({ status: 'generating' })
        .eq('id', id);

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          projectId: id,
          topic: project.topic,
          documentType: project.document_type,
          sections: sections.map(s => ({ id: s.id, title: s.title })),
        },
      });

      if (error) throw error;

      await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', id);

      loadProject();
      toast.success('Content generated successfully!');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
      await supabase
        .from('projects')
        .update({ status: 'draft' })
        .eq('id', id);
    } finally {
      setGenerating(false);
    }
  };

  const refineSection = async (sectionId: string) => {
    const prompt = refinementPrompts[sectionId];
    if (!prompt?.trim()) {
      toast.error('Please enter a refinement prompt');
      return;
    }

    setRefining(sectionId);
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const { data, error } = await supabase.functions.invoke('refine-content', {
        body: {
          sectionId,
          prompt,
          currentContent: section.content,
          title: section.title,
        },
      });

      if (error) throw error;

      loadProject();
      setRefinementPrompts({ ...refinementPrompts, [sectionId]: '' });
      toast.success('Section refined successfully!');
    } catch (error) {
      console.error('Error refining section:', error);
      toast.error('Failed to refine section');
    } finally {
      setRefining(null);
    }
  };

  const handleFeedback = async (sectionId: string, isLiked: boolean) => {
    try {
      await supabase.from('feedback').upsert({
        section_id: sectionId,
        is_liked: isLiked,
      });
      toast.success('Feedback recorded');
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const saveComment = async (sectionId: string) => {
    const comment = comments[sectionId];
    if (!comment?.trim()) return;

    try {
      await supabase.from('feedback').upsert({
        section_id: sectionId,
        comment: comment.trim(),
      });
      toast.success('Comment saved');
    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    }
  };

  const exportDocument = async () => {
    if (!project) return;

    try {
      if (project.document_type === 'docx') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: project.topic,
                heading: HeadingLevel.HEADING_1,
              }),
              ...sections.flatMap(section => [
                new Paragraph({
                  text: section.title,
                  heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                  children: [new TextRun(section.content || '')],
                }),
              ]),
            ],
          }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${project.topic}.docx`);
      } else {
        const pptx = new PptxGenJS();
        
        let titleSlide = pptx.addSlide();
        titleSlide.addText(project.topic, {
          x: 0.5,
          y: 2,
          w: '90%',
          h: 1.5,
          fontSize: 44,
          bold: true,
          align: 'center',
        });

        sections.forEach(section => {
          let slide = pptx.addSlide();
          slide.addText(section.title, {
            x: 0.5,
            y: 0.5,
            w: '90%',
            h: 1,
            fontSize: 32,
            bold: true,
          });
          slide.addText(section.content || '', {
            x: 0.5,
            y: 1.5,
            w: '90%',
            h: 4,
            fontSize: 16,
          });
        });

        await pptx.writeFile({ fileName: `${project.topic}.pptx` });
      }

      toast.success('Document exported successfully!');
    } catch (error) {
      console.error('Error exporting document:', error);
      toast.error('Failed to export document');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{project?.topic}</h1>
          </div>
          <div className="flex gap-2">
            {!sections.some(s => s.is_generated) && (
              <Button onClick={generateAllContent} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            )}
            {sections.some(s => s.content) && (
              <Button onClick={exportDocument}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {index + 1}. {section.title}
                  </span>
                  {section.content && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFeedback(section.id, true)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFeedback(section.id, false)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={section.content || 'Content will be generated...'}
                  readOnly
                  className="min-h-[200px] font-mono text-sm"
                />
                
                {section.content && (
                  <>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Enter refinement prompt (e.g., 'Make this more formal', 'Add more details')"
                        value={refinementPrompts[section.id] || ''}
                        onChange={(e) => setRefinementPrompts({
                          ...refinementPrompts,
                          [section.id]: e.target.value,
                        })}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => refineSection(section.id)}
                        disabled={refining === section.id}
                      >
                        {refining === section.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Refining...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Refine
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={comments[section.id] || ''}
                        onChange={(e) => setComments({
                          ...comments,
                          [section.id]: e.target.value,
                        })}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => saveComment(section.id)}
                      >
                        Save Comment
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
