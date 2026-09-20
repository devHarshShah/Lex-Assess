import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm, useFieldArray, Controller, type Control } from 'react-hook-form'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { fetchVersionDetails, updateVersion } from '@/lib/question-papers'
import type { QuestionPaperVersion, QuestionPaper, SectionRules } from '@/lib/question-papers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { GripVertical, Trash2, Plus, Settings2, ChevronDown, ChevronUp, FileText, ShieldAlert, Loader2 } from 'lucide-react'

type QuestionType = 'MCQ' | 'SUBJECTIVE' | 'SUBJECTIVE_WITH_ANSWER'

interface Section {
  id?: string
  title: string
  description?: string
  rules: SectionRules
  questions: {
    id?: string
    type: QuestionType
    text: string
    marks: number
    timeLimitSeconds?: number
    options: { id: string; text: string }[]
    answer: string
    subQuestions?: any[]
  }[]
}

interface FormValues {
  timeLimitMinutes: number
  instructions: string
  sections: Section[]
}

const DEFAULT_RULES: SectionRules = {
  allowTabSwitching: false,
  allowExternalResources: false,
  maxViolations: 5,
  wordLimit: undefined,
  timeLimitSeconds: undefined,
  questionsToAttempt: undefined,
}

export function AdminPaperBuilderPage() {
  const { versionId } = useParams({ strict: false }) as { versionId: string }
  const [version, setVersion] = React.useState<(QuestionPaperVersion & { paper?: QuestionPaper }) | null>(null)
  const [activeTab, setActiveTab] = React.useState<'builder' | 'instructions'>('builder')
  const [isSaving, setIsSaving] = React.useState(false)

  const { control, handleSubmit, reset, getValues } = useForm<FormValues>({
    defaultValues: { timeLimitMinutes: 60, instructions: '', sections: [] }
  })

  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({
    control,
    name: 'sections'
  })

  const load = React.useCallback(async () => {
    try {
      const data = await fetchVersionDetails(versionId)
      setVersion(data)

      const mappedSections: Section[] = data.sections?.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        rules: { ...DEFAULT_RULES, ...(s.rules || {}) },
        questions: s.questions?.map(q => ({
          ...q,
          timeLimitSeconds: q.timeLimitSeconds ?? undefined,
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer || '',
          subQuestions: q.subQuestions || []
        })) || []
      })) || []

      if (mappedSections.length === 0 && data.questions && data.questions.length > 0) {
        mappedSections.push({
          title: 'General',
          rules: { ...DEFAULT_RULES },
          questions: data.questions.map(q => ({
            ...q,
            timeLimitSeconds: q.timeLimitSeconds ?? undefined,
            options: Array.isArray(q.options) ? q.options : [],
            answer: q.answer || '',
            subQuestions: q.subQuestions || []
          }))
        })
      }

      reset({
        timeLimitMinutes: data.timeLimitMinutes,
        instructions: data.instructions || '',
        sections: mappedSections
      })
    } catch {
      toast.error('Failed to load version details')
    }
  }, [versionId, reset])

  React.useEffect(() => {
    void load()
  }, [load])

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const { source, destination, type } = result

    if (type === 'section') {
      moveSection(source.index, destination.index)
      return
    }

    if (type === 'question') {
      const sourceSectionIdx = parseInt(source.droppableId.replace('section-', ''))
      const destSectionIdx = parseInt(destination.droppableId.replace('section-', ''))
      const currentValues = getValues()
      const newSections = JSON.parse(JSON.stringify(currentValues.sections))
      const sourceSection = newSections[sourceSectionIdx]
      const destSection = newSections[destSectionIdx]
      if (sourceSection && destSection) {
        const [movedQuestion] = sourceSection.questions.splice(source.index, 1)
        if (movedQuestion) {
          destSection.questions.splice(destination.index, 0, movedQuestion)
          reset({ ...currentValues, sections: newSections })
        }
      }
    }
  }

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true)
    try {
      const payload = data.sections.map((s, sIdx) => {
        // Sanitize questions: Remove versionId, createdAt, updatedAt which are forbidden by backend DTO
        const sanitizedQuestions = s.questions.map((q, qIdx) => {
          const { 
            // @ts-ignore - these exist in the incoming data but we must strip them
            versionId: _vId, 
            // @ts-ignore
            createdAt: _cAt, 
            // @ts-ignore
            updatedAt: _uAt, 
            ...cleanQ 
          } = q;
          
          return {
            ...cleanQ,
            order: qIdx,
            options: q.type === 'MCQ' ? q.options : null,
            subQuestions: q.subQuestions ? q.subQuestions.map((sq: any, sqIdx: number) => {
              const { versionId: _svId, createdAt: _scAt, updatedAt: _suAt, parentId: _pId, ...cleanSq } = sq;
              return { ...cleanSq, order: sqIdx };
            }) : undefined
          };
        });

        const { 
          // @ts-ignore
          versionId: _svId, 
          // @ts-ignore
          createdAt: _scAt, 
          // @ts-ignore
          updatedAt: _suAt, 
          ...cleanS 
        } = s;

        return {
          ...cleanS,
          order: sIdx,
          rules: s.rules,
          questions: sanitizedQuestions
        };
      });

      await updateVersion(versionId, {
        timeLimitMinutes: data.timeLimitMinutes,
        instructions: data.instructions,
        sections: payload
      });
      toast.success('Saved successfully');
      await load();
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || 'Failed to save';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSaving(false)
    }
  };

  const addSection = () => {
    appendSection({ title: 'New Section', rules: { ...DEFAULT_RULES }, questions: [] })
  }

  if (!version) return <div className="p-8">Loading...</div>

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Main Canvas */}
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{version.paper?.title} - {version.versionName}</h2>
            <p className="text-muted-foreground">Status: {version.status}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('builder')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'builder' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <FileText size={14} /> Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'instructions' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <ShieldAlert size={14} /> Instructions
              </button>
            </div>
            {activeTab === 'builder' && (
              <Button type="button" onClick={addSection} variant="outline" size="sm">
                <Plus size={16} className="mr-2" /> Add Section
              </Button>
            )}
          </div>
        </div>

        {/* Instructions Editor Tab */}
        {activeTab === 'instructions' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert size={18} /> Paper Instructions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These instructions will be displayed to students on a dedicated page before they start the assessment.
                You can use Markdown formatting.
              </p>
            </CardHeader>
            <CardContent>
              <Controller
                control={control}
                name="instructions"
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder={`# Assessment Instructions

## Overview
This paper tests your knowledge of...

## Section A — Knowledge Test
- Closed-book section
- 60 seconds per question
- No tab switching allowed

## Section B — Research & Analysis
- Open-book section
- Research is encouraged
- Max 400 words per answer`}
                    className="min-h-[500px] font-mono text-sm"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports Markdown. The rendered version will be shown to students before they begin.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Builder Tab */}
        {activeTab === 'builder' && (
          <>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="all-sections" type="section">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8">
                    {sections.map((section, sIdx) => (
                      <Draggable key={section.id} draggableId={section.id} index={sIdx}>
                        {(provided) => (
                          <PaperSectionComponent
                            key={section.id}
                            provided={provided}
                            control={control}
                            sIdx={sIdx}
                            removeSection={removeSection}
                            getValues={getValues}
                            reset={reset}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {sections.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                No sections added yet. Click "Add Section" to begin.
              </div>
            )}
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="w-64 flex-shrink-0">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg">Paper Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Controller
                control={control}
                name="timeLimitMinutes"
                render={({ field }) => (
                  <Input
                    type="number"
                    {...field}
                    onChange={e => field.onChange(parseInt(e.target.value))}
                    className="mt-1"
                  />
                )}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                value={version.status}
                onChange={async (e) => {
                  try {
                    await updateVersion(versionId, { status: e.target.value })
                    toast.success('Status updated')
                    await load()
                  } catch {
                    toast.error('Failed to update status')
                  }
                }}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" className="w-full" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Paper
              </Button>
              <Button type="button" className="w-full" variant="outline" onClick={() => load()}>Discard Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SectionRulesPanel({ control, sIdx }: { control: Control<FormValues>, sIdx: number }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Settings2 size={14} /> Section Rules & Proctoring
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-background">
          {/* Tab Switching */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow Tab Switching</p>
              <p className="text-xs text-muted-foreground">Students can switch tabs during this section</p>
            </div>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.allowTabSwitching`}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${field.value ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              )}
            />
          </div>

          {/* External Resources */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow External Resources</p>
              <p className="text-xs text-muted-foreground">Internet & reference materials permitted</p>
            </div>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.allowExternalResources`}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${field.value ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${field.value ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              )}
            />
          </div>

          {/* Max Violations */}
          <div>
            <Label className="text-sm">Max Violations Before Auto-Cancel</Label>
            <p className="text-xs text-muted-foreground mb-1">Section cancelled after this many violations (0 = disabled)</p>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.maxViolations`}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? 5}
                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              )}
            />
          </div>

          {/* Per-question time limit */}
          <div>
            <Label className="text-sm">Per-Question Time Limit (seconds)</Label>
            <p className="text-xs text-muted-foreground mb-1">Override individual question time limits (blank = use question setting)</p>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.timeLimitSeconds`}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 60"
                  className="h-8 text-sm"
                />
              )}
            />
          </div>

          {/* Word limit */}
          <div>
            <Label className="text-sm">Word Limit Per Answer</Label>
            <p className="text-xs text-muted-foreground mb-1">Answers truncated at this word count (blank = no limit)</p>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.wordLimit`}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 400"
                  className="h-8 text-sm"
                />
              )}
            />
          </div>

          {/* Questions to Attempt */}
          <div>
            <Label className="text-sm">Questions to Attempt</Label>
            <p className="text-xs text-muted-foreground mb-1">Required number of questions (0 or blank = all compulsory)</p>
            <Controller
              control={control}
              name={`sections.${sIdx}.rules.questionsToAttempt`}
              render={({ field }) => (
                <Input
                  type="number"
                  min={0}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                  placeholder="e.g. 4 (0 for all)"
                  className="h-8 text-sm"
                />
              )}
            />
          </div>

          {/* Resources */}
          <div className="space-y-3 pt-2 border-t mt-2">
            <div>
              <Label className="text-sm flex items-center gap-2 text-green-700">
                <Plus size={12} /> Allowed Resources
              </Label>
              <p className="text-[10px] text-muted-foreground mb-1">Specific websites or tools permitted (comma-separated)</p>
              <Controller
                control={control}
                name={`sections.${sIdx}.rules.allowedResources`}
                render={({ field }) => (
                  <Input
                    value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) {
                        field.onChange([]);
                        return;
                      }
                      // Split by comma and trim each part, but don't filter Boolean yet
                      // so we don't lose the trailing comma while the user is typing.
                      field.onChange(val.split(',').map(s => s.trimStart()));
                    }}
                    placeholder="e.g. IndianKanoon, SCC Online, ChatGPT"
                    className="h-8 text-sm"
                  />
                )}
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2 text-red-700">
                <Trash2 size={12} /> Blocked Resources
              </Label>
              <p className="text-[10px] text-muted-foreground mb-1">Explicitly forbidden websites or tools (comma-separated)</p>
              <Controller
                control={control}
                name={`sections.${sIdx}.rules.blockedResources`}
                render={({ field }) => (
                  <Input
                    value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) {
                        field.onChange([]);
                        return;
                      }
                      field.onChange(val.split(',').map(s => s.trimStart()));
                    }}
                    placeholder="e.g. WhatsApp, Slack, Personal Notes"
                    className="h-8 text-sm"
                  />
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PaperSectionComponent({ provided, control, sIdx, removeSection, getValues, reset }: {
  provided: any,
  control: Control<FormValues>,
  sIdx: number,
  removeSection: (idx: number) => void,
  getValues: any,
  reset: any
}) {
  const { fields: questions, append, remove } = useFieldArray({
    control,
    name: `sections.${sIdx}.questions` as any
  })

  const addQuestion = (type: QuestionType) => {
    append({
      type,
      text: '',
      marks: 1,
      options: type === 'MCQ' ? [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }] : [],
      answer: '',
      subQuestions: []
    })
  }

  return (
    <div ref={provided.innerRef} {...provided.draggableProps} className="bg-muted/10 border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2 bg-white p-3 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3 flex-1">
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical size={20} />
          </div>
          <Controller
            control={control}
            name={`sections.${sIdx}.title`}
            render={({ field }) => (
              <Input 
                {...field} 
                className="font-bold text-lg border-none focus-visible:ring-0 h-auto p-0" 
                placeholder="Section Title"
                onChange={(e) => {
                  field.onChange(e)
                  const val = e.target.value.toUpperCase()
                  if (val === 'SECTION A' || val === 'SECTION A — MULTIPLE CHOICE QUESTIONS') {
                    const currentValues = getValues()
                    const newSections = [...currentValues.sections]
                    newSections[sIdx].rules = { 
                      ...DEFAULT_RULES, 
                      allowTabSwitching: false, 
                      allowExternalResources: false,
                      maxViolations: 5,
                      timeLimitSeconds: 60
                    }
                    reset({ ...currentValues, sections: newSections })
                    toast.info('Applied SECTION A proctoring rules')
                  } else if (val === 'SECTION B' || val === 'SECTION B — DESCRIPTIVE / APPLIED QUESTIONS') {
                    const currentValues = getValues()
                    const newSections = [...currentValues.sections]
                    newSections[sIdx].rules = { 
                      ...DEFAULT_RULES, 
                      allowTabSwitching: true, 
                      allowExternalResources: true,
                      wordLimit: 400
                    }
                    reset({ ...currentValues, sections: newSections })
                    toast.info('Applied SECTION B research rules')
                  }
                }}
              />
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const title = getValues(`sections.${sIdx}.title`).toUpperCase()
              const currentValues = getValues()
              const newSections = [...currentValues.sections]
              if (title.includes('A')) {
                newSections[sIdx].rules = { ...DEFAULT_RULES, allowTabSwitching: false, allowExternalResources: false, maxViolations: 5, timeLimitSeconds: 60 }
                toast.success('Applied Section A rules')
              } else {
                newSections[sIdx].rules = { ...DEFAULT_RULES, allowTabSwitching: true, allowExternalResources: true, wordLimit: 400 }
                toast.success('Applied Section B rules')
              }
              reset({ ...currentValues, sections: newSections })
            }}
            className="text-primary h-8 px-2 text-xs"
          >
            Apply Format
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeSection(sIdx)} className="text-destructive">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Section Rules Panel */}
      <SectionRulesPanel control={control} sIdx={sIdx} />

      <Droppable droppableId={`section-${sIdx}`} type="question">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 min-h-[50px] mt-4">
            {questions.map((field: any, qIdx) => (
              <Draggable key={field.id} draggableId={field.id} index={qIdx}>
                {(provided) => (
                  <Card ref={provided.innerRef} {...provided.draggableProps}>
                    <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                          <GripVertical size={20} />
                        </div>
                        <span className="font-semibold text-sm">Question {qIdx + 1} ({field.type})</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(qIdx)} className="text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label>Question Text</Label>
                          <Controller
                            control={control}
                            name={`sections.${sIdx}.questions.${qIdx}.text`}
                            render={({ field }) => (
                              <Textarea {...field} placeholder="Enter question..." className="mt-1" />
                            )}
                          />
                        </div>
                        <div className="w-24">
                          <Label>Marks</Label>
                          <Controller
                            control={control}
                            name={`sections.${sIdx}.questions.${qIdx}.marks`}
                            render={({ field }) => (
                              <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="mt-1" />
                            )}
                          />
                        </div>
                        <div className="w-32">
                          <Label>Time Limit (sec)</Label>
                          <Controller
                            control={control}
                            name={`sections.${sIdx}.questions.${qIdx}.timeLimitSeconds`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="mt-1"
                                placeholder="Optional"
                              />
                            )}
                          />
                        </div>
                      </div>

                      {field.type === 'MCQ' && (
                        <div className="space-y-2 mt-4 bg-muted/30 p-4 rounded-md">
                          <Label>Options & Correct Answer</Label>
                          <div className="space-y-2">
                            {field.options.map((opt: any, optIdx: number) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <span className="font-semibold w-6">{opt.id}.</span>
                                <Controller
                                  control={control}
                                  name={`sections.${sIdx}.questions.${qIdx}.options.${optIdx}.text`}
                                  render={({ field }) => (
                                    <Input {...field} placeholder={`Option ${opt.id}`} />
                                  )}
                                />
                                <Controller
                                  control={control}
                                  name={`sections.${sIdx}.questions.${qIdx}.answer`}
                                  render={({ field: radioField }) => (
                                    <input
                                      type="radio"
                                      checked={radioField.value === opt.id}
                                      onChange={() => radioField.onChange(opt.id)}
                                      className="ml-4 w-4 h-4"
                                      title="Mark as correct answer"
                                    />
                                  )}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {field.type === 'SUBJECTIVE_WITH_ANSWER' && (
                        <div className="mt-4">
                          <Label>Reference Answer (Optional)</Label>
                          <Controller
                            control={control}
                            name={`sections.${sIdx}.questions.${qIdx}.answer`}
                            render={({ field }) => (
                              <Textarea {...field} placeholder="Provide an expected answer or key points..." className="mt-1" />
                            )}
                          />
                        </div>
                      )}

                      {/* Subquestions Editor */}
                      <div className="mt-4 border rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Subquestions ({(field.subQuestions || []).length})
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const vals = getValues()
                              const sqs = vals.sections[sIdx].questions[qIdx].subQuestions || []
                              sqs.push({ type: 'SUBJECTIVE', text: '', marks: 5, options: [], answer: '' })
                              vals.sections[sIdx].questions[qIdx].subQuestions = sqs
                              reset({ ...vals })
                            }}
                          >
                            <Plus size={12} className="mr-1" /> Add Subquestion
                          </Button>
                        </div>
                        {(field.subQuestions || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic px-4 py-3">No subquestions. Click "Add Subquestion" to add one.</p>
                        ) : (
                          <div className="divide-y">
                            {(field.subQuestions || []).map((sq: any, sqIdx: number) => (
                              <div key={sq.id || sqIdx} className="p-4 bg-background space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-muted-foreground uppercase">
                                    {String.fromCharCode(97 + sqIdx)})
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive"
                                    onClick={() => {
                                      const vals = getValues()
                                      const sqs = [...(vals.sections[sIdx].questions[qIdx].subQuestions || [])]
                                      sqs.splice(sqIdx, 1)
                                      vals.sections[sIdx].questions[qIdx].subQuestions = sqs
                                      reset({ ...vals })
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </div>
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <Controller
                                      control={control}
                                      name={`sections.${sIdx}.questions.${qIdx}.subQuestions.${sqIdx}.text` as any}
                                      render={({ field: f }) => (
                                        <Textarea
                                          {...f}
                                          placeholder="Subquestion text..."
                                          className="min-h-[80px] text-sm"
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="w-20">
                                    <Label className="text-xs">Marks</Label>
                                    <Controller
                                      control={control}
                                      name={`sections.${sIdx}.questions.${qIdx}.subQuestions.${sqIdx}.marks` as any}
                                      render={({ field: f }) => (
                                        <Input
                                          type="number"
                                          {...f}
                                          onChange={e => f.onChange(parseInt(e.target.value) || 0)}
                                          className="mt-1 h-8 text-sm"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('MCQ')}>
          <Plus size={14} className="mr-1" /> MCQ
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('SUBJECTIVE')}>
          <Plus size={14} className="mr-1" /> Subjective
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion('SUBJECTIVE_WITH_ANSWER')}>
          <Plus size={14} className="mr-1" /> Subj. w/ Answer
        </Button>
      </div>
    </div>
  )
}
