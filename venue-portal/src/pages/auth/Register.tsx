import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StepIndicator } from '../../components/StepIndicator'
import Step1Account from './steps/Step1Account'
import Step2Details from './steps/Step2Details'
import Step3Location from './steps/Step3Location'
import Step4Tier from './steps/Step4Tier'

const STEP_LABELS = ['Account', 'Details', 'Location', 'Tier']

export default function Register() {
  const { step } = useParams<{ step: string }>()
  const navigate = useNavigate()
  const { session, venue } = useAuth()
  const currentStep = parseInt(step ?? '1', 10)

  // Guard: fully registered owners go straight to dashboard
  useEffect(() => {
    if (session && venue && venue.registration_step >= 4) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, venue, navigate])

  const handleStepSuccess = async () => {
    if (currentStep < 4) {
      navigate(`/register/${currentStep + 1}`)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#1A1225] text-[#2D1E4B] dark:text-[#F0EBF8] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-center mb-8">
          <span className="text-[#FF7F61]">Frendli</span> Venue Portal
        </h1>
        <StepIndicator totalSteps={4} currentStep={currentStep} labels={STEP_LABELS} />

        {currentStep === 1 && (
          <Step1Account onSuccess={handleStepSuccess} />
        )}
        {currentStep === 2 && session?.user && (
          <Step2Details venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
        {currentStep === 3 && session?.user && (
          <Step3Location venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
        {currentStep === 4 && session?.user && (
          <Step4Tier venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
      </div>
    </div>
  )
}
