interface ProfileStepperProps {
  currentStep: 1 | 2
}

export function ProfileStepper({ currentStep }: ProfileStepperProps) {
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

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex flex-1 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isCompleted || isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                <p className="truncate text-xs text-muted-foreground">{step.subtitle}</p>
              </div>
              {index < steps.length - 1 ? <div className="mx-2 hidden h-px flex-1 bg-border md:block" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
