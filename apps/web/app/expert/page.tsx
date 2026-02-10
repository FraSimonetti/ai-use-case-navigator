'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'
import { ObligationCard } from '@/components/obligations/obligation-card'
import { TimelineView } from '@/components/obligations/timeline-view'
import { ChatWidget } from '@/components/expert/chat-widget'

// ─── Shared Data Arrays ─────────────────────────────────────────────────────

const INSTITUTION_TYPES = [
  { value: 'bank', label: 'Bank / Credit Institution' },
  { value: 'insurer', label: 'Insurance Company' },
  { value: 'investment_firm', label: 'Investment Firm' },
  { value: 'payment_provider', label: 'Payment Service Provider' },
  { value: 'crypto_provider', label: 'Crypto Asset Service Provider' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'pension_fund', label: 'Pension Fund' },
  { value: 'fintech', label: 'Fintech Company' },
  { value: 'regtech', label: 'RegTech Provider' },
  { value: 'law_firm', label: 'Law Firm / Legal Services' },
  { value: 'public_authority', label: 'Public Authority / Government' },
  { value: 'educational_institution', label: 'Educational Institution' },
  { value: 'healthcare_provider', label: 'Healthcare Provider' },
  { value: 'law_enforcement', label: 'Law Enforcement Agency' },
  { value: 'other', label: 'Other Organization' },
]

const AI_ROLES = [
  { value: 'deployer', label: 'Deployer - I use AI built by others' },
  { value: 'provider', label: 'Provider - I develop AI for others' },
  { value: 'provider_and_deployer', label: 'Both - I build and use my own AI' },
  { value: 'importer', label: 'Importer - I bring non-EU AI to market' },
  { value: 'distributor', label: 'Distributor - I make AI available on EU market' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  // Section 1: AI System Definition
  use_case_description: string
  ai_techniques: string[]
  ai_techniques_other: string // NEW: Custom technique input
  outputs_generated: string[]
  outputs_generated_other: string // NEW: Custom output input
  autonomy_level: string // fully_automated, human_in_loop, human_on_loop, human_oversight

  // Section 2: Organization
  institution_type: string
  role: string
  third_party_vendor: boolean

  // Section 3: Prohibited Practices (Article 5) - tri-state
  subliminal_manipulation: boolean | null
  exploits_vulnerabilities: boolean | null
  social_scoring_public: boolean | null
  realtime_biometric_public: boolean | null
  emotion_recognition_workplace_education: boolean | null
  biometric_categorization_sensitive: boolean | null
  facial_image_scraping: boolean | null

  // Section 4: High-Risk Assessment (Annex III)
  // 4.1: Biometric (Annex III.1)
  biometric_identification: boolean
  biometric_categorization: boolean
  remote_biometric_identification: boolean
  // 4.2: Critical Infrastructure (Annex III.2)
  critical_infrastructure_safety: boolean
  manages_utilities: boolean
  // 4.3: Education (Annex III.3)
  educational_access: boolean
  educational_assessment: boolean
  educational_monitoring: boolean
  // 4.4: Employment (Annex III.4)
  recruitment_selection: boolean
  task_allocation_employment: boolean
  performance_monitoring: boolean
  promotion_termination: boolean
  // 4.5: Essential Services (Annex III.5)
  emergency_services: boolean
  public_assistance_benefits: boolean
  creditworthiness_natural_persons: boolean
  insurance_life_health: boolean
  // 4.6: Law Enforcement (Annex III.6)
  law_enforcement_risk_assessment: boolean
  law_enforcement_polygraph: boolean
  law_enforcement_emotion_recognition: boolean
  law_enforcement_deepfake_detection: boolean
  law_enforcement_evidence_evaluation: boolean
  law_enforcement_profiling: boolean
  law_enforcement_crime_analytics: boolean
  // 4.7: Migration/Asylum/Border (Annex III.7)
  migration_polygraph: boolean
  migration_risk_assessment: boolean
  migration_application_examination: boolean
  migration_border_detection: boolean
  // 4.8: Justice (Annex III.8)
  justice_research_interpretation: boolean
  justice_law_application: boolean

  // Section 5: Transparency Obligations (Article 52)
  natural_person_interaction: boolean
  emotion_recognition_biometric: boolean
  deepfake_generation: boolean
  synthetic_content_generation: boolean

  // Section 6: Deployment Context
  intended_purpose: string
  deployment_environment: string
  primary_user_category: string
  geographic_scope: string
  vulnerable_groups: boolean

  // Section 7: Data Governance
  uses_special_category_data: boolean
  involves_profiling: boolean
  training_data_documented: boolean
  data_quality_measures: boolean

  // Section 8: Risk Management & Compliance
  risk_management_system: boolean
  human_oversight_measures: boolean
  conformity_assessment_conducted: boolean
  post_market_monitoring: boolean

  // Section 9: Technical & GPAI (existing)
  uses_gpai_model: boolean
  gpai_with_systemic_risk: boolean
  safety_component: boolean
  cross_border_processing: boolean
  critical_ict_service: boolean

  // Section 10: Sectoral (existing)
  provides_investment_advice: boolean
  processes_payments: boolean
  performs_aml_obligations: boolean

  // Section 11: Article 6(3) Exemptions (High-Risk Exclusions)
  narrow_procedural_task: boolean
  improves_human_activity: boolean
  detects_decision_patterns: boolean
}

interface Obligation {
  id: string
  name: string
  description: string
  priority?: string
  source_articles?: string[]
  source_regulation?: string
  category?: string
  deadline?: string
  action_items?: string[]
  applies_to?: string[]
  summary?: string
  effort_level?: string
  legal_basis?: string
  what_it_means?: string
  implementation_steps?: string[]
  evidence_required?: string[]
  penalties?: string
  common_pitfalls?: string[]
  related_obligations?: string[]
  tools_and_templates?: string[]
}

interface TimelineEvent {
  date: string
  event: string
  impact: string
}

interface ValidationErrors {
  description?: string
  ai_techniques?: string
  autonomy_level?: string
  institution_type?: string
  role?: string
  api_key?: string
  prohibited_practices?: string
  intended_purpose?: string
  deployment_environment?: string
  user_category?: string
  geographic_scope?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResults = any

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRiskBadgeClasses(risk: string): string {
  switch (risk) {
    case 'prohibited': return 'bg-red-900 text-white border-red-900'
    case 'high_risk': return 'bg-red-100 text-red-800 border-red-300'
    case 'limited_risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'minimal_risk': return 'bg-green-100 text-green-800 border-green-300'
    case 'context_dependent': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'exempt_from_high_risk': return 'bg-blue-100 text-blue-800 border-blue-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getRiskLabel(risk: string): string {
  if (risk === 'prohibited') return 'PROHIBITED'
  if (risk === 'high_risk') return 'HIGH-RISK'
  if (risk === 'limited_risk') return 'LIMITED RISK'
  if (risk === 'minimal_risk') return 'MINIMAL RISK'
  if (risk === 'context_dependent') return 'CONTEXT-DEPENDENT'
  if (risk === 'exempt_from_high_risk') return 'EXEMPT FROM HIGH-RISK'
  return risk.replace(/_/g, ' ').toUpperCase()
}

const INITIAL_FORM: FormData = {
  use_case_description: '',
  ai_techniques: [],
  ai_techniques_other: '',
  outputs_generated: [],
  outputs_generated_other: '',
  autonomy_level: '',
  institution_type: '',
  role: '',
  third_party_vendor: false,
  subliminal_manipulation: null,
  exploits_vulnerabilities: null,
  social_scoring_public: null,
  realtime_biometric_public: null,
  emotion_recognition_workplace_education: null,
  biometric_categorization_sensitive: null,
  facial_image_scraping: null,
  biometric_identification: false,
  biometric_categorization: false,
  remote_biometric_identification: false,
  critical_infrastructure_safety: false,
  manages_utilities: false,
  educational_access: false,
  educational_assessment: false,
  educational_monitoring: false,
  recruitment_selection: false,
  task_allocation_employment: false,
  performance_monitoring: false,
  promotion_termination: false,
  emergency_services: false,
  public_assistance_benefits: false,
  creditworthiness_natural_persons: false,
  insurance_life_health: false,
  law_enforcement_risk_assessment: false,
  law_enforcement_polygraph: false,
  law_enforcement_emotion_recognition: false,
  law_enforcement_deepfake_detection: false,
  law_enforcement_evidence_evaluation: false,
  law_enforcement_profiling: false,
  law_enforcement_crime_analytics: false,
  migration_polygraph: false,
  migration_risk_assessment: false,
  migration_application_examination: false,
  migration_border_detection: false,
  justice_research_interpretation: false,
  justice_law_application: false,
  natural_person_interaction: false,
  emotion_recognition_biometric: false,
  deepfake_generation: false,
  synthetic_content_generation: false,
  intended_purpose: '',
  deployment_environment: '',
  primary_user_category: '',
  geographic_scope: '',
  vulnerable_groups: false,
  uses_special_category_data: false,
  involves_profiling: false,
  training_data_documented: false,
  data_quality_measures: false,
  risk_management_system: false,
  human_oversight_measures: false,
  conformity_assessment_conducted: false,
  post_market_monitoring: false,
  uses_gpai_model: false,
  gpai_with_systemic_risk: false,
  safety_component: false,
  cross_border_processing: false,
  critical_ict_service: false,
  provides_investment_advice: false,
  processes_payments: false,
  performs_aml_obligations: false,
  narrow_procedural_task: false,
  improves_human_activity: false,
  detects_decision_patterns: false,
}

const PROHIBITED_PRACTICES_QUESTIONS: {
  key: keyof Pick<FormData, 'subliminal_manipulation' | 'exploits_vulnerabilities' | 'social_scoring_public' | 'realtime_biometric_public' | 'emotion_recognition_workplace_education' | 'biometric_categorization_sensitive' | 'facial_image_scraping'>
  question: string
  article: string
}[] = [
  {
    key: 'subliminal_manipulation',
    question: 'Does it use subliminal techniques to materially distort behavior causing physical/psychological harm?',
    article: 'Article 5(1)(a)',
  },
  {
    key: 'exploits_vulnerabilities',
    question: 'Does it exploit vulnerabilities due to age, disability, or social/economic situation causing harm?',
    article: 'Article 5(1)(b)',
  },
  {
    key: 'social_scoring_public',
    question: 'Is it used by public authorities for social scoring leading to detrimental treatment?',
    article: 'Article 5(1)(c)',
  },
  {
    key: 'realtime_biometric_public',
    question: 'Does it perform real-time remote biometric identification in publicly accessible spaces? (Law enforcement exceptions apply)',
    article: 'Article 5(1)(h)',
  },
  {
    key: 'emotion_recognition_workplace_education',
    question: 'Does it recognize emotions in the workplace or educational institutions?',
    article: 'Article 5(1)(f)',
  },
  {
    key: 'biometric_categorization_sensitive',
    question: 'Does it categorize persons based on biometric data to infer race, political opinions, religion, sexual orientation, etc.?',
    article: 'Article 5(1)(e)',
  },
  {
    key: 'facial_image_scraping',
    question: 'Does it scrape facial images from the internet or CCTV to create/expand facial recognition databases?',
    article: 'Article 5(1)(g)',
  },
]

// ─── Tri-State Toggle Component ──────────────────────────────────────────────

function TriStateToggle({
  value,
  onChange,
  error,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
  error?: boolean
}) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
          value === true
            ? 'bg-red-600 text-white border-red-600 shadow-md'
            : error
              ? 'bg-white text-gray-500 border-red-300 hover:border-red-400 hover:text-red-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
          value === false
            ? 'bg-gray-600 text-white border-gray-600 shadow-md'
            : error
              ? 'bg-white text-gray-500 border-red-300 hover:border-gray-400 hover:text-gray-600'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-600'
        }`}
      >
        No
      </button>
    </div>
  )
}

// ─── Info Modal Component ────────────────────────────────────────────────────

function InfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">About RegolAI Expert Assessment</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl font-bold">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          <section>
            <h3 className="text-lg font-bold text-purple-800 mb-2">🎯 What is this page?</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              The <strong>RegolAI Expert Assessment</strong> is a comprehensive AI system classification tool that helps you determine the regulatory obligations your AI system must comply with under the <strong>EU AI Act</strong>, GDPR, DORA, and sectoral financial regulations.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-purple-800 mb-2">💡 Why use this assessment?</h3>
            <ul className="text-sm text-gray-700 space-y-2 ml-5 list-disc">
              <li><strong>Comprehensive coverage:</strong> Covers all EU AI Act articles and all 8 Annex III high-risk categories</li>
              <li><strong>Multi-regulation analysis:</strong> Assesses compliance with AI Act, GDPR, DORA, MiFID II, PSD2, and AMLD</li>
              <li><strong>AI-powered insights:</strong> Uses advanced LLM analysis to identify your use case and provide tailored guidance</li>
              <li><strong>Actionable obligations:</strong> Provides specific compliance obligations, deadlines, and action items</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-purple-800 mb-2">⚙️ How it works</h3>
            <ol className="text-sm text-gray-700 space-y-2 ml-5 list-decimal">
              <li><strong>Describe your AI:</strong> Answer questions about your AI system, techniques, deployment, and impact</li>
              <li><strong>AI analysis:</strong> Our LLM analyzes your responses to identify regulatory classification</li>
              <li><strong>Rule-based matching:</strong> EU AI Act rules determine risk classification and obligations</li>
              <li><strong>Comprehensive report:</strong> Receive detailed assessment with legal basis and compliance steps</li>
            </ol>
          </section>

          <section className="border-t-2 border-red-200 pt-4">
            <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Important Legal Disclaimer</h3>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-xs text-red-900 space-y-2">
              <p><strong>NOT LEGAL ADVICE:</strong> This assessment is provided for informational purposes only. It does <strong>not constitute legal advice</strong>.</p>
              <p><strong>NO GUARANTEE:</strong> The EU AI Act is complex and subject to interpretation. We make no warranties about completeness or accuracy.</p>
              <p><strong>CONSULT LEGAL COUNSEL:</strong> Always consult qualified legal professionals before making compliance decisions.</p>
              <p><strong>YOUR RESPONSIBILITY:</strong> You are solely responsible for ensuring your AI system complies with all applicable laws.</p>
              <p><strong>AI-GENERATED CONTENT:</strong> AI analysis may produce inaccurate information. Review all content with human experts.</p>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors">
            I Understand
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpertPage() {
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM })
  const [results, setResults] = useState<ApiResults>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showAnnexIII, setShowAnnexIII] = useState(false)
  const [showCompliance, setShowCompliance] = useState(false)
  const [showTechnical, setShowTechnical] = useState(false)
  const [showSectoral, setShowSectoral] = useState(false)
  const [showExemptions, setShowExemptions] = useState(false)
  const [expandedRegulation, setExpandedRegulation] = useState<string | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [aiAnalysis, setAiAnalysis] = useState<string>('')

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const aiTechniquesRef = useRef<HTMLDivElement>(null)
  const autonomyRef = useRef<HTMLDivElement>(null)
  const institutionRef = useRef<HTMLSelectElement>(null)
  const roleRef = useRef<HTMLSelectElement>(null)
  const prohibitedRef = useRef<HTMLDivElement>(null)
  const purposeRef = useRef<HTMLInputElement>(null)
  const deploymentRef = useRef<HTMLSelectElement>(null)
  const userCategoryRef = useRef<HTMLSelectElement>(null)
  const geographicRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setHasConfig(hasLLMConfig())
  }, [])

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    // Clear relevant errors
    if (key === 'use_case_description' && errors.description) {
      setErrors(prev => ({ ...prev, description: undefined }))
    }
    if (key === 'ai_techniques' && errors.ai_techniques) {
      setErrors(prev => ({ ...prev, ai_techniques: undefined }))
    }
    if (key === 'autonomy_level' && errors.autonomy_level) {
      setErrors(prev => ({ ...prev, autonomy_level: undefined }))
    }
    if (key === 'institution_type' && errors.institution_type) {
      setErrors(prev => ({ ...prev, institution_type: undefined }))
    }
    if (key === 'role' && errors.role) {
      setErrors(prev => ({ ...prev, role: undefined }))
    }
    if (key === 'intended_purpose' && errors.intended_purpose) {
      setErrors(prev => ({ ...prev, intended_purpose: undefined }))
    }
    if (key === 'deployment_environment' && errors.deployment_environment) {
      setErrors(prev => ({ ...prev, deployment_environment: undefined }))
    }
    if (key === 'primary_user_category' && errors.user_category) {
      setErrors(prev => ({ ...prev, user_category: undefined }))
    }
    if (key === 'geographic_scope' && errors.geographic_scope) {
      setErrors(prev => ({ ...prev, geographic_scope: undefined }))
    }
    if (PROHIBITED_PRACTICES_QUESTIONS.some(q => q.key === key) && errors.prohibited_practices) {
      const updated = { ...formData, [key]: value }
      const allAnswered = PROHIBITED_PRACTICES_QUESTIONS.every(q => updated[q.key] !== null)
      if (allAnswered) {
        setErrors(prev => ({ ...prev, prohibited_practices: undefined }))
      }
    }
  }

  const toggleArrayValue = (key: keyof Pick<FormData, 'ai_techniques' | 'outputs_generated'>, value: string) => {
    setFormData(prev => {
      const current = prev[key] as string[]
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [key]: updated }
    })
    if (key === 'ai_techniques' && errors.ai_techniques) {
      setErrors(prev => ({ ...prev, ai_techniques: undefined }))
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    let firstErrorRef: React.RefObject<HTMLElement | null> | null = null

    if (!formData.use_case_description || formData.use_case_description.trim().length < 50) {
      newErrors.description = 'Please provide a detailed description of at least 50 characters.'
      if (!firstErrorRef) firstErrorRef = descriptionRef
    }

    if (formData.ai_techniques.length === 0) {
      newErrors.ai_techniques = 'Please select at least one AI technique your system uses.'
      if (!firstErrorRef) firstErrorRef = aiTechniquesRef
    }

    if (!formData.autonomy_level) {
      newErrors.autonomy_level = 'Please specify the level of autonomy of your AI system.'
      if (!firstErrorRef) firstErrorRef = autonomyRef
    }

    if (!formData.institution_type) {
      newErrors.institution_type = 'Please select your institution type.'
      if (!firstErrorRef) firstErrorRef = institutionRef
    }

    if (!formData.role) {
      newErrors.role = 'Please select your AI role.'
      if (!firstErrorRef) firstErrorRef = roleRef
    }

    const unanswered = PROHIBITED_PRACTICES_QUESTIONS.filter(q => formData[q.key] === null)
    if (unanswered.length > 0) {
      newErrors.prohibited_practices = `Please answer all ${PROHIBITED_PRACTICES_QUESTIONS.length} prohibited practices questions (${unanswered.length} remaining).`
      if (!firstErrorRef) firstErrorRef = prohibitedRef
    }

    if (!formData.intended_purpose || formData.intended_purpose.trim().length < 10) {
      newErrors.intended_purpose = 'Please describe the intended purpose (at least 10 characters).'
      if (!firstErrorRef) firstErrorRef = purposeRef
    }

    if (!formData.deployment_environment) {
      newErrors.deployment_environment = 'Please select deployment environment.'
      if (!firstErrorRef) firstErrorRef = deploymentRef
    }

    if (!formData.primary_user_category) {
      newErrors.user_category = 'Please select primary user category.'
      if (!firstErrorRef) firstErrorRef = userCategoryRef
    }

    if (!formData.geographic_scope) {
      newErrors.geographic_scope = 'Please select geographic scope.'
      if (!firstErrorRef) firstErrorRef = geographicRef
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      if (firstErrorRef?.current) {
        firstErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }

    return true
  }

  // ─── Build enriched description for LLM ──────────────────────────────────

  const buildEnrichedDescription = (): string => {
    const lines: string[] = []
    lines.push(`Use Case Description: ${formData.use_case_description.trim()}`)
    lines.push(`Intended Purpose: ${formData.intended_purpose.trim()}`)
    lines.push('')
    lines.push(`Organization: ${INSTITUTION_TYPES.find(t => t.value === formData.institution_type)?.label || formData.institution_type} (Role: ${AI_ROLES.find(r => r.value === formData.role)?.label || formData.role})`)
    if (formData.third_party_vendor) lines.push('Third-party vendor: Yes')
    lines.push('')
    lines.push('AI System Definition (Article 3, Annex I):')
    const techniques = [...formData.ai_techniques]
    if (formData.ai_techniques_other.trim()) techniques.push(formData.ai_techniques_other.trim())
    lines.push(`- AI Techniques: ${techniques.join(', ') || 'Not specified'}`)
    const outputs = [...formData.outputs_generated]
    if (formData.outputs_generated_other.trim()) outputs.push(formData.outputs_generated_other.trim())
    lines.push(`- Outputs: ${outputs.join(', ') || 'Not specified'}`)
    lines.push(`- Autonomy: ${formData.autonomy_level.replace(/_/g, ' ')}`)

    const hasProhibited = PROHIBITED_PRACTICES_QUESTIONS.some(q => formData[q.key] === true)
    if (hasProhibited) {
      lines.push('')
      lines.push('PROHIBITED PRACTICES DETECTED (Article 5):')
      PROHIBITED_PRACTICES_QUESTIONS.forEach(q => {
        if (formData[q.key] === true) {
          lines.push(`- ${q.question} (${q.article})`)
        }
      })
    }

    const annexIII: string[] = []
    if (formData.biometric_identification || formData.biometric_categorization || formData.remote_biometric_identification) {
      annexIII.push('Biometric identification/categorization (Annex III.1)')
    }
    if (formData.critical_infrastructure_safety || formData.manages_utilities) {
      annexIII.push('Critical infrastructure (Annex III.2)')
    }
    if (formData.educational_access || formData.educational_assessment || formData.educational_monitoring) {
      annexIII.push('Education/training (Annex III.3)')
    }
    if (formData.recruitment_selection || formData.task_allocation_employment || formData.performance_monitoring || formData.promotion_termination) {
      annexIII.push('Employment/HR (Annex III.4)')
    }
    if (formData.emergency_services || formData.public_assistance_benefits || formData.creditworthiness_natural_persons || formData.insurance_life_health) {
      annexIII.push('Essential services (Annex III.5)')
    }
    if (formData.law_enforcement_risk_assessment || formData.law_enforcement_polygraph || formData.law_enforcement_emotion_recognition || formData.law_enforcement_deepfake_detection || formData.law_enforcement_evidence_evaluation || formData.law_enforcement_profiling || formData.law_enforcement_crime_analytics) {
      annexIII.push('Law enforcement (Annex III.6)')
    }
    if (formData.migration_polygraph || formData.migration_risk_assessment || formData.migration_application_examination || formData.migration_border_detection) {
      annexIII.push('Migration/asylum/border control (Annex III.7)')
    }
    if (formData.justice_research_interpretation || formData.justice_law_application) {
      annexIII.push('Administration of justice (Annex III.8)')
    }

    if (annexIII.length > 0) {
      lines.push('')
      lines.push('High-Risk Categories (Annex III):')
      annexIII.forEach(cat => lines.push(`- ${cat}`))
    }

    lines.push('')
    lines.push('Deployment Context:')
    lines.push(`- Environment: ${formData.deployment_environment.replace(/_/g, ' ')}`)
    lines.push(`- Users: ${formData.primary_user_category.replace(/_/g, ' ')}`)
    lines.push(`- Geographic scope: ${formData.geographic_scope.replace(/_/g, ' ')}`)
    lines.push(`- Vulnerable groups: ${formData.vulnerable_groups ? 'Yes' : 'No'}`)

    if (formData.uses_special_category_data || formData.involves_profiling || formData.training_data_documented || formData.data_quality_measures) {
      lines.push('')
      lines.push('Data Governance:')
      if (formData.uses_special_category_data) lines.push('- Uses special category data (GDPR Art. 9)')
      if (formData.involves_profiling) lines.push('- Involves profiling')
      if (formData.training_data_documented) lines.push('- Training data documented')
      if (formData.data_quality_measures) lines.push('- Data quality measures implemented')
    }

    if (formData.risk_management_system || formData.human_oversight_measures || formData.conformity_assessment_conducted || formData.post_market_monitoring) {
      lines.push('')
      lines.push('Compliance Measures:')
      if (formData.risk_management_system) lines.push('- Risk management system in place')
      if (formData.human_oversight_measures) lines.push('- Human oversight measures')
      if (formData.conformity_assessment_conducted) lines.push('- Conformity assessment conducted')
      if (formData.post_market_monitoring) lines.push('- Post-market monitoring system')
    }

    if (formData.uses_gpai_model || formData.gpai_with_systemic_risk || formData.safety_component) {
      lines.push('')
      lines.push('Technical Context:')
      if (formData.uses_gpai_model) lines.push('- Uses GPAI model')
      if (formData.gpai_with_systemic_risk) lines.push('- GPAI with systemic risk (>10^25 FLOPs)')
      if (formData.safety_component) lines.push('- Safety component')
      if (formData.critical_ict_service) lines.push('- Critical ICT service (DORA)')
    }

    if (formData.narrow_procedural_task || formData.improves_human_activity || formData.detects_decision_patterns) {
      lines.push('')
      lines.push('Article 6(3) Exemptions (High-Risk Exclusions):')
      if (formData.narrow_procedural_task) lines.push('- Performs narrow procedural task')
      if (formData.improves_human_activity) lines.push('- Improves result of previously completed human activity')
      if (formData.detects_decision_patterns) lines.push('- Detects decision patterns without replacing human assessment')
    }

    return lines.join('\n')
  }

  // ─── Submit: Two-Step API Strategy ───────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return

    // Warn if no LLM config but don't block
    if (!hasLLMConfig()) {
      const proceed = window.confirm(
        'Warning: No LLM API key configured. The analysis will proceed but AI-powered insights may be limited. ' +
        'Configure your API key in Settings for full functionality.\n\nProceed anyway?'
      )
      if (!proceed) return
    }

    setIsLoading(true)
    setResults(null)
    setAiAnalysis('')

    try {
      const enrichedDescription = buildEnrichedDescription()
      const requestBody = {
        description: enrichedDescription,
        institution_type: formData.institution_type,
        role: formData.role,
        third_party_vendor: formData.third_party_vendor,
        involves_natural_persons: formData.primary_user_category === 'consumers' || formData.creditworthiness_natural_persons || formData.insurance_life_health,
        fully_automated: formData.autonomy_level === 'fully_automated',
        denies_service_access: formData.creditworthiness_natural_persons || formData.public_assistance_benefits || formData.recruitment_selection,
        affects_legal_rights: formData.justice_law_application || formData.creditworthiness_natural_persons,
        uses_special_category_data: formData.uses_special_category_data,
        vulnerable_groups: formData.vulnerable_groups,
        is_high_impact: formData.creditworthiness_natural_persons || formData.insurance_life_health || formData.recruitment_selection,
        involves_profiling: formData.involves_profiling,
        uses_gpai_model: formData.uses_gpai_model,
        gpai_with_systemic_risk: formData.gpai_with_systemic_risk,
        safety_component: formData.safety_component,
        cross_border_processing: formData.cross_border_processing,
        critical_ict_service: formData.critical_ict_service,
        life_health_insurance: formData.insurance_life_health,
        provides_investment_advice: formData.provides_investment_advice,
        processes_payments: formData.processes_payments,
        performs_aml_obligations: formData.performs_aml_obligations,
      }

      const step1Response = await fetch('/api/obligations/analyze-custom', {
        method: 'POST',
        headers: getLLMHeaders(),
        body: JSON.stringify(requestBody),
      })

      if (!step1Response.ok) {
        throw new Error(`Analysis failed with status ${step1Response.status}`)
      }

      const step1Data = await step1Response.json()
      const suggestedUseCase = step1Data.suggested_use_case
      const step1Analysis = step1Data.ai_analysis || ''

      setAiAnalysis(step1Analysis)

      let finalResults = step1Data

      if (suggestedUseCase) {
        try {
          const step2Response = await fetch('/api/obligations/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...requestBody, use_case: suggestedUseCase }),
          })

          if (step2Response.ok) {
            const step2Data = await step2Response.json()
            finalResults = {
              ...step2Data,
              ai_analysis: step1Analysis,
              suggested_use_case: suggestedUseCase,
              warnings: [
                ...(step2Data.warnings || []),
                ...(step1Data.warnings || []).filter(
                  (w: string) => !(step2Data.warnings || []).includes(w)
                ),
              ],
            }
          }
        } catch {
          console.warn('Step 2 (find) failed, using Step 1 results')
        }
      }

      // Check for prohibited practices
      const hasProhibited = PROHIBITED_PRACTICES_QUESTIONS.some(q => formData[q.key] === true)
      if (hasProhibited) {
        finalResults.risk_classification = 'prohibited'
        finalResults.classification_basis = 'PROHIBITED: This AI system violates Article 5 of the EU AI Act and cannot be placed on the market or put into service in the EU.'
        const prohibitedItems = PROHIBITED_PRACTICES_QUESTIONS.filter(q => formData[q.key] === true)
          .map(q => `${q.question} (${q.article})`)
        finalResults.warnings = [
          'CRITICAL: Prohibited AI practice detected',
          ...prohibitedItems,
          ...(finalResults.warnings || []),
        ]
      }

      setResults(finalResults)

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error analyzing use case:', error)
      alert(
        'Analysis failed. This may be due to:\n' +
        '• Missing or invalid LLM API key (configure in Settings)\n' +
        '• Network connectivity issues\n' +
        '• Backend service unavailable\n\n' +
        'Please check your configuration and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ─── PDF Generation ──────────────────────────────────────────────────────

  const handleGeneratePDF = async () => {
    if (!results) return
    setIsGeneratingPDF(true)

    try {
      let narrative = aiAnalysis || ''
      if (hasConfig && !narrative) {
        try {
          const narrativeResponse = await fetch('/api/expert/generate-report', {
            method: 'POST',
            headers: getLLMHeaders(),
            body: JSON.stringify({
              classification: {
                risk_level: results.risk_classification,
                classification_basis: results.classification_basis,
                use_case: results.suggested_use_case || 'comprehensive_assessment',
                institution_type: formData.institution_type,
                role: formData.role,
              },
              obligations: {
                ai_act: results.ai_act_obligations || [],
                gdpr: results.gdpr_obligations || [],
                dora: results.dora_obligations || [],
                gpai: results.gpai_obligations || [],
                sectoral: results.sectoral_obligations || [],
                total_count: allObligations.length,
              },
              collected_data: formData,
            }),
          })
          if (narrativeResponse.ok) {
            const narrativeData = await narrativeResponse.json()
            narrative = narrativeData.narrative || narrative
          }
        } catch {
          // Continue with existing narrative
        }
      }

      const { generatePDFReport } = await import('@/components/expert/pdf-generator')
      generatePDFReport({
        classification: {
          risk_level: results.risk_classification || 'context_dependent',
          classification_basis: results.classification_basis || '',
          use_case: results.suggested_use_case || 'comprehensive_assessment',
          institution_type: formData.institution_type,
          role: formData.role,
        },
        obligations: {
          ai_act: results.ai_act_obligations || [],
          gdpr: results.gdpr_obligations || [],
          dora: results.dora_obligations || [],
          gpai: results.gpai_obligations || [],
          sectoral: results.sectoral_obligations || [],
          total_count: allObligations.length,
        },
        timeline: results.timeline || [],
        warnings: results.warnings || [],
        collectedData: formData as unknown as Record<string, unknown>,
        narrative,
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM })
    setResults(null)
    setAiAnalysis('')
    setShowAnnexIII(false)
    setShowCompliance(false)
    setShowTechnical(false)
    setShowSectoral(false)
    setExpandedRegulation(null)
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Computed values ─────────────────────────────────────────────────────

  const allObligations: Obligation[] = useMemo(() => {
    if (!results) return []
    const all: Obligation[] = []
    if (results.ai_act_obligations) all.push(...results.ai_act_obligations)
    if (results.gdpr_obligations) all.push(...results.gdpr_obligations)
    if (results.dora_obligations) all.push(...results.dora_obligations)
    if (results.gpai_obligations) all.push(...results.gpai_obligations)
    if (results.sectoral_obligations) all.push(...results.sectoral_obligations)
    if (all.length === 0 && results.obligations) {
      all.push(...results.obligations)
    }
    return all
  }, [results])

  const topSuggestions = useMemo(() => {
    if (!allObligations.length) return []
    const sorted = [...allObligations].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority || 'low'] || 4) - (order[b.priority || 'low'] || 4)
    })
    return sorted.slice(0, 5).map(ob => ({
      name: ob.name,
      priority: ob.priority || 'medium',
      action: ob.action_items?.[0] || ob.description,
      deadline: ob.deadline,
    }))
  }, [allObligations])

  const regulationSections = useMemo(() => {
    if (!results) return []
    return [
      { key: 'ai_act', label: 'EU AI Act', headerBg: 'bg-blue-600', items: results.ai_act_obligations || [] },
      { key: 'gdpr', label: 'GDPR', headerBg: 'bg-green-600', items: results.gdpr_obligations || [] },
      { key: 'dora', label: 'DORA', headerBg: 'bg-orange-600', items: results.dora_obligations || [] },
      { key: 'gpai', label: 'GPAI', headerBg: 'bg-purple-600', items: results.gpai_obligations || [] },
      { key: 'sectoral', label: 'Sectoral', headerBg: 'bg-cyan-600', items: results.sectoral_obligations || [] },
    ].filter(s => s.items.length > 0)
  }, [results])

  const descCharCount = formData.use_case_description.trim().length
  const hasValidationErrors = Object.keys(errors).length > 0
  const hasProhibitedPractice = PROHIBITED_PRACTICES_QUESTIONS.some(q => formData[q.key] === true)

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50">
      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* Header */}
      <div className="border-b-2 border-purple-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-gradient-to-r from-white to-purple-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md text-sm">
            AI
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">RegolAI Expert</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Comprehensive EU AI Act Assessment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfoModal(true)}
            className="text-xs px-3 py-2 rounded-lg border-2 border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="text-base">ℹ️</span>
            Info
          </button>
          {results && (
            <button
              onClick={resetForm}
              className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium transition-all shadow-sm"
            >
              New Assessment
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-32">

        {/* API Key Warning */}
        {!hasConfig && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-600 text-xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-900">LLM API Key Not Configured</p>
              <p className="text-xs text-amber-800 mt-1">
                For full AI-powered analysis, configure your LLM provider (API key, model) in <strong>Settings</strong>.
                You can still proceed with the assessment, but AI insights will be limited.
              </p>
            </div>
          </div>
        )}

        {/* Prohibited Practice Warning */}
        {hasProhibitedPractice && (
          <div className="bg-red-900 text-white border-2 border-red-900 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-lg font-bold">PROHIBITED AI PRACTICE DETECTED</h3>
            </div>
            <p className="text-sm mb-2">
              Based on your answers, this AI system appears to violate <strong>Article 5</strong> of the EU AI Act.
              Prohibited AI practices <strong>cannot be placed on the market or put into service</strong> in the European Union.
            </p>
            <p className="text-xs opacity-90">
              Please review your answers carefully. If this assessment is incorrect, modify your responses and resubmit.
            </p>
          </div>
        )}

        {/* Validation Error Banner */}
        {hasValidationErrors && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-800">Please complete the highlighted fields for accurate classification</p>
            <ul className="mt-2 space-y-1">
              {errors.api_key && <li className="text-xs text-red-700">- {errors.api_key}</li>}
              {errors.description && <li className="text-xs text-red-700">- {errors.description}</li>}
              {errors.ai_techniques && <li className="text-xs text-red-700">- {errors.ai_techniques}</li>}
              {errors.autonomy_level && <li className="text-xs text-red-700">- {errors.autonomy_level}</li>}
              {errors.institution_type && <li className="text-xs text-red-700">- {errors.institution_type}</li>}
              {errors.role && <li className="text-xs text-red-700">- {errors.role}</li>}
              {errors.prohibited_practices && <li className="text-xs text-red-700">- {errors.prohibited_practices}</li>}
              {errors.intended_purpose && <li className="text-xs text-red-700">- {errors.intended_purpose}</li>}
              {errors.deployment_environment && <li className="text-xs text-red-700">- {errors.deployment_environment}</li>}
              {errors.user_category && <li className="text-xs text-red-700">- {errors.user_category}</li>}
              {errors.geographic_scope && <li className="text-xs text-red-700">- {errors.geographic_scope}</li>}
            </ul>
          </div>
        )}

        {/* Section 1: AI System Definition & Description */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">1. AI System Definition & Description <span className="text-purple-200 font-normal">(required - Article 3, Annex I)</span></h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Describe Your AI System</label>
              <textarea
                ref={descriptionRef as React.RefObject<HTMLTextAreaElement>}
                className={`w-full border-2 rounded-lg p-3 text-sm min-h-[120px] focus:outline-none focus:ring-1 transition-colors ${
                  errors.description
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                    : 'border-gray-200 focus:border-purple-400 focus:ring-purple-200'
                }`}
                placeholder="Provide a comprehensive description of your AI system, including what it does, how it works, and what decisions or outputs it produces. Example: We use a machine learning system to evaluate consumer loan applications. The system analyzes credit history, income data, and spending patterns to produce a credit score and risk assessment that loan officers use when deciding whether to approve or deny applications..."
                value={formData.use_case_description}
                onChange={(e) => updateForm('use_case_description', e.target.value)}
              />
              <div className="flex items-center justify-between mt-2">
                {errors.description ? (
                  <p className="text-xs text-red-600 font-medium">{errors.description}</p>
                ) : (
                  <p className="text-xs text-gray-400">Detailed description required for accurate EU AI Act classification</p>
                )}
                <span className={`text-xs font-mono ${descCharCount < 50 ? 'text-amber-500' : 'text-green-600'}`}>
                  {descCharCount}/50 min
                </span>
              </div>
            </div>

            {/* AI Techniques */}
            <div ref={aiTechniquesRef as React.RefObject<HTMLDivElement>}>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Which AI techniques does your system use? <span className="text-red-500">*</span> (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { value: 'machine_learning', label: 'Machine Learning (supervised, unsupervised, semi-supervised)' },
                  { value: 'deep_learning', label: 'Deep Learning / Neural Networks' },
                  { value: 'natural_language_processing', label: 'Natural Language Processing (NLP)' },
                  { value: 'computer_vision', label: 'Computer Vision' },
                  { value: 'reinforcement_learning', label: 'Reinforcement Learning' },
                  { value: 'generative_ai', label: 'Generative AI (LLMs, diffusion models, GANs)' },
                  { value: 'expert_systems', label: 'Expert Systems / Rule-based AI' },
                  { value: 'logic_knowledge_based', label: 'Logic and knowledge-based approaches' },
                  { value: 'statistical', label: 'Statistical approaches' },
                  { value: 'bayesian', label: 'Bayesian estimation' },
                  { value: 'search_optimization', label: 'Search and optimization methods' },
                ].map(({ value, label }) => (
                  <label key={value} className={`flex items-start gap-2.5 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.ai_techniques.includes(value)
                      ? 'border-purple-400 bg-purple-50'
                      : errors.ai_techniques
                        ? 'border-red-200 hover:border-red-300 bg-red-50/30'
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={formData.ai_techniques.includes(value)}
                      onChange={() => toggleArrayValue('ai_techniques', value)}
                    />
                    <span className="text-sm text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
              {errors.ai_techniques && (
                <p className="text-xs text-red-600 font-medium mt-2">{errors.ai_techniques}</p>
              )}
            </div>

            {/* Outputs Generated */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                What outputs does your system generate? (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'predictions', label: 'Predictions' },
                  { value: 'recommendations', label: 'Recommendations' },
                  { value: 'decisions', label: 'Decisions' },
                  { value: 'classifications', label: 'Classifications' },
                  { value: 'detections', label: 'Detections' },
                  { value: 'content_generation', label: 'Content (text, images, audio, video)' },
                  { value: 'conversational_responses', label: 'Conversational responses' },
                  { value: 'translations', label: 'Translations' },
                  { value: 'transcriptions', label: 'Transcriptions' },
                  { value: 'summaries', label: 'Summaries' },
                  { value: 'analyses', label: 'Analyses / Insights' },
                  { value: 'scores', label: 'Scores / Rankings' },
                ].map(({ value, label }) => (
                  <label key={value} className={`flex items-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.outputs_generated.includes(value)
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={formData.outputs_generated.includes(value)}
                      onChange={() => toggleArrayValue('outputs_generated', value)}
                    />
                    <span className="text-sm text-gray-800">{label}</span>
                  </label>
                ))}
              </div>
            </div>



              {/* Other output text input */}
              <div className="mt-3">
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Other output (please specify):</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                  placeholder="e.g., Visualizations, Simulations, Anomaly detection, etc."
                  value={formData.outputs_generated_other}
                  onChange={(e) => updateForm('outputs_generated_other', e.target.value)}
                />
              </div>

            {/* Autonomy Level */}
            <div ref={autonomyRef as React.RefObject<HTMLDivElement>}>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Level of Autonomy <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { value: 'fully_automated', label: 'Fully Automated', desc: 'No human involvement in decision-making' },
                  { value: 'human_in_loop', label: 'Human-in-the-Loop', desc: 'Human reviews each decision before execution' },
                  { value: 'human_on_loop', label: 'Human-on-the-Loop', desc: 'Human can intervene and override decisions' },
                  { value: 'human_oversight', label: 'Human Oversight Only', desc: 'Human monitors but does not intervene' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.autonomy_level === value
                      ? 'border-purple-400 bg-purple-50'
                      : errors.autonomy_level
                        ? 'border-red-200 hover:border-red-300 bg-red-50/30'
                        : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="autonomy_level"
                      className="w-4 h-4 mt-0.5 text-purple-600 focus:ring-purple-500"
                      checked={formData.autonomy_level === value}
                      onChange={() => updateForm('autonomy_level', value)}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.autonomy_level && (
                <p className="text-xs text-red-600 font-medium mt-2">{errors.autonomy_level}</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Your Organization */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">2. Your Organization <span className="text-purple-200 font-normal">(required)</span></h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Institution Type <span className="text-red-500">*</span></label>
                <select
                  ref={institutionRef as React.RefObject<HTMLSelectElement>}
                  className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white ${
                    errors.institution_type
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                  value={formData.institution_type}
                  onChange={(e) => updateForm('institution_type', e.target.value)}
                >
                  <option value="">Select institution type...</option>
                  {INSTITUTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.institution_type && (
                  <p className="text-xs text-red-600 mt-1">{errors.institution_type}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Your Role with AI <span className="text-red-500">*</span></label>
                <select
                  ref={roleRef as React.RefObject<HTMLSelectElement>}
                  className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white ${
                    errors.role
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-gray-200 focus:border-purple-400'
                  }`}
                  value={formData.role}
                  onChange={(e) => updateForm('role', e.target.value)}
                >
                  <option value="">Select your role...</option>
                  {AI_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {errors.role && (
                  <p className="text-xs text-red-600 mt-1">{errors.role}</p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={formData.third_party_vendor}
                onChange={(e) => updateForm('third_party_vendor', e.target.checked)}
              />
              <span className="text-gray-700 group-hover:text-gray-900">I&apos;m using AI from a third-party vendor (buying/licensing AI)</span>
            </label>
          </div>
        </section>

        {/* Section 3: Prohibited Practices Check (Article 5) */}
        <section className="bg-white rounded-xl border-2 border-red-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-3">
            <h2 className="text-white font-bold text-sm">
              3. Prohibited Practices Check <span className="text-red-200 font-normal">(Article 5 - all required)</span>
            </h2>
          </div>
          <div ref={prohibitedRef as React.RefObject<HTMLDivElement>} className="p-5 space-y-1">
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <strong>CRITICAL:</strong> If ANY of these apply, your AI system is <strong>prohibited</strong> under EU AI Act Article 5 and cannot be placed on the EU market.
            </p>
            {errors.prohibited_practices && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-red-700 font-medium">{errors.prohibited_practices}</p>
              </div>
            )}
            {PROHIBITED_PRACTICES_QUESTIONS.map(({ key, question, article }) => {
              const isUnanswered = formData[key] === null
              const hasError = !!errors.prohibited_practices && isUnanswered
              const answeredYes = formData[key] === true
              return (
                <div
                  key={key}
                  className={`flex items-start justify-between gap-4 p-3.5 rounded-lg border-2 transition-colors ${
                    answeredYes
                      ? 'border-red-300 bg-red-50'
                      : hasError
                        ? 'border-red-200 bg-red-50/30'
                        : isUnanswered
                          ? 'border-gray-100 bg-gray-50/30'
                          : 'border-green-100 bg-green-50/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{question}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{article}</p>
                  </div>
                  <div className="shrink-0">
                    <TriStateToggle
                      value={formData[key]}
                      onChange={(v) => updateForm(key, v)}
                      error={hasError}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Section 4: High-Risk Assessment (Annex III) - Collapsible with all categories */}
        <section className="bg-white rounded-xl border-2 border-orange-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowAnnexIII(!showAnnexIII)}
          >
            <h2 className="text-white font-bold text-sm">4. High-Risk Classification Assessment (Annex III)</h2>
            <span className="text-white text-sm">{showAnnexIII ? '▲' : '▼'}</span>
          </button>
          {showAnnexIII && (
            <div className="p-5 space-y-5">
              <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
                Select all categories that apply to your AI system. Systems falling under these categories are classified as <strong>HIGH-RISK</strong> under Annex III of the EU AI Act.
              </p>

              {/* Annex III.1: Biometric */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.1: Biometric Identification & Categorization</h3>
                <div className="space-y-2">
                  {[
                    { key: 'biometric_identification' as const, label: 'Biometric identification of natural persons' },
                    { key: 'biometric_categorization' as const, label: 'Biometric categorization of natural persons' },
                    { key: 'remote_biometric_identification' as const, label: 'Remote biometric identification of natural persons' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.2: Critical Infrastructure */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.2: Critical Infrastructure</h3>
                <div className="space-y-2">
                  {[
                    { key: 'critical_infrastructure_safety' as const, label: 'Safety component of critical infrastructure (road traffic, water, gas, heating, electricity)' },
                    { key: 'manages_utilities' as const, label: 'Manages supply of water, gas, heating, or electricity' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-red-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.3: Education */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.3: Education and Vocational Training</h3>
                <div className="space-y-2">
                  {[
                    { key: 'educational_access' as const, label: 'Determines access or admission to educational institutions' },
                    { key: 'educational_assessment' as const, label: 'Assesses students or evaluates learning outcomes' },
                    { key: 'educational_monitoring' as const, label: 'Monitors and detects prohibited behavior of students during tests' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.4: Employment */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.4: Employment, HR, and Access to Self-Employment</h3>
                <div className="space-y-2">
                  {[
                    { key: 'recruitment_selection' as const, label: 'Recruitment or selection of persons (CV screening, interviews, assessments)' },
                    { key: 'task_allocation_employment' as const, label: 'Task allocation and work organization decisions' },
                    { key: 'performance_monitoring' as const, label: 'Monitoring and evaluation of employee performance' },
                    { key: 'promotion_termination' as const, label: 'Promotion or termination decisions' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.5: Essential Services */}
              <div className="border-l-4 border-indigo-500 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.5: Access to Essential Private/Public Services and Benefits</h3>
                <div className="space-y-2">
                  {[
                    { key: 'emergency_services' as const, label: 'Emergency first response services dispatch and prioritization' },
                    { key: 'public_assistance_benefits' as const, label: 'Evaluates eligibility for public assistance benefits and services' },
                    { key: 'creditworthiness_natural_persons' as const, label: 'Evaluates creditworthiness of natural persons (consumer credit)' },
                    { key: 'insurance_life_health' as const, label: 'Life or health insurance pricing and underwriting' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.6: Law Enforcement */}
              <div className="border-l-4 border-amber-600 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.6: Law Enforcement</h3>
                <div className="space-y-2">
                  {[
                    { key: 'law_enforcement_risk_assessment' as const, label: 'Risk assessment (risk of offending/reoffending, risk for victims, recidivism)' },
                    { key: 'law_enforcement_polygraph' as const, label: 'Polygraph and similar tools for detecting emotional state' },
                    { key: 'law_enforcement_emotion_recognition' as const, label: 'Emotion recognition of natural persons' },
                    { key: 'law_enforcement_deepfake_detection' as const, label: 'Detection of deep fakes' },
                    { key: 'law_enforcement_evidence_evaluation' as const, label: 'Evaluation of reliability of evidence in criminal proceedings' },
                    { key: 'law_enforcement_profiling' as const, label: 'Profiling of persons in criminal investigations' },
                    { key: 'law_enforcement_crime_analytics' as const, label: 'Crime analytics for prediction, detection, or prevention' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-amber-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-amber-700 focus:ring-amber-600"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.7: Migration/Asylum */}
              <div className="border-l-4 border-cyan-600 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.7: Migration, Asylum, and Border Control</h3>
                <div className="space-y-2">
                  {[
                    { key: 'migration_polygraph' as const, label: 'Polygraph and similar tools' },
                    { key: 'migration_risk_assessment' as const, label: 'Assessment of security, irregular immigration, or health risk' },
                    { key: 'migration_application_examination' as const, label: 'Examination of asylum/visa/residence permit applications' },
                    { key: 'migration_border_detection' as const, label: 'Detection of persons crossing borders illegally' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-cyan-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-cyan-700 focus:ring-cyan-600"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Annex III.8: Justice */}
              <div className="border-l-4 border-pink-600 pl-4">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Annex III.8: Administration of Justice and Democratic Processes</h3>
                <div className="space-y-2">
                  {[
                    { key: 'justice_research_interpretation' as const, label: 'Assists judicial authority in researching and interpreting facts and law' },
                    { key: 'justice_law_application' as const, label: 'Applies the law to a concrete set of facts' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 p-2.5 border rounded-lg hover:bg-pink-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-pink-700 focus:ring-pink-600"
                        checked={formData[key]}
                        onChange={(e) => updateForm(key, e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 5: Transparency Obligations (Article 52) */}
        <section className="bg-white rounded-xl border-2 border-yellow-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">5. Transparency Obligations (Article 52)</h2>
          </div>
          <div className="p-5 space-y-2">
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              Select if your AI system performs any of these functions. These require <strong>transparency disclosures</strong> under Article 52.
            </p>
            {[
              { key: 'natural_person_interaction' as const, label: 'Interacts with natural persons (chatbots, voice assistants)', article: 'Art. 52(1)' },
              { key: 'emotion_recognition_biometric' as const, label: 'Detects emotions or determines associations based on biometric data', article: 'Art. 52(2)' },
              { key: 'deepfake_generation' as const, label: 'Generates or manipulates image/audio/video content (deepfakes)', article: 'Art. 52(3)' },
              { key: 'synthetic_content_generation' as const, label: 'Generates or manipulates synthetic text content', article: 'Art. 52(3)' },
            ].map(({ key, label, article }) => (
              <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-yellow-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  checked={formData[key]}
                  onChange={(e) => updateForm(key, e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{article}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 6: Deployment Context & Intended Purpose */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">6. Deployment Context & Intended Purpose <span className="text-purple-200 font-normal">(required)</span></h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Intended Purpose */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Intended Purpose (as defined in technical documentation) <span className="text-red-500">*</span>
              </label>
              <input
                ref={purposeRef as React.RefObject<HTMLInputElement>}
                type="text"
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none ${
                  errors.intended_purpose
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-purple-400'
                }`}
                placeholder="e.g., Automated creditworthiness assessment for consumer loans"
                value={formData.intended_purpose}
                onChange={(e) => updateForm('intended_purpose', e.target.value)}
              />
              {errors.intended_purpose && (
                <p className="text-xs text-red-600 mt-1">{errors.intended_purpose}</p>
              )}
            </div>

            {/* Deployment Environment */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Primary Deployment Environment <span className="text-red-500">*</span>
              </label>
              <select
                ref={deploymentRef as React.RefObject<HTMLSelectElement>}
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white ${
                  errors.deployment_environment
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-purple-400'
                }`}
                value={formData.deployment_environment}
                onChange={(e) => updateForm('deployment_environment', e.target.value)}
              >
                <option value="">Select deployment environment...</option>
                <option value="public_space">Public Space</option>
                <option value="workplace">Workplace</option>
                <option value="educational_institution">Educational Institution</option>
                <option value="healthcare_facility">Healthcare Facility</option>
                <option value="financial_institution">Financial Institution</option>
                <option value="online_platform">Online Platform</option>
                <option value="law_enforcement">Law Enforcement</option>
                <option value="border_control">Border Control / Migration</option>
                <option value="judicial_system">Judicial System</option>
                <option value="critical_infrastructure">Critical Infrastructure</option>
                <option value="other">Other</option>
              </select>
              {errors.deployment_environment && (
                <p className="text-xs text-red-600 mt-1">{errors.deployment_environment}</p>
              )}
            </div>

            {/* User Category */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Primary User Category <span className="text-red-500">*</span>
              </label>
              <select
                ref={userCategoryRef as React.RefObject<HTMLSelectElement>}
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white ${
                  errors.user_category
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-purple-400'
                }`}
                value={formData.primary_user_category}
                onChange={(e) => updateForm('primary_user_category', e.target.value)}
              >
                <option value="">Select primary user...</option>
                <option value="public_authorities">Public Authorities</option>
                <option value="private_companies">Private Companies (B2B)</option>
                <option value="consumers">Consumers / Individuals (B2C)</option>
                <option value="professionals">Professionals (doctors, lawyers, etc.)</option>
              </select>
              {errors.user_category && (
                <p className="text-xs text-red-600 mt-1">{errors.user_category}</p>
              )}
            </div>

            {/* Geographic Scope */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Geographic Scope <span className="text-red-500">*</span>
              </label>
              <select
                ref={geographicRef as React.RefObject<HTMLSelectElement>}
                className={`w-full border-2 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white ${
                  errors.geographic_scope
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-200 focus:border-purple-400'
                }`}
                value={formData.geographic_scope}
                onChange={(e) => updateForm('geographic_scope', e.target.value)}
              >
                <option value="">Select geographic scope...</option>
                <option value="single_eu_member">Single EU Member State</option>
                <option value="multiple_eu_members">Multiple EU Member States</option>
                <option value="eu_and_outside">EU and Outside EU</option>
                <option value="outside_eu_to_eu">Outside EU but placing on EU market</option>
              </select>
              {errors.geographic_scope && (
                <p className="text-xs text-red-600 mt-1">{errors.geographic_scope}</p>
              )}
            </div>

            {/* Vulnerable Groups */}
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={formData.vulnerable_groups}
                onChange={(e) => updateForm('vulnerable_groups', e.target.checked)}
              />
              <span className="text-gray-700 group-hover:text-gray-900">
                Affects vulnerable groups (children, elderly, persons with disabilities, financially vulnerable)
              </span>
            </label>
          </div>
        </section>

        {/* Section 7: Data Governance & Quality */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">7. Data Governance & Quality</h2>
          </div>
          <div className="p-5 space-y-2">
            {[
              { key: 'uses_special_category_data' as const, label: 'Uses special category data', desc: 'Health, biometric, race/ethnicity, religion, political opinions (GDPR Art. 9)' },
              { key: 'involves_profiling' as const, label: 'Involves profiling', desc: 'Automated evaluation of personal aspects (GDPR Art. 4(4))' },
              { key: 'training_data_documented' as const, label: 'Training data sources documented', desc: 'Data provenance, sources, and lineage are documented' },
              { key: 'data_quality_measures' as const, label: 'Data quality measures implemented', desc: 'Data governance, validation, bias detection, and quality controls' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={formData[key]}
                  onChange={(e) => updateForm(key, e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Section 8: Risk Management & Compliance - Collapsible */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowCompliance(!showCompliance)}
          >
            <h2 className="text-white font-bold text-sm">8. Risk Management & Compliance</h2>
            <span className="text-white text-sm">{showCompliance ? '▲' : '▼'}</span>
          </button>
          {showCompliance && (
            <div className="p-5 space-y-2">
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                These measures are <strong>mandatory for high-risk AI systems</strong> (Articles 9-15).
              </p>
              {[
                { key: 'risk_management_system' as const, label: 'Risk management system in place', desc: 'Continuous iterative risk management process (Article 9)' },
                { key: 'human_oversight_measures' as const, label: 'Human oversight measures implemented', desc: 'Human-in-the-loop, human-on-the-loop, or human oversight (Article 14)' },
                { key: 'conformity_assessment_conducted' as const, label: 'Conformity assessment conducted', desc: 'Third-party conformity assessment or internal assessment (Article 43)' },
                { key: 'post_market_monitoring' as const, label: 'Post-market monitoring system', desc: 'Continuous monitoring of AI system performance in real-world use (Article 72)' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={formData[key]}
                    onChange={(e) => updateForm(key, e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Section 9: Technical & GPAI - Collapsible */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowTechnical(!showTechnical)}
          >
            <h2 className="text-white font-bold text-sm">9. Technical & General-Purpose AI (GPAI)</h2>
            <span className="text-white text-sm">{showTechnical ? '▲' : '▼'}</span>
          </button>
          {showTechnical && (
            <div className="p-5 space-y-2">
              {[
                { key: 'uses_gpai_model' as const, label: 'Uses General-Purpose AI model', desc: 'Built on foundation models like GPT-4, Claude, Gemini (Articles 51-56)' },
                { key: 'gpai_with_systemic_risk' as const, label: 'GPAI with systemic risk', desc: 'Models with >10^25 FLOPs or equivalent capabilities (Article 51)' },
                { key: 'safety_component' as const, label: 'Safety component of a product', desc: 'AI is a safety component regulated under EU harmonized legislation (Article 6(1))' },
                { key: 'cross_border_processing' as const, label: 'Cross-border data processing', desc: 'Processes data across EU member state borders' },
                { key: 'critical_ict_service' as const, label: 'Critical ICT service (DORA)', desc: 'Supports critical banking/financial infrastructure under DORA' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData[key]}
                    onChange={(e) => updateForm(key, e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Section 10: Sectoral Regulations - Collapsible */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowSectoral(!showSectoral)}
          >
            <h2 className="text-white font-bold text-sm">10. Sectoral Regulations (MiFID II, PSD2, AMLD)</h2>
            <span className="text-white text-sm">{showSectoral ? '▲' : '▼'}</span>
          </button>
          {showSectoral && (
            <div className="p-5 space-y-2">
              {[
                { key: 'provides_investment_advice' as const, label: 'Provides investment advice', desc: 'Subject to MiFID II suitability and appropriateness requirements' },
                { key: 'processes_payments' as const, label: 'Processes payments', desc: 'Subject to PSD2 strong customer authentication and security requirements' },
                { key: 'performs_aml_obligations' as const, label: 'Performs AML obligations', desc: 'Subject to Anti-Money Laundering Directive (AMLD) requirements' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-cyan-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    checked={formData[key]}
                    onChange={(e) => updateForm(key, e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Section 11: Article 6(3) Exemptions - High-Risk Exclusions */}
        <section className="bg-white rounded-xl border-2 border-orange-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowExemptions(!showExemptions)}
          >
            <h2 className="text-white font-bold text-sm">11. Article 6(3) Exemptions (High-Risk Exclusions)</h2>
            <span className="text-white text-sm">{showExemptions ? '▲' : '▼'}</span>
          </button>
          {showExemptions && (
            <div className="p-5 space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-orange-900">
                  <strong>Article 6(3):</strong> Even if your AI system falls under a high-risk category (Annex III),
                  it may be <strong>exempt from high-risk classification</strong> if it meets one of these criteria:
                </p>
              </div>
              {[
                {
                  key: 'narrow_procedural_task' as const,
                  label: 'Narrow procedural task',
                  desc: 'Performs a narrow procedural task (e.g., document formatting, routing) without decision-making'
                },
                {
                  key: 'improves_human_activity' as const,
                  label: 'Improves human activity result',
                  desc: 'Improves the result of a previously completed human activity (e.g., spell-check, formatting)'
                },
                {
                  key: 'detects_decision_patterns' as const,
                  label: 'Detects decision patterns only',
                  desc: 'Detects decision-making patterns or deviations without replacing or influencing human assessment'
                },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-orange-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    checked={formData[key]}
                    onChange={(e) => updateForm(key, e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-amber-900">
                  <strong>Important:</strong> These exemptions are narrow and fact-specific. Document your justification
                  carefully if claiming an exemption. Consult legal counsel for validation.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Analyzing with AI...
            </span>
          ) : (
            'Get Comprehensive Classification & Obligations'
          )}
        </button>

        {/* ─── Results Section ──────────────────────────────────────────── */}
        {results && (
          <div id="results-section" className="space-y-6">
            {/* Risk Classification Badge */}
            <div className={`rounded-xl border-2 p-6 text-center ${getRiskBadgeClasses(results.risk_classification || 'context_dependent')}`}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-70">Risk Classification</p>
              <p className="text-3xl sm:text-4xl font-bold">
                {getRiskLabel(results.risk_classification || 'context_dependent')}
              </p>
              {results.classification_basis && (
                <p className="mt-2 text-sm opacity-80">{results.classification_basis}</p>
              )}
              {results.suggested_use_case && (
                <p className="mt-1 text-xs opacity-60">Matched use case: {results.suggested_use_case.replace(/_/g, ' ')}</p>
              )}
            </div>

            {/* AI Analysis Narrative */}
            {aiAnalysis && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-indigo-800 mb-2">AI Analysis</h3>
                <div className="text-sm text-indigo-900 whitespace-pre-line leading-relaxed">
                  {aiAnalysis}
                </div>
              </div>
            )}

            {/* Validation info */}
            {results.validation && (
              <div className={`rounded-lg border p-4 ${
                results.validation.confidence === 'high' ? 'bg-green-50 border-green-200' :
                results.validation.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">Classification Confidence:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    results.validation.confidence === 'high' ? 'bg-green-200 text-green-800' :
                    results.validation.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-orange-200 text-orange-800'
                  }`}>
                    {results.validation.confidence?.toUpperCase()}
                  </span>
                </div>
                {results.validation.legal_basis && (
                  <p className="text-xs text-gray-600 mt-1">Legal basis: {results.validation.legal_basis}</p>
                )}
                {results.validation.explanation && (
                  <p className="text-xs text-gray-600 mt-1">{results.validation.explanation}</p>
                )}
              </div>
            )}

            {/* Warnings */}
            {results.warnings?.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 mb-2">Warnings</h4>
                <ul className="space-y-1">
                  {results.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">-</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Obligation Summary Cards */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Obligations by Regulation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'AI Act', count: results.ai_act_obligations?.length || 0, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
                  { label: 'GDPR', count: results.gdpr_obligations?.length || 0, bg: 'bg-green-50 border-green-200', text: 'text-green-600' },
                  { label: 'DORA', count: results.dora_obligations?.length || 0, bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
                  { label: 'GPAI', count: results.gpai_obligations?.length || 0, bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
                  { label: 'Sectoral', count: results.sectoral_obligations?.length || 0, bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-600' },
                ].map(item => (
                  <div key={item.label} className={`text-center px-3 py-3 rounded-lg border-2 ${item.bg}`}>
                    <div className={`text-2xl font-bold ${item.text}`}>{item.count}</div>
                    <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Suggestions */}
            {topSuggestions.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-800 mb-3">Top Action Items</h3>
                <div className="space-y-3">
                  {topSuggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-purple-100">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${
                        s.priority === 'critical' ? 'bg-red-600 text-white' :
                        s.priority === 'high' ? 'bg-orange-500 text-white' :
                        s.priority === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {s.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{s.action}</p>
                        {s.deadline && (
                          <p className="text-xs text-red-600 font-medium mt-1">Deadline: {s.deadline}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded Obligations by Regulation */}
            {regulationSections.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800">Detailed Obligations</h3>
                {regulationSections.map(section => (
                  <div key={section.key} className="rounded-xl border-2 border-gray-200 overflow-hidden">
                    <button
                      className={`w-full px-5 py-3 flex items-center justify-between ${section.headerBg} text-white font-bold text-sm`}
                      onClick={() => setExpandedRegulation(expandedRegulation === section.key ? null : section.key)}
                    >
                      <span>{section.label} ({section.items.length})</span>
                      <span>{expandedRegulation === section.key ? '▲' : '▼'}</span>
                    </button>
                    {expandedRegulation === section.key && (
                      <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto bg-gray-50">
                        {section.items.map((ob: Obligation) => (
                          <ObligationCard key={ob.id} obligation={ob} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Compliance Timeline */}
            {results.timeline?.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
                  <h3 className="text-white font-bold text-sm">Compliance Timeline</h3>
                </div>
                <div className="p-5">
                  <TimelineView deadlines={results.timeline} />
                </div>
              </div>
            )}

            {/* Generate PDF Button */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Generating PDF Report...
                </span>
              ) : (
                'Generate PDF Report'
              )}
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center">
          This assessment is provided for guidance only and does not constitute legal advice. Always consult qualified legal counsel for compliance decisions. The EU AI Act is complex and subject to interpretation.
        </p>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  )
}
