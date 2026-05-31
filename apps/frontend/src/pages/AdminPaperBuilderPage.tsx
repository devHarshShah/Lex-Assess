import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm, useFieldArray, Controller, type Control } from 'react-hook-form'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { fetchVersionDetails, updateVersion } from '@/lib/question-papers'
import type { QuestionPaperVersion, QuestionPaper } from '@/lib/question-papers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { GripVertical, Trash2, Plus } from 'lucide-react'

type QuestionType = 'MCQ' | 'SUBJECTIVE' | 'SUBJECTIVE_WITH_ANSWER'

interface Section {
  id?: string
  title: string
  description?: string
  questions: {
    id?: string
    type: QuestionType
    text: string
    marks: number
    timeLimitSeconds?: number
    options: { id: string; text: string }[]
    answer: string
  }[]
}

interface FormValues {
  timeLimitMinutes: number
  sections: Section[]
}

export function AdminPaperBuilderPage() {
  const { versionId } = useParams({ strict: false }) as { versionId: string }
  const [version, setVersion] = React.useState<(QuestionPaperVersion & { paper?: QuestionPaper }) | null>(null)
  
  const { control, handleSubmit, reset, getValues } = useForm<FormValues>({
    defaultValues: { timeLimitMinutes: 60, sections: [] }
  })

  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = useFieldArray({
    control,
    name: 'sections'
  })

  const load = React.useCallback(async () => {
    try {
      const data = await fetchVersionDetails(versionId)
      setVersion(data)

      // Map sections and their questions
      const mappedSections: Section[] = data.sections?.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        questions: s.questions?.map(q => ({
          ...q,
          timeLimitSeconds: q.timeLimitSeconds ?? undefined,
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer || ''
        })) || []
      })) || []

      // If no sections but there are questions (legacy), put them in a General section
      if (mappedSections.length === 0 && data.questions && data.questions.length > 0) {
        mappedSections.push({
          title: 'General',
          questions: data.questions.map(q => ({
            ...q,
            timeLimitSeconds: q.timeLimitSeconds ?? undefined,
            options: Array.isArray(q.options) ? q.options : [],
            answer: q.answer || ''
          }))
        })
      }

      reset({
        timeLimitMinutes: data.timeLimitMinutes,
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

    // Question move
    if (type === 'question') {
        const sourceSectionIdx = parseInt(source.droppableId.replace('section-', ''))
        const destSectionIdx = parseInt(destination.droppableId.replace('section-', ''))
        
        const currentValues = getValues()
        const newSections = JSON.parse(JSON.stringify(currentValues.sections)) // Deep clone for safety
        
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
    try {
      const payload = data.sections.map((s, sIdx) => ({
        ...s,
        order: sIdx,
        questions: s.questions.map((q, qIdx) => ({
          ...q,
          order: qIdx,
          options: q.type === 'MCQ' ? q.options : null,
        }))
      }))
      await updateVersion(versionId, { 
        timeLimitMinutes: data.timeLimitMinutes,
        sections: payload 
      })
      toast.success('Saved successfully')
      await load()
    } catch {
      toast.error('Failed to save')
    }
  }

  const addSection = () => {
    appendSection({ title: 'New Section', questions: [] })
  }

  if (!version) return <div className="p-8">Loading...</div>

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Main Canvas */}
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{version.paper?.title} - {version.versionName}</h2>
            <p className="text-muted-foreground">Status: {version.status}</p>
          </div>
          <Button type="button" onClick={addSection} variant="outline" size="sm">
            <Plus size={16} className="mr-2" /> Add Section
          </Button>
        </div>

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
                <Button type="button" className="w-full" onClick={handleSubmit(onSubmit)}>Save Paper</Button>
                <Button type="button" className="w-full" variant="outline" onClick={() => load()}>Discard Changes</Button>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PaperSectionComponent({ provided, control, sIdx, removeSection }: { 
  provided: any, 
  control: Control<FormValues>, 
  sIdx: number, 
  removeSection: (idx: number) => void 
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
      answer: ''
    })
  }

  return (
    <div ref={provided.innerRef} {...provided.draggableProps} className="bg-muted/10 border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm border">
        <div className="flex items-center gap-3 flex-1">
          <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
            <GripVertical size={20} />
          </div>
          <Controller
            control={control}
            name={`sections.${sIdx}.title`}
            render={({ field }) => (
              <Input {...field} className="font-bold text-lg border-none focus-visible:ring-0 h-auto p-0" placeholder="Section Title" />
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => removeSection(sIdx)} className="text-destructive">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <Droppable droppableId={`section-${sIdx}`} type="question">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 min-h-[50px]">
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

