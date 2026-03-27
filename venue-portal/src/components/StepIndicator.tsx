interface Props {
  totalSteps: number
  currentStep: number
  labels: string[]
}

export function StepIndicator({ totalSteps, currentStep, labels }: Props) {
  return (
    <div role="list" className="flex items-start justify-center mb-8 gap-0">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isComplete = step < currentStep
        const isCurrent = step === currentStep
        const isLast = step === totalSteps

        return (
          <div key={step} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center">
              <div
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
                data-complete={isComplete ? 'true' : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-colors ${
                  isComplete
                    ? 'bg-[#FF7F61] text-white'
                    : isCurrent
                      ? 'border-2 border-[#FF7F61] text-[#FF7F61] bg-white dark:bg-[#251A38]'
                      : 'border-2 border-[#EEEAE3] dark:border-[#3D2E55] text-[#8E8271] dark:text-[#9E8FC0] bg-white dark:bg-[#251A38]'
                }`}
              >
                {isComplete ? '✓' : step}
              </div>
              <span className={`text-xs hidden sm:block ${
                isCurrent
                  ? 'text-[#2D1E4B] dark:text-[#F0EBF8] font-medium'
                  : 'text-[#8E8271] dark:text-[#9E8FC0]'
              }`}>
                {labels[i]}
              </span>
            </div>
            {/* Connector line between circles */}
            {!isLast && (
              <div className={`h-0.5 w-10 mx-1 mb-5 flex-shrink-0 ${
                isComplete ? 'bg-[#FF7F61]' : 'bg-[#EEEAE3] dark:bg-[#3D2E55]'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
