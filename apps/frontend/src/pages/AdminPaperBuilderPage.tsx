import React from 'react'
import { useParams } from '@tanstack/react-router'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { fetchVersionDetails, updateVersion } from '@/lib/question-papers'
import type { QuestionPaperVersion, QuestionPaper } from '@/lib/question-papers'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { GripVertical, Trash2, Plus } from 'lucide-react'

type QuestionType = 'MCQ' | 'SUBJECTIVE' | 'SUBJECTIVE_WITH_ANSWER'

interface FormValues {
  timeLimitMinutes: number
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

export function AdminPaperBuilderPage() {
  const { versionId } = useParams({ strict: false }) as { versionId: string }
  const [version, setVersion] = React.useState<(QuestionPaperVersion & { paper?: QuestionPaper }) | null>(null)
  
  const { control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: { timeLimitMinutes: 60, questions: [] }
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'questions'
  })

  const load = React.useCallback(async () => {
    try {
      const data = await fetchVersionDetails(versionId)
      setVersion(data)
      reset({
        timeLimitMinutes: data.timeLimitMinutes,
        questions: data.questions?.map(q => ({
          ...q,
          timeLimitSeconds: q.timeLimitSeconds ?? undefined,
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer || ''
        })) || []
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
    move(result.source.index, result.destination.index)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = data.questions.map((q, index) => ({
        ...q,
        order: index,
        options: q.type === 'MCQ' ? q.options : null,
      }))
      await updateVersion(versionId, { 
        timeLimitMinutes: data.timeLimitMinutes,
        questions: payload 
      })
      toast.success('Saved successfully')
      await load()
    } catch {
      toast.error('Failed to save')
    }
  }

  const addQuestion = (type: QuestionType) => {
    append({
      type,
      text: '',
      marks: 1,
      options: type === 'MCQ' ? [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }] : [],
      answer: ''
    })
  }

  if (!version) return <div className="p-8">Loading...</div>

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Main Canvas */}
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{version.paper?.title} - {version.versionName}</h2>
          <p className="text-muted-foreground">Status: {version.status}</p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {fields.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(provided) => (
                      <Card ref={provided.innerRef} {...provided.draggableProps}>
                        <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
                              <GripVertical size={20} />
                            </div>
                            <span className="font-semibold text-sm">Question {index + 1} ({field.type})</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => remove(index)} className="text-destructive">
                            <Trash2 size={16} />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <Label>Question Text</Label>
                              <Controller
                                control={control}
                                name={`questions.${index}.text`}
                                render={({ field }) => (
                                  <Textarea {...field} placeholder="Enter question..." className="mt-1" />
                                )}
                              />
                            </div>
                            <div className="w-24">
                              <Label>Marks</Label>
                              <Controller
                                control={control}
                                name={`questions.${index}.marks`}
                                render={({ field }) => (
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="mt-1" />
                                )}
                              />
                            </div>
                            <div className="w-32">
                              <Label>Time Limit (sec)</Label>
                              <Controller
                                control={control}
                                name={`questions.${index}.timeLimitSeconds`}
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
                                {field.options.map((opt, optIdx) => (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <span className="font-semibold w-6">{opt.id}.</span>
                                    <Controller
                                      control={control}
                                      name={`questions.${index}.options.${optIdx}.text`}
                                      render={({ field }) => (
                                        <Input {...field} placeholder={`Option ${opt.id}`} />
                                      )}
                                    />
                                    <Controller
                                      control={control}
                                      name={`questions.${index}.answer`}
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
                                name={`questions.${index}.answer`}
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
        </DragDropContext>

        {fields.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            No questions added yet. Use the toolbar on the right to add questions.
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="w-64 flex-shrink-0">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-lg">Add Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => addQuestion('MCQ')}>
              <Plus size={16} className="mr-2" /> Multiple Choice
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addQuestion('SUBJECTIVE')}>
              <Plus size={16} className="mr-2" /> Subjective
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => addQuestion('SUBJECTIVE_WITH_ANSWER')}>
              <Plus size={16} className="mr-2" /> Subj. w/ Answer
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-start border-t bg-muted/20 p-4 mt-4 gap-3">
            <h4 className="text-sm font-semibold">Paper Settings</h4>
            <div className="w-full space-y-3">
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
                <Button className="w-full" onClick={handleSubmit(onSubmit)}>Save Paper</Button>
                <Button className="w-full" variant="outline" onClick={() => load()}>Discard Changes</Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
