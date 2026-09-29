interface ProfileStepperProps {
  currentStep: 1 | 2
  step1Completed?: boolean
  step2Completed?: boolean
}

export function ProfileStepper({
  currentStep,
  step1Completed = currentStep > 1,
  step2Completed = false,
}: ProfileStepperProps) {
  const steps = [
    {
      id: 1,
      title: 'Profile Details',
      subtitle: 'Personal and academic details',
    },
    {
      id: 2,
      title: 'Verification',
      subtitle: 'Upload proof document',
    },
  ] as const

  const completedSteps = new Set<number>()
  if (step1Completed) completedSteps.add(1)
  if (step2Completed) completedSteps.add(2)

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = completedSteps.has(step.id)

          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm sm:h-9 sm:w-9 font-semibold ${
                  isCompleted || isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-xs font-medium sm:text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{step.subtitle}</p>
              </div>
              {index < steps.length - 1 ? <div className="mx-1 h-px min-w-3 flex-1 bg-border sm:mx-2" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
