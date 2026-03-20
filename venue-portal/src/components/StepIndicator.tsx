interface Props {
  totalSteps: number
  currentStep: number
  labels: string[]
}

export function StepIndicator({ totalSteps, currentStep, labels }: Props) {
  return (
    <ol className="flex items-center w-full mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isComplete = step < currentStep
        const isCurrent = step === currentStep
        return (
          <li
            key={step}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
            data-complete={isComplete ? 'true' : undefined}
            className="flex flex-col items-center flex-1"
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1
              ${isComplete ? 'bg-indigo-500 text-white' : ''}
              ${isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : ''}
              ${!isComplete && !isCurrent ? 'bg-slate-700 text-slate-400' : ''}
            `}>
              {isComplete ? '✓' : step}
            </div>
            <span className={`text-xs hidden sm:block ${isCurrent ? 'text-slate-200' : 'text-slate-500'}`}>
              {labels[i]}
            </span>
            {step < totalSteps && (
              <div className={`absolute h-0.5 flex-1 ${isComplete ? 'bg-indigo-500' : 'bg-slate-700'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
