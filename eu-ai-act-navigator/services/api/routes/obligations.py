import asyncio
import json
import os
import urllib.request
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()


class InstitutionType(str, Enum):
    BANK = "bank"
    INSURER = "insurer"
    INVESTMENT_FIRM = "investment_firm"
    PAYMENT_PROVIDER = "payment_provider"
    CRYPTO_PROVIDER = "crypto_provider"
    ASSET_MANAGER = "asset_manager"
    PENSION_FUND = "pension_fund"
    OTHER = "other"


class AIRole(str, Enum):
    PROVIDER = "provider"
    DEPLOYER = "deployer"
    PROVIDER_AND_DEPLOYER = "provider_and_deployer"
    IMPORTER = "importer"


class AIUseCase(str, Enum):
    # === CREDIT & LENDING (HIGH-RISK under Annex III 5(b)) ===
    CREDIT_SCORING = "credit_scoring"
    CREDIT_SCORING_CONSUMER = "credit_scoring_consumer"  # Consumer credit
    CREDIT_SCORING_CORPORATE = "credit_scoring_corporate"  # B2B - may not be high-risk
    CORPORATE_RISK_OPINION = "corporate_risk_opinion"  # Multi-agent B2B risk opinion for credit officers
    LOAN_ORIGINATION = "loan_origination"
    LOAN_PRICING = "loan_pricing"
    LOAN_APPROVAL = "loan_approval"
    COLLECTIONS_RECOVERY = "collections_recovery"
    MORTGAGE_UNDERWRITING = "mortgage_underwriting"
    CREDIT_LIMIT_SETTING = "credit_limit_setting"
    DEBT_RESTRUCTURING = "debt_restructuring"
    AFFORDABILITY_ASSESSMENT = "affordability_assessment"

    # === RISK & COMPLIANCE ===
    FRAUD_DETECTION = "fraud_detection"
    FRAUD_DETECTION_CARD = "fraud_detection_card"  # Card fraud
    FRAUD_DETECTION_ACCOUNT = "fraud_detection_account"  # Account takeover
    FRAUD_DETECTION_APPLICATION = "fraud_detection_application"  # Application fraud
    AML_KYC = "aml_kyc"
    AML_TRANSACTION_MONITORING = "aml_transaction_monitoring"
    AML_CUSTOMER_RISK_SCORING = "aml_customer_risk_scoring"
    SANCTIONS_SCREENING = "sanctions_screening"
    PEP_SCREENING = "pep_screening"  # Politically Exposed Persons
    TRANSACTION_MONITORING = "transaction_monitoring"
    TRADE_SURVEILLANCE = "trade_surveillance"
    MARKET_ABUSE_DETECTION = "market_abuse_detection"
    INSIDER_TRADING_DETECTION = "insider_trading_detection"
    REGULATORY_REPORTING = "regulatory_reporting"
    COMPLIANCE_MONITORING = "compliance_monitoring"
    POLICY_BREACH_DETECTION = "policy_breach_detection"

    # === TRADING & INVESTMENT ===
    ALGORITHMIC_TRADING = "algorithmic_trading"
    HIGH_FREQUENCY_TRADING = "high_frequency_trading"
    ROBO_ADVISORY = "robo_advisory"
    ROBO_ADVISORY_RETAIL = "robo_advisory_retail"  # Retail clients
    ROBO_ADVISORY_PROFESSIONAL = "robo_advisory_professional"  # Professional clients
    PORTFOLIO_OPTIMIZATION = "portfolio_optimization"
    PORTFOLIO_REBALANCING = "portfolio_rebalancing"
    BEST_EXECUTION = "best_execution"
    MARKET_MAKING = "market_making"
    SMART_ORDER_ROUTING = "smart_order_routing"
    TRADE_COST_ANALYSIS = "trade_cost_analysis"
    INVESTMENT_RESEARCH = "investment_research"
    ESG_SCORING = "esg_scoring"

    # === INSURANCE (Only life/health is HIGH-RISK under Annex III 5(c)) ===
    INSURANCE_PRICING_LIFE = "insurance_pricing_life"  # HIGH-RISK
    INSURANCE_PRICING_HEALTH = "insurance_pricing_health"  # HIGH-RISK
    INSURANCE_PRICING_PROPERTY = "insurance_pricing_property"  # Context-dependent
    INSURANCE_PRICING_MOTOR = "insurance_pricing_motor"  # Context-dependent
    INSURANCE_PRICING_LIABILITY = "insurance_pricing_liability"  # Context-dependent
    INSURANCE_UNDERWRITING_LIFE = "insurance_underwriting_life"  # HIGH-RISK
    INSURANCE_UNDERWRITING_HEALTH = "insurance_underwriting_health"  # HIGH-RISK
    INSURANCE_UNDERWRITING_PROPERTY = "insurance_underwriting_property"  # Context-dependent
    INSURANCE_PRICING = "insurance_pricing"  # Generic - needs clarification
    INSURANCE_UNDERWRITING = "insurance_underwriting"  # Generic - needs clarification
    CLAIMS_PROCESSING = "claims_processing"
    CLAIMS_TRIAGE = "claims_triage"
    CLAIMS_FRAUD_DETECTION = "claims_fraud_detection"
    POLICY_RECOMMENDATION = "policy_recommendation"
    RISK_SELECTION = "risk_selection"
    TELEMATICS_PRICING = "telematics_pricing"  # Motor insurance

    # === CUSTOMER EXPERIENCE ===
    CUSTOMER_CHATBOT = "customer_chatbot"
    CUSTOMER_CHATBOT_ADVISORY = "customer_chatbot_advisory"  # Provides advice
    CUSTOMER_CHATBOT_TRANSACTIONAL = "customer_chatbot_transactional"  # Executes transactions
    VOICE_ASSISTANT = "voice_assistant"
    VOICE_BIOMETRIC_AUTH = "voice_biometric_auth"  # Biometric - special category
    CUSTOMER_ONBOARDING = "customer_onboarding"
    CUSTOMER_ONBOARDING_IDENTITY = "customer_onboarding_identity"  # ID verification
    CUSTOMER_SEGMENTATION = "customer_segmentation"
    CHURN_PREDICTION = "churn_prediction"
    CROSS_SELL_UPSELL = "cross_sell_upsell"
    NEXT_BEST_ACTION = "next_best_action"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    COMPLAINT_ROUTING = "complaint_routing"
    VIRTUAL_ASSISTANT_EMPLOYEE = "virtual_assistant_employee"  # Internal use

    # === OPERATIONS & BACK OFFICE ===
    DOCUMENT_PROCESSING = "document_processing"
    DOCUMENT_CLASSIFICATION = "document_classification"
    OCR_DATA_EXTRACTION = "ocr_data_extraction"
    EMAIL_SCREENING = "email_screening"
    EMAIL_CLASSIFICATION = "email_classification"
    CONTRACT_ANALYSIS = "contract_analysis"
    CONTRACT_REVIEW = "contract_review"
    PROCESS_AUTOMATION = "process_automation"
    INTELLIGENT_AUTOMATION = "intelligent_automation"
    DATA_QUALITY_MONITORING = "data_quality_monitoring"
    RECONCILIATION = "reconciliation"

    # === RISK MODELS ===
    INTERNAL_RISK_MODELS = "internal_risk_models"
    IRB_MODELS = "irb_models"  # Internal Ratings Based
    MARKET_RISK_MODELING = "market_risk_modeling"
    VAR_MODELS = "var_models"  # Value at Risk
    CREDIT_RISK_MODELING = "credit_risk_modeling"
    PD_MODELS = "pd_models"  # Probability of Default
    LGD_MODELS = "lgd_models"  # Loss Given Default
    EAD_MODELS = "ead_models"  # Exposure at Default
    OPERATIONAL_RISK = "operational_risk"
    LIQUIDITY_RISK = "liquidity_risk"
    CLIMATE_RISK = "climate_risk"
    STRESS_TESTING = "stress_testing"
    SCENARIO_ANALYSIS = "scenario_analysis"
    MODEL_VALIDATION = "model_validation"

    # === HR & EMPLOYMENT (HIGH-RISK under Annex III point 4) ===
    CV_SCREENING = "cv_screening"
    CV_PARSING = "cv_parsing"  # Just extracting data - may be exempt
    CANDIDATE_RANKING = "candidate_ranking"
    CANDIDATE_MATCHING = "candidate_matching"
    INTERVIEW_ANALYSIS = "interview_analysis"
    VIDEO_INTERVIEW_ANALYSIS = "video_interview_analysis"  # Emotion recognition
    EMPLOYEE_PERFORMANCE = "employee_performance"
    PERFORMANCE_PREDICTION = "performance_prediction"
    PROMOTION_DECISIONS = "promotion_decisions"
    TERMINATION_DECISIONS = "termination_decisions"
    WORKFORCE_PLANNING = "workforce_planning"
    EMPLOYEE_MONITORING = "employee_monitoring"
    PRODUCTIVITY_MONITORING = "productivity_monitoring"
    COMPENSATION_ANALYSIS = "compensation_analysis"
    TALENT_RETENTION = "talent_retention"
    SKILLS_ASSESSMENT = "skills_assessment"
    LEARNING_RECOMMENDATION = "learning_recommendation"
    TASK_ALLOCATION = "task_allocation"

    # === SECURITY & ACCESS ===
    ACCESS_CONTROL = "access_control"
    BIOMETRIC_AUTHENTICATION = "biometric_authentication"
    FACIAL_RECOGNITION = "facial_recognition"
    BEHAVIORAL_BIOMETRICS = "behavioral_biometrics"
    ANOMALY_DETECTION_SECURITY = "anomaly_detection_security"
    CYBER_THREAT_DETECTION = "cyber_threat_detection"

    # === PRICING & VALUATION ===
    DYNAMIC_PRICING = "dynamic_pricing"
    ASSET_VALUATION = "asset_valuation"
    COLLATERAL_VALUATION = "collateral_valuation"
    REAL_ESTATE_VALUATION = "real_estate_valuation"

    # === OTHER ===
    CUSTOM = "custom"
    OTHER = "other"


class ObligationRequest(BaseModel):
    institution_type: InstitutionType
    role: AIRole
    use_case: AIUseCase
    use_case_description: Optional[str] = None
    # Contextual factors affecting classification and obligations
    involves_natural_persons: bool = True
    involves_profiling: bool = False
    is_high_impact: bool = False
    fully_automated: bool = False
    uses_special_category_data: bool = False
    third_party_vendor: bool = False
    # Additional regulatory context filters
    cross_border_processing: bool = False  # GDPR Art. 56 - lead supervisory authority
    large_scale_processing: bool = False  # GDPR Art. 35 - DPIA trigger
    systematic_monitoring: bool = False  # GDPR Art. 35 - DPIA trigger
    vulnerable_groups: bool = False  # AI Act Recital 60 - heightened obligations
    safety_component: bool = False  # AI Act Art. 6(1) - product safety
    real_time_processing: bool = False  # Affects human oversight requirements
    affects_legal_rights: bool = False  # GDPR Art. 22 trigger
    denies_service_access: bool = False  # AI Act Annex III 5(b) trigger
    # Art. 6(3) exemption flags
    narrow_procedural_task: bool = False  # Art. 6(3)(a) exemption
    improves_human_activity: bool = False  # Art. 6(3)(b) exemption
    detects_patterns_only: bool = False  # Art. 6(3)(c) exemption
    preparatory_task: bool = False  # Art. 6(3)(d) exemption
    # Insurance specific
    life_health_insurance: bool = False  # Only life/health is high-risk
    # DORA specific
    critical_ict_service: bool = False  # DORA Art. 28 critical third-party
    outsourced_to_cloud: bool = False  # DORA cloud specific requirements
    # GPAI (General Purpose AI) specific - Art. 51-56
    uses_gpai_model: bool = False  # Using foundation models (GPT-4, Claude, Llama, etc.)
    gpai_with_systemic_risk: bool = False  # GPAI with systemic risk (>10^25 FLOPs)
    fine_tuned_gpai: bool = False  # Fine-tuned a GPAI model
    # Sectoral regulation triggers
    provides_investment_advice: bool = False  # MiFID II suitability requirements
    processes_payments: bool = False  # PSD2 requirements
    performs_aml_obligations: bool = False  # AMLD6 requirements


class CustomUseCaseRequest(BaseModel):
    description: str
    institution_type: InstitutionType
    role: AIRole


class Obligation(BaseModel):
    id: str
    name: str
    description: str
    source_regulation: str
    source_articles: List[str]
    deadline: Optional[str]
    priority: str
    action_items: List[str]
    category: Optional[str] = None
    # Role applicability
    applies_to: List[str] = []  # "provider", "deployer", "third_party_user"
    # Summary for quick reading
    summary: Optional[str] = None
    effort_level: Optional[str] = None  # "low", "medium", "high"
    # Enhanced fields for expert-level detail
    legal_basis: Optional[str] = None
    what_it_means: Optional[str] = None
    implementation_steps: Optional[List[str]] = None
    evidence_required: Optional[List[str]] = None
    penalties: Optional[str] = None
    common_pitfalls: Optional[List[str]] = None
    related_obligations: Optional[List[str]] = None
    tools_and_templates: Optional[List[str]] = None
    # Direct links to official legislation
    article_links: Optional[List[dict]] = None  # [{"article": "Art. 9", "url": "https://..."}]


# EUR-Lex base URLs for direct article links
EURLEX_AI_ACT = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"
EURLEX_GDPR = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679"
EURLEX_DORA = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554"

def get_article_link(regulation: str, article: str) -> dict:
    """Generate direct link to specific article in EUR-Lex."""
    # Base URLs with anchors where possible
    if regulation == "eu_ai_act":
        base = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689"
        return {"article": f"AI Act Art. {article}", "url": f"{base}#d1e{article}", "full_url": EURLEX_AI_ACT}
    elif regulation == "gdpr":
        base = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679"
        return {"article": f"GDPR Art. {article}", "url": f"{base}#d1e{article}", "full_url": EURLEX_GDPR}
    elif regulation == "dora":
        base = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554"
        return {"article": f"DORA Art. {article}", "url": f"{base}#d1e{article}", "full_url": EURLEX_DORA}
    return {"article": article, "url": "#"}


# Article 6(3) EXEMPTIONS - When high-risk AI is NOT considered high-risk
ART_6_3_EXEMPTIONS = """
ARTICLE 6(3) EXEMPTIONS - When Annex III high-risk AI systems are NOT high-risk:

An AI system listed in Annex III shall NOT be considered high-risk if it does not pose
a significant risk of harm to health, safety or fundamental rights, taking into account:

(a) The AI system is intended to perform a narrow procedural task;
(b) The AI system is intended to improve the result of a previously completed human activity;
(c) The AI system is intended to detect decision-making patterns or deviations from prior 
    decision-making patterns and is not meant to replace or influence the previously 
    completed human assessment without proper human review;
(d) The AI system is intended to perform a preparatory task to an assessment relevant 
    for the purposes of the use cases listed in Annex III.

IMPORTANT: The provider must document WHY the system qualifies for the exemption.
This assessment must be done BEFORE placing on market.
"""


class ObligationResponse(BaseModel):
    risk_classification: str
    classification_basis: str
    use_case_profile: Optional[dict] = None
    obligations: List[Obligation]
    ai_act_obligations: List[Obligation]
    gdpr_obligations: List[Obligation]
    dora_obligations: List[Obligation]
    gpai_obligations: List[Obligation] = []
    sectoral_obligations: List[Obligation] = []
    timeline: List[dict]
    warnings: List[str]


class CustomUseCaseResponse(BaseModel):
    use_case_name: str
    risk_classification: str
    classification_basis: str
    ai_analysis: str
    suggested_use_case: Optional[str] = None
    involves_natural_persons: bool
    involves_profiling: bool
    is_high_impact: bool
    fully_automated: bool
    uses_special_category_data: bool
    obligations: List[Obligation]
    warnings: List[str]


@router.get("/use-cases")
async def list_use_cases():
    """Return all available use cases with their profiles."""
    profiles = get_all_use_case_profiles()
    return {
        "use_cases": [
            {
                "id": key,
                "label": profile["label"],
                "category": profile.get("category", "other"),
                "risk_level": profile.get("risk_level", "context_dependent"),
                "description": profile.get("description", ""),
            }
            for key, profile in profiles.items()
        ]
    }


@router.post("/find", response_model=ObligationResponse)
async def find_obligations(request: ObligationRequest):
    risk_level = determine_risk_level(request)
    use_case_profile = get_use_case_profile(request.use_case)

    ai_act_obs = get_ai_act_obligations(
        role=request.role, risk_level=risk_level, use_case=request.use_case
    )
    gdpr_obs = get_gdpr_obligations(
        involves_profiling=request.involves_profiling,
        involves_natural_persons=request.involves_natural_persons,
        use_case=request.use_case,
        fully_automated=request.fully_automated,
        uses_special_category_data=request.uses_special_category_data,
    )
    dora_obs = get_dora_obligations(
        institution_type=request.institution_type,
        role=request.role,
        third_party_vendor=request.third_party_vendor,
    )
    gpai_obs = get_gpai_obligations(
        role=request.role,
        uses_gpai_model=request.uses_gpai_model,
        gpai_with_systemic_risk=request.gpai_with_systemic_risk,
        fine_tuned_gpai=request.fine_tuned_gpai,
    )
    sectoral_obs = get_sectoral_obligations(
        institution_type=request.institution_type,
        use_case=request.use_case,
        provides_investment_advice=request.provides_investment_advice,
        processes_payments=request.processes_payments,
        performs_aml_obligations=request.performs_aml_obligations,
    )

    all_obligations = ai_act_obs + gdpr_obs + dora_obs + gpai_obs + sectoral_obs
    timeline = build_compliance_timeline(all_obligations)

    return ObligationResponse(
        risk_classification=risk_level,
        classification_basis=get_classification_basis(request),
        use_case_profile=use_case_profile,
        obligations=all_obligations,
        ai_act_obligations=ai_act_obs,
        gdpr_obligations=gdpr_obs,
        dora_obligations=dora_obs,
        gpai_obligations=gpai_obs,
        sectoral_obligations=sectoral_obs,
        timeline=timeline,
        warnings=get_warnings(request),
    )


def _make_llm_request(provider: str, api_key: str, model: str, prompt: str, json_mode: bool = True) -> str:
    """Make a request to the specified LLM provider.
    
    Supports: openrouter, openai, anthropic
    """
    if provider == "openrouter":
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        request = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    
    elif provider == "openai":
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        request = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    
    elif provider == "anthropic":
        # Anthropic uses a different message format
        system_prompt = "You are an EU AI Act compliance expert. Respond ONLY with valid JSON, no markdown or explanation."
        payload = {
            "model": model,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": prompt}],
        }
        
        request = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["content"][0]["text"]
    
    else:
        raise ValueError(f"Unknown provider: {provider}")


def _find_base_use_case(description: str) -> Optional[AIUseCase]:
    """Try to find a base use case from a 'Based on:' description."""
    if not description.startswith("Based on:"):
        return None
    
    desc_lower = description.lower()
    
    # Map common labels to use cases
    # More specific first: risk opinion / multi-agent B2B → corporate_risk_opinion; then corporate vs consumer
    use_case_mapping = {
        "risk opinion": AIUseCase.CORPORATE_RISK_OPINION,
        "multi-agent": AIUseCase.CORPORATE_RISK_OPINION,
        "multi agent": AIUseCase.CORPORATE_RISK_OPINION,
        "credit scoring - corporate": AIUseCase.CREDIT_SCORING_CORPORATE,
        "corporate/b2b": AIUseCase.CREDIT_SCORING_CORPORATE,
        "credit scoring (consumer)": AIUseCase.CREDIT_SCORING_CONSUMER,
        "credit scoring - consumer": AIUseCase.CREDIT_SCORING_CONSUMER,
        "credit scoring": AIUseCase.CREDIT_SCORING,
        "loan origination": AIUseCase.LOAN_ORIGINATION,
        "loan approval": AIUseCase.LOAN_APPROVAL,
        "mortgage underwriting": AIUseCase.MORTGAGE_UNDERWRITING,
        "fraud detection": AIUseCase.FRAUD_DETECTION,
        "aml/kyc": AIUseCase.AML_KYC,
        "aml/kyc screening": AIUseCase.AML_KYC,
        "customer chatbot": AIUseCase.CUSTOMER_CHATBOT,
        "robo-advisory": AIUseCase.ROBO_ADVISORY,
        "algorithmic trading": AIUseCase.ALGORITHMIC_TRADING,
        "insurance pricing": AIUseCase.INSURANCE_PRICING,
        "insurance pricing (life)": AIUseCase.INSURANCE_PRICING_LIFE,
        "insurance pricing (health)": AIUseCase.INSURANCE_PRICING_HEALTH,
        "claims processing": AIUseCase.CLAIMS_PROCESSING,
        "cv screening": AIUseCase.CV_SCREENING,
        "resume screening": AIUseCase.CV_SCREENING,
        "recruitment": AIUseCase.CV_SCREENING,
        "video interview": AIUseCase.VIDEO_INTERVIEW_ANALYSIS,
        "employee performance": AIUseCase.EMPLOYEE_PERFORMANCE,
        "document processing": AIUseCase.DOCUMENT_PROCESSING,
        "sentiment analysis": AIUseCase.SENTIMENT_ANALYSIS,
        "biometric": AIUseCase.BIOMETRIC_AUTHENTICATION,
    }
    
    for label, use_case in use_case_mapping.items():
        if label in desc_lower:
            return use_case
    
    return None


@router.post("/analyze-custom", response_model=CustomUseCaseResponse)
async def analyze_custom_use_case(
    request: CustomUseCaseRequest,
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: Optional[str] = Header(None, alias="X-LLM-API-Key"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """Analyze a custom use case description and determine obligations.
    
    API keys can be passed via headers:
    - X-LLM-Provider: openrouter, openai, or anthropic
    - X-LLM-API-Key: Your API key
    - X-LLM-Model: Model ID to use
    
    Without headers, falls back to rule-based analysis for "Modify" requests.
    """
    # Check if API key is provided in headers
    has_api_key = x_llm_provider and x_llm_api_key and x_llm_model

    if not has_api_key:
        # No LLM - check if this is a "Modify" request (starts with "Based on:")
        base_use_case = _find_base_use_case(request.description)
        
        if base_use_case:
            # This is a "Modify" request - use the base use case's obligations
            # Extract the user's modification note
            mod_note = ""
            if "User modification:" in request.description:
                mod_note = request.description.split("User modification:")[-1].strip()
            
            # Get obligations for the base use case
            mock_request = ObligationRequest(
                institution_type=request.institution_type,
                role=request.role,
                use_case=base_use_case,
                involves_natural_persons=True,
                involves_profiling=False,
                is_high_impact=False,
                fully_automated=False,
                uses_special_category_data=False,
                third_party_vendor=False,
            )
            
            risk_level = determine_risk_level(mock_request)
            ai_act_obs = get_ai_act_obligations(
                role=request.role,
                risk_level=risk_level,
                use_case=base_use_case,
            )
            gdpr_obs = get_gdpr_obligations(
                involves_profiling=False,
                involves_natural_persons=True,
                use_case=base_use_case,
                fully_automated=False,
                uses_special_category_data=False,
            )
            dora_obs = get_dora_obligations(
                institution_type=request.institution_type,
                role=request.role,
                third_party_vendor=False,
            )
            
            return CustomUseCaseResponse(
                use_case_name=f"Modified: {base_use_case.value.replace('_', ' ').title()}",
                risk_classification=risk_level,
                classification_basis=get_classification_basis(mock_request),
                ai_analysis=(
                    f"📋 **Using base use case obligations** (no LLM configured)\n\n"
                    f"Base: {base_use_case.value.replace('_', ' ').title()}\n\n"
                    f"Your modification: {mod_note if mod_note else 'Not specified'}\n\n"
                    f"⚠️ **Note**: These obligations are for the base use case. "
                    f"Your modifications may affect the risk classification. "
                    f"For AI-powered analysis of modifications, install Ollama (free)."
                ),
                suggested_use_case=base_use_case.value,
                involves_natural_persons=True,
                involves_profiling=False,
                is_high_impact=risk_level == "high_risk",
                fully_automated=False,
                uses_special_category_data=False,
                obligations=ai_act_obs + gdpr_obs + dora_obs,
                warnings=[
                    "⚠️ Using base use case obligations (no LLM configured).",
                    f"Your modification: '{mod_note[:100]}...' may affect classification." if mod_note else "",
                    "For precise analysis of modifications, install Ollama (free): https://ollama.ai",
                ],
            )
        
        # Pure custom use case without LLM - provide guidance
        return CustomUseCaseResponse(
            use_case_name="Custom Use Case Analysis",
            risk_classification="context_dependent",
            classification_basis="Configure API key in Settings for AI analysis",
            ai_analysis=(
                "**No API key configured.** Go to **Settings** to add your API key.\n\n"
                "**In the meantime:**\n"
                "1. Use one of the 120+ predefined use cases which have accurate regulatory mappings\n"
                "2. Use the 'Modify' button to customize a similar use case\n\n"
                "Supported providers: OpenRouter, OpenAI, Anthropic"
            ),
            involves_natural_persons=True,
            involves_profiling=False,
            is_high_impact=False,
            fully_automated=False,
            uses_special_category_data=False,
            obligations=[],
            warnings=[
                "No API key configured - go to Settings to add one.",
                "Tip: Use predefined use cases for the most accurate regulatory mapping."
            ],
        )

    # Use API key from headers
    prompt = f"""You are an EU AI Act compliance expert for financial institutions.

Analyze this AI use case description and determine its regulatory classification:

USE CASE: {request.description}
INSTITUTION TYPE: {request.institution_type.value}
ROLE: {request.role.value}

Respond in JSON format with these fields:
{{
  "use_case_name": "Short name for this use case",
  "risk_classification": "high_risk" | "limited_risk" | "minimal_risk" | "context_dependent",
  "classification_basis": "AI Act article/annex reference",
  "analysis": "2-3 sentence explanation",
  "involves_natural_persons": true/false,
  "involves_profiling": true/false,
  "is_high_impact": true/false,
  "fully_automated": true/false,
  "uses_special_category_data": true/false,
  "suggested_existing_use_case": "closest matching standard use case or null",
  "key_obligations": ["list of key obligations"],
  "warnings": ["list of compliance warnings"]
}}

Consider:
- Annex III 5(b) applies ONLY to creditworthiness of NATURAL PERSONS (consumers). B2B/corporate credit evaluation is NOT high-risk under Annex III 5(b).
- Multi-agent systems that produce a risk opinion for B2B/corporate entities, where a human credit officer makes the final decision, are MINIMAL_RISK (not context_dependent).
- Annex III high-risk categories (credit for natural persons, insurance life/health, employment, essential services)
- Article 50 transparency requirements
- GDPR Article 22 automated decision-making
- DORA ICT risk requirements for financial entities"""

    try:
        result = await asyncio.to_thread(
            _make_llm_request,
            x_llm_provider,
            x_llm_api_key,
            x_llm_model,
            prompt,
            True,  # json_mode
        )
        analysis = json.loads(result)
    except json.JSONDecodeError as e:
        # LLM returned non-JSON response, try to extract useful info
        return CustomUseCaseResponse(
            use_case_name="Custom Use Case",
            risk_classification="context_dependent",
            classification_basis="Manual assessment required",
            ai_analysis=f"AI response received but couldn't parse JSON. Raw response may contain useful info.",
            involves_natural_persons=True,
            involves_profiling=False,
            is_high_impact=False,
            fully_automated=False,
            uses_special_category_data=False,
            obligations=[],
            warnings=["AI response format error. Try a different model or use predefined use cases."],
        )
    except Exception as e:
        error_msg = str(e)
        return CustomUseCaseResponse(
            use_case_name="Custom Use Case",
            risk_classification="context_dependent",
            classification_basis="Manual assessment required",
            ai_analysis=f"Analysis failed: {error_msg}",
            involves_natural_persons=True,
            involves_profiling=False,
            is_high_impact=False,
            fully_automated=False,
            uses_special_category_data=False,
            obligations=[],
            warnings=[
                f"AI analysis failed ({x_llm_provider}). Manual review recommended.",
                "Tip: Use predefined use cases for accurate regulatory mapping."
            ],
        )

    # Build obligations based on analysis
    mock_request = ObligationRequest(
        institution_type=request.institution_type,
        role=request.role,
        use_case=AIUseCase.CUSTOM,
        involves_natural_persons=analysis.get("involves_natural_persons", True),
        involves_profiling=analysis.get("involves_profiling", False),
        is_high_impact=analysis.get("is_high_impact", False),
        fully_automated=analysis.get("fully_automated", False),
        uses_special_category_data=analysis.get("uses_special_category_data", False),
        third_party_vendor=False,
    )

    risk_level = analysis.get("risk_classification", "context_dependent")
    if risk_level == "high_risk" or analysis.get("is_high_impact"):
        mock_request.is_high_impact = True

    ai_act_obs = get_ai_act_obligations(
        role=request.role,
        risk_level=risk_level,
        use_case=AIUseCase.CUSTOM,
    )
    gdpr_obs = get_gdpr_obligations(
        involves_profiling=mock_request.involves_profiling,
        involves_natural_persons=mock_request.involves_natural_persons,
        use_case=AIUseCase.CUSTOM,
        fully_automated=mock_request.fully_automated,
        uses_special_category_data=mock_request.uses_special_category_data,
    )
    dora_obs = get_dora_obligations(
        institution_type=request.institution_type,
        role=request.role,
        third_party_vendor=False,
    )

    return CustomUseCaseResponse(
        use_case_name=analysis.get("use_case_name", "Custom Use Case"),
        risk_classification=risk_level,
        classification_basis=analysis.get("classification_basis", ""),
        ai_analysis=analysis.get("analysis", ""),
        suggested_use_case=analysis.get("suggested_existing_use_case"),
        involves_natural_persons=analysis.get("involves_natural_persons", True),
        involves_profiling=analysis.get("involves_profiling", False),
        is_high_impact=analysis.get("is_high_impact", False),
        fully_automated=analysis.get("fully_automated", False),
        uses_special_category_data=analysis.get("uses_special_category_data", False),
        obligations=ai_act_obs + gdpr_obs + dora_obs,
        warnings=analysis.get("warnings", []),
    )


def _openrouter_request(api_key: str, model: str, prompt: str) -> str:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"]


def check_art_6_3_exemption(request: ObligationRequest) -> tuple[bool, str]:
    """
    Check if Art. 6(3) exemption applies - when high-risk AI is NOT considered high-risk.
    Returns (is_exempt, reason).
    """
    exemptions = []
    
    if request.narrow_procedural_task:
        exemptions.append("Art. 6(3)(a): Narrow procedural task")
    if request.improves_human_activity:
        exemptions.append("Art. 6(3)(b): Improves previously completed human activity")
    if request.detects_patterns_only:
        exemptions.append("Art. 6(3)(c): Detects patterns without replacing human assessment")
    if request.preparatory_task:
        exemptions.append("Art. 6(3)(d): Preparatory task for human assessment")
    
    if exemptions:
        return True, "; ".join(exemptions)
    return False, ""


def determine_risk_level(request: ObligationRequest) -> str:
    """
    Determine AI Act risk classification based on Annex III, Art. 6, and exemptions.
    
    HIGH-RISK (Annex III):
    - Point 4: Employment/HR (recruitment, promotion, termination, task allocation, monitoring)
    - Point 5(b): Access to essential private services (credit, credit scoring)
    - Point 5(c): Life and health insurance risk assessment and pricing (NOT property/liability!)
    
    EXEMPTIONS (Art. 6(3)): Even if listed in Annex III, NOT high-risk if:
    (a) narrow procedural task
    (b) improves previously completed human activity
    (c) detects patterns without replacing human assessment
    (d) preparatory task for human assessment
    """
    
    # === ANNEX III HIGH-RISK CATEGORIES ===
    
    # Point 5(b) - Creditworthiness assessment of natural persons
    credit_high_risk = [
        AIUseCase.CREDIT_SCORING,
        AIUseCase.CREDIT_SCORING_CONSUMER,
        AIUseCase.LOAN_ORIGINATION,
        AIUseCase.LOAN_APPROVAL,
        AIUseCase.MORTGAGE_UNDERWRITING,
        AIUseCase.CREDIT_LIMIT_SETTING,
        AIUseCase.AFFORDABILITY_ASSESSMENT,
    ]
    
    # Point 5(c) - Life and health insurance ONLY
    insurance_high_risk = [
        AIUseCase.INSURANCE_PRICING_LIFE,
        AIUseCase.INSURANCE_PRICING_HEALTH,
        AIUseCase.INSURANCE_UNDERWRITING_LIFE,
        AIUseCase.INSURANCE_UNDERWRITING_HEALTH,
    ]
    
    # Generic insurance - depends on life_health_insurance flag
    insurance_generic = [
        AIUseCase.INSURANCE_PRICING,
        AIUseCase.INSURANCE_UNDERWRITING,
    ]
    
    # Point 4 - Employment and HR
    hr_high_risk = [
        AIUseCase.CV_SCREENING,
        AIUseCase.CANDIDATE_RANKING,
        AIUseCase.CANDIDATE_MATCHING,
        AIUseCase.INTERVIEW_ANALYSIS,
        AIUseCase.VIDEO_INTERVIEW_ANALYSIS,
        AIUseCase.EMPLOYEE_PERFORMANCE,
        AIUseCase.PERFORMANCE_PREDICTION,
        AIUseCase.PROMOTION_DECISIONS,
        AIUseCase.TERMINATION_DECISIONS,
        AIUseCase.EMPLOYEE_MONITORING,
        AIUseCase.PRODUCTIVITY_MONITORING,
        AIUseCase.TASK_ALLOCATION,
    ]
    
    # Biometric identification (Annex III point 1)
    biometric_high_risk = [
        AIUseCase.FACIAL_RECOGNITION,
        AIUseCase.BIOMETRIC_AUTHENTICATION,
        AIUseCase.VOICE_BIOMETRIC_AUTH,
    ]
    
    # === NOT HIGH-RISK - Corporate/B2B ===
    not_high_risk_corporate = [
        AIUseCase.CREDIT_SCORING_CORPORATE,  # B2B not covered by Annex III 5(b)
        AIUseCase.CORPORATE_RISK_OPINION,  # Multi-agent B2B risk opinion; human officer decides
    ]
    
    # === LIMITED RISK (Art. 50) ===
    limited_risk = [
        AIUseCase.CUSTOMER_CHATBOT,
        AIUseCase.CUSTOMER_CHATBOT_ADVISORY,
        AIUseCase.CUSTOMER_CHATBOT_TRANSACTIONAL,
        AIUseCase.VOICE_ASSISTANT,
        AIUseCase.VIRTUAL_ASSISTANT_EMPLOYEE,
    ]
    
    # === POTENTIALLY HIGH-RISK (depends on context) ===
    potentially_high_risk = [
        AIUseCase.AML_KYC,
        AIUseCase.AML_CUSTOMER_RISK_SCORING,
        AIUseCase.FRAUD_DETECTION,
        AIUseCase.FRAUD_DETECTION_CARD,
        AIUseCase.FRAUD_DETECTION_ACCOUNT,
        AIUseCase.FRAUD_DETECTION_APPLICATION,
        AIUseCase.COLLECTIONS_RECOVERY,
        AIUseCase.ROBO_ADVISORY,
        AIUseCase.ROBO_ADVISORY_RETAIL,
        AIUseCase.CUSTOMER_ONBOARDING,
        AIUseCase.CUSTOMER_ONBOARDING_IDENTITY,
    ]
    
    # === DETERMINE CLASSIFICATION ===
    
    # Check explicit NOT high-risk cases
    if request.use_case in not_high_risk_corporate:
        return "minimal_risk"
    
    # Check if potentially high-risk based on Annex III
    is_annex_iii_high_risk = (
        request.use_case in credit_high_risk or
        request.use_case in insurance_high_risk or
        request.use_case in hr_high_risk or
        request.use_case in biometric_high_risk or
        (request.use_case in insurance_generic and request.life_health_insurance)
    )
    
    # If listed in Annex III, check for Art. 6(3) exemptions
    if is_annex_iii_high_risk:
        is_exempt, _ = check_art_6_3_exemption(request)
        if is_exempt:
            return "exempt_from_high_risk"  # Special classification
        return "high_risk"
    
    # Limited risk systems
    if request.use_case in limited_risk:
        return "limited_risk"
    
    # Context-dependent checks
    if request.use_case in potentially_high_risk:
        # If denies service access, it's effectively high-risk
        if request.denies_service_access or request.affects_legal_rights:
            return "high_risk"
        if request.is_high_impact or request.fully_automated:
            return "high_risk"
    
    # Safety component check (Art. 6(1))
    if request.safety_component:
        return "high_risk"
    
    # General high impact check
    if request.is_high_impact:
        return "high_risk"
    
    return "context_dependent"


def get_ai_act_obligations(
    role: AIRole, risk_level: str, use_case: AIUseCase
) -> List[Obligation]:
    obligations: List[Obligation] = []

    # Limited risk obligations (chatbots, emotion recognition disclosure)
    if risk_level == "limited_risk":
        obligations.append(
            Obligation(
                id="transparency_disclosure",
                name="AI Transparency Disclosure (Art. 50)",
                description="Persons interacting with the AI system must be informed they are interacting with an AI, unless obvious from context.",
                source_regulation="eu_ai_act",
                source_articles=["50(1)", "50(2)"],
                deadline="2026-08-02",
                priority="medium",
                action_items=[
                    "Add clear AI disclosure at point of interaction",
                    "Update UI/UX to include AI indicator",
                    "Document disclosure mechanism",
                ],
                category="transparency",
                applies_to=["provider", "deployer"],
                summary="Tell users they're interacting with AI, not a human.",
                legal_basis="Article 50(1): Providers shall ensure that AI systems intended to directly interact with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system.",
                what_it_means="Users must know they're talking to an AI, not a human. This applies to chatbots, voice assistants, and any AI that directly interacts with people.",
                implementation_steps=[
                    "1. Identify all user touchpoints where AI interaction occurs",
                    "2. Design clear, visible disclosure (e.g., 'You are chatting with an AI assistant')",
                    "3. Implement disclosure before or at the start of interaction",
                    "4. Ensure disclosure is accessible (consider language, accessibility needs)",
                    "5. Document the disclosure mechanism in your compliance records",
                ],
                evidence_required=[
                    "Screenshots/recordings of disclosure in action",
                    "User interface specifications showing disclosure placement",
                    "User testing results confirming disclosure visibility",
                ],
                penalties="Up to €15 million or 3% of annual worldwide turnover for transparency violations.",
                common_pitfalls=[
                    "Disclosure buried in terms of service (must be prominent)",
                    "Disclosure appearing after interaction has started",
                    "Technical jargon that users don't understand",
                ],
                related_obligations=["logging"],
            )
        )

    if risk_level != "high_risk":
        return obligations

    # HIGH-RISK AI OBLIGATIONS - Comprehensive requirements

    # 1. RISK MANAGEMENT SYSTEM (Art. 9)
    obligations.append(
        Obligation(
            id="risk_management_system",
            name="Risk Management System (Art. 9)",
            description="Establish, implement, document and maintain a risk management system throughout the entire lifecycle of the high-risk AI system.",
            source_regulation="eu_ai_act",
            source_articles=["9(1)", "9(2)", "9(3)", "9(4)", "9(5)", "9(6)", "9(7)"],
            deadline="2026-08-02",
            priority="critical",
            action_items=[
                "Identify and analyze known and foreseeable risks",
                "Estimate and evaluate risks from intended use and reasonably foreseeable misuse",
                "Evaluate risks from post-market monitoring data",
                "Adopt appropriate risk mitigation measures",
                "Test system to identify most appropriate risk management measures",
                "Document all risk management activities",
            ],
            category="governance",
            applies_to=["provider"],
            summary="Create and maintain a continuous risk management process for your AI system.",
            effort_level="high",
            legal_basis="Article 9(1): A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems.",
            what_it_means="You must have a continuous, documented process for identifying, analyzing, and mitigating risks throughout the AI system's entire lifecycle - from design through deployment to decommissioning.",
            implementation_steps=[
                "1. IDENTIFY RISKS: Map all potential risks including bias, errors, security vulnerabilities, misuse scenarios",
                "2. ANALYZE RISKS: Assess likelihood and severity of each risk, considering vulnerable groups",
                "3. EVALUATE RISKS: Determine acceptable risk levels based on intended purpose and context",
                "4. MITIGATE RISKS: Implement technical and organizational measures to reduce risks",
                "5. TEST MEASURES: Validate that mitigation measures are effective",
                "6. RESIDUAL RISKS: Document any remaining risks and communicate to deployers/users",
                "7. ITERATE: Continuously update risk assessment based on new data and incidents",
            ],
            evidence_required=[
                "Risk management policy and procedures document",
                "Risk register with identified risks, assessments, and mitigation measures",
                "Risk assessment methodology documentation",
                "Testing protocols and results for risk mitigation measures",
                "Records of risk management reviews and updates",
                "Communication records of residual risks to deployers",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover for non-compliance with high-risk requirements.",
            common_pitfalls=[
                "One-time risk assessment instead of continuous process",
                "Failing to consider reasonably foreseeable misuse",
                "Not involving domain experts in risk identification",
                "Inadequate documentation of risk decisions",
                "Not updating risks based on post-market data",
            ],
            related_obligations=["data_governance", "human_oversight", "accuracy_robustness", "post_market_monitoring"],
            tools_and_templates=[
                "ISO 31000 Risk Management Framework",
                "AI Risk Assessment Matrix Template",
                "NIST AI Risk Management Framework",
            ],
        )
    )

    # 2. DATA GOVERNANCE (Art. 10)
    obligations.append(
        Obligation(
            id="data_governance",
            name="Data and Data Governance (Art. 10)",
            description="Training, validation and testing data sets shall be subject to appropriate data governance and management practices.",
            source_regulation="eu_ai_act",
            source_articles=["10(1)", "10(2)", "10(3)", "10(4)", "10(5)", "10(6)"],
            deadline="2026-08-02",
            priority="critical",
            action_items=[
                "Document data collection processes and sources",
                "Implement data quality criteria (relevance, representativeness, accuracy)",
                "Examine data for biases and gaps",
                "Ensure appropriate statistical properties for intended geography/context",
                "Address bias detection and correction where technically feasible",
                "Consider special category data handling under GDPR Art. 9",
            ],
            category="data",
            applies_to=["provider"],
            summary="Ensure your training data is high quality, representative, and free from harmful biases.",
            effort_level="high",
            legal_basis="Article 10(2): Training, validation and testing data sets shall be subject to data governance and management practices appropriate for the intended purpose of the AI system.",
            what_it_means="Your training data must be high quality, representative, and free from harmful biases. You need documented processes for data collection, preparation, and ongoing quality management.",
            implementation_steps=[
                "1. DATA INVENTORY: Catalog all datasets used for training, validation, testing",
                "2. PROVENANCE: Document origin, collection method, and legal basis for each dataset",
                "3. QUALITY ASSESSMENT: Define and measure quality criteria (accuracy, completeness, timeliness)",
                "4. REPRESENTATIVENESS: Ensure data represents the population/context where AI will be used",
                "5. BIAS ANALYSIS: Conduct statistical analysis to detect potential biases",
                "6. GAP ANALYSIS: Identify underrepresented groups or scenarios",
                "7. REMEDIATION: Implement bias mitigation techniques (resampling, reweighting, etc.)",
                "8. DOCUMENTATION: Maintain data cards/datasheets for all datasets",
            ],
            evidence_required=[
                "Data governance policy and procedures",
                "Dataset documentation (datasheets/data cards)",
                "Data lineage and provenance records",
                "Data quality metrics and monitoring reports",
                "Bias analysis reports and mitigation measures",
                "Data processing agreements where applicable",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover.",
            common_pitfalls=[
                "Using convenience samples that don't represent deployment population",
                "Failing to detect proxy discrimination",
                "Inadequate documentation of data sources",
                "Not updating training data as population changes",
                "Ignoring edge cases and minority groups",
            ],
            related_obligations=["risk_management_system", "technical_documentation", "accuracy_robustness"],
            tools_and_templates=[
                "Data Cards / Datasheets for Datasets",
                "Fairness metrics (demographic parity, equalized odds)",
                "IBM AI Fairness 360, Google What-If Tool",
            ],
        )
    )

    # 3. TECHNICAL DOCUMENTATION (Art. 11)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="technical_documentation",
                name="Technical Documentation (Art. 11 & Annex IV)",
                description="Draw up technical documentation before placing on market or putting into service, kept up-to-date throughout lifecycle.",
                source_regulation="eu_ai_act",
                source_articles=["11(1)", "11(2)", "Annex IV"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Document general system description and intended purpose",
                    "Document system architecture and computational resources",
                    "Document training methodologies and data processing",
                    "Document validation and testing procedures",
                    "Document accuracy, robustness, and cybersecurity measures",
                    "Maintain change log for all updates",
                ],
                category="documentation",
                applies_to=["provider"],
                summary="Create comprehensive documentation for your AI system - your compliance dossier.",
                effort_level="high",
                legal_basis="Article 11(1): The technical documentation shall be drawn up before that system is placed on the market or put into service.",
                what_it_means="You must create and maintain comprehensive documentation that allows authorities to assess compliance. This is your 'compliance dossier' for the AI system.",
                implementation_steps=[
                    "1. GENERAL DESCRIPTION: Name, version, intended purpose, intended users, foreseeable misuse",
                    "2. SYSTEM ARCHITECTURE: Hardware requirements, model architecture, algorithms used",
                    "3. DEVELOPMENT PROCESS: Design choices, training methodology, hyperparameter tuning",
                    "4. DATA DOCUMENTATION: Training/validation/test data descriptions, preprocessing steps",
                    "5. PERFORMANCE METRICS: Accuracy, precision, recall, fairness metrics, benchmarks used",
                    "6. RISK MANAGEMENT: Link to risk management documentation",
                    "7. INSTRUCTIONS FOR USE: Clear guidance for deployers on proper use",
                    "8. VALIDATION RESULTS: Test results, known limitations, failure modes",
                ],
                evidence_required=[
                    "Complete technical documentation per Annex IV requirements",
                    "System architecture diagrams",
                    "Model cards with performance metrics",
                    "Training and evaluation reports",
                    "Change log and version history",
                    "Instructions for use document",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Documentation not kept current with system updates",
                    "Missing information required by Annex IV",
                    "Documentation too technical for non-experts to understand",
                    "Failing to document known limitations",
                ],
                related_obligations=["risk_management_system", "conformity_assessment", "quality_management"],
                tools_and_templates=[
                    "Model Cards (Google format)",
                    "AI System Documentation Template (Annex IV)",
                    "IEEE AI System Documentation Standard",
                ],
            )
        )

    # 4. RECORD-KEEPING / LOGGING (Art. 12)
    obligations.append(
        Obligation(
            id="automatic_logging",
            name="Automatic Logging & Record-Keeping (Art. 12)",
            description="High-risk AI systems shall be designed to automatically record events (logs) during operation, enabling traceability.",
            source_regulation="eu_ai_act",
            source_articles=["12(1)", "12(2)", "12(3)", "12(4)"],
            deadline="2026-08-02",
            priority="high",
            action_items=[
                "Implement automatic logging of all AI-related events",
                "Log input data (or reference to data) for each operation",
                "Log system outputs and decisions",
                "Ensure logs enable identification of risk situations",
                "Define log retention period (minimum as specified in use-case regulations)",
                "Protect logs from tampering",
            ],
            category="operations",
            applies_to=["provider", "deployer"],
            summary="Keep detailed, tamper-proof logs of all AI decisions for audit and traceability.",
            effort_level="medium",
            legal_basis="Article 12(1): High-risk AI systems shall technically allow for the automatic recording of events (logs) over the lifetime of the system.",
            what_it_means="Your AI system must keep detailed logs that allow you to trace what happened, when, and why. These logs are essential for auditing, incident investigation, and demonstrating compliance.",
            implementation_steps=[
                "1. IDENTIFY LOGGABLE EVENTS: Inputs, outputs, decisions, errors, user interactions, system state changes",
                "2. DESIGN LOG SCHEMA: Structured format including timestamp, event type, data references, outputs",
                "3. IMPLEMENT LOGGING: Automatic, tamper-resistant logging at system level",
                "4. ENSURE TRACEABILITY: Link logs to enable reconstruction of decision chains",
                "5. SET RETENTION: Define retention period based on use case (credit: 5+ years, etc.)",
                "6. SECURE LOGS: Implement access controls, integrity checks, encryption",
                "7. MONITOR LOGGING: Ensure logging system is functioning correctly",
            ],
            evidence_required=[
                "Logging system architecture and specifications",
                "Sample logs demonstrating required information capture",
                "Log retention policy",
                "Access control and security measures for logs",
                "Testing evidence that logs enable traceability",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover.",
            common_pitfalls=[
                "Logs not detailed enough to reconstruct decisions",
                "Personal data in logs without proper GDPR compliance",
                "Logs deletable or modifiable",
                "Retention period too short for regulatory requirements",
            ],
            related_obligations=["human_oversight", "post_market_monitoring"],
        )
    )

    # 5. TRANSPARENCY & INFORMATION (Art. 13)
    obligations.append(
        Obligation(
            id="transparency_information",
            name="Transparency & Information to Deployers (Art. 13)",
            description="High-risk AI systems shall be designed to ensure operation is sufficiently transparent to enable deployers to interpret outputs and use appropriately.",
            source_regulation="eu_ai_act",
            source_articles=["13(1)", "13(2)", "13(3)"],
            deadline="2026-08-02",
            priority="high",
            action_items=[
                "Provide clear instructions for use to deployers",
                "Document system capabilities and limitations",
                "Provide information on accuracy levels and error rates",
                "Explain factors affecting performance",
                "Describe human oversight measures",
                "Make information accessible and understandable",
            ],
            category="transparency",
            applies_to=["provider"],
            summary="Provide clear documentation so deployers understand how to use AI properly.",
            effort_level="medium",
            legal_basis="Article 13(1): High-risk AI systems shall be designed and developed in such a way as to ensure that their operation is sufficiently transparent.",
            what_it_means="Deployers must be able to understand how the AI works well enough to use it properly, interpret its outputs, and exercise appropriate human oversight.",
            implementation_steps=[
                "1. CREATE INSTRUCTIONS FOR USE: Clear, comprehensive guidance document",
                "2. DOCUMENT CAPABILITIES: What the system can and cannot do",
                "3. DOCUMENT LIMITATIONS: Known failure modes, edge cases, constraints",
                "4. PERFORMANCE INFORMATION: Accuracy metrics, confidence levels, error rates",
                "5. USAGE GUIDANCE: Proper use, prohibited uses, monitoring requirements",
                "6. OVERSIGHT REQUIREMENTS: How deployers should supervise the system",
                "7. VALIDATION: Test that documentation is understandable by target audience",
            ],
            evidence_required=[
                "Instructions for use document",
                "Performance specification sheet",
                "Limitations and constraints documentation",
                "Human oversight guidance",
                "User testing results for documentation clarity",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover.",
            common_pitfalls=[
                "Overly technical language inaccessible to deployers",
                "Understating limitations or failure modes",
                "Not updating documentation when system changes",
            ],
            related_obligations=["technical_documentation", "human_oversight"],
        )
    )

    # 6. HUMAN OVERSIGHT (Art. 14)
    obligations.append(
        Obligation(
            id="human_oversight",
            name="Human Oversight Measures (Art. 14)",
            description="High-risk AI systems shall be designed to be effectively overseen by natural persons during use, including ability to understand, monitor, and intervene.",
            source_regulation="eu_ai_act",
            source_articles=["14(1)", "14(2)", "14(3)", "14(4)", "14(5)"],
            deadline="2026-08-02",
            priority="critical",
            action_items=[
                "Design system to allow human understanding of AI capabilities/limitations",
                "Implement tools to monitor AI operation in real-time",
                "Enable humans to interpret AI outputs correctly",
                "Allow humans to decide not to use AI output",
                "Enable intervention or system stop capability",
                "Build in automation bias mitigation",
            ],
            category="operations",
            applies_to=["provider", "deployer"],
            summary="Humans must be able to understand, monitor, and override AI decisions.",
            effort_level="high",
            legal_basis="Article 14(1): High-risk AI systems shall be designed and developed in such a way, including with appropriate human-machine interface tools, that they can be effectively overseen by natural persons.",
            what_it_means="Humans must remain in control. They need tools to understand what the AI is doing, monitor its operation, and intervene when necessary. The system cannot make fully autonomous decisions without human ability to override.",
            implementation_steps=[
                "1. DEFINE OVERSIGHT MODEL: Determine appropriate level (human-in-the-loop, on-the-loop, or-in-command)",
                "2. DESIGN INTERFACES: Create dashboards/tools for monitoring AI operation",
                "3. EXPLAINABILITY: Implement methods to explain individual decisions",
                "4. ALERT SYSTEMS: Build alerts for anomalies, edge cases, low confidence",
                "5. OVERRIDE CAPABILITY: Enable humans to reject/modify AI outputs",
                "6. STOP MECHANISM: Implement ability to halt system operation",
                "7. TRAINING: Train oversight personnel on system operation",
                "8. DOCUMENTATION: Document oversight procedures and escalation paths",
            ],
            evidence_required=[
                "Human oversight design documentation",
                "User interface specifications for oversight tools",
                "Training materials and records for oversight personnel",
                "Escalation procedures and decision authority matrix",
                "Testing evidence of override and stop mechanisms",
                "Records of human oversight in practice",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover.",
            common_pitfalls=[
                "Oversight mechanisms that are rarely used in practice",
                "Over-reliance on AI (automation bias)",
                "Insufficient training for human overseers",
                "Override mechanisms that are impractical to use",
                "Time pressure making meaningful oversight impossible",
            ],
            related_obligations=["transparency_information", "automatic_logging"],
            tools_and_templates=[
                "LIME, SHAP for explainability",
                "Human oversight checklist template",
                "Oversight training curriculum",
            ],
        )
    )

    # 7. ACCURACY, ROBUSTNESS, CYBERSECURITY (Art. 15)
    obligations.append(
        Obligation(
            id="accuracy_robustness_cybersecurity",
            name="Accuracy, Robustness & Cybersecurity (Art. 15)",
            description="High-risk AI systems shall achieve appropriate levels of accuracy, robustness and cybersecurity throughout their lifecycle.",
            source_regulation="eu_ai_act",
            source_articles=["15(1)", "15(2)", "15(3)", "15(4)", "15(5)"],
            deadline="2026-08-02",
            priority="critical",
            action_items=[
                "Define and measure accuracy metrics appropriate for intended purpose",
                "Test robustness against errors, faults, and inconsistencies",
                "Test resilience against adversarial attacks",
                "Implement cybersecurity measures against unauthorized access",
                "Design for resilience to attempts to alter outputs",
                "Consider technical redundancy and failsafe measures",
            ],
            category="technical",
            applies_to=["provider"],
            summary="Ensure AI is accurate, resilient to attacks, and secure throughout its lifecycle.",
            effort_level="high",
            legal_basis="Article 15(1): High-risk AI systems shall be designed and developed in such a way that they achieve an appropriate level of accuracy, robustness and cybersecurity.",
            what_it_means="Your AI must work accurately and reliably, resist manipulation and attacks, and be secure from unauthorized access. Performance must be maintained throughout the system's lifecycle.",
            implementation_steps=[
                "1. ACCURACY REQUIREMENTS: Define accuracy metrics based on intended use and risk",
                "2. BASELINE TESTING: Establish performance benchmarks on representative test data",
                "3. ROBUSTNESS TESTING: Test with noisy, corrupted, or edge-case inputs",
                "4. ADVERSARIAL TESTING: Test against known adversarial attack techniques",
                "5. SECURITY ASSESSMENT: Conduct cybersecurity risk assessment",
                "6. IMPLEMENT CONTROLS: Apply security controls (access management, encryption, etc.)",
                "7. MONITORING: Implement ongoing performance and security monitoring",
                "8. INCIDENT RESPONSE: Define procedures for security incidents",
            ],
            evidence_required=[
                "Accuracy metrics and test results on validation data",
                "Robustness testing methodology and results",
                "Adversarial testing results",
                "Security assessment report",
                "Penetration testing results",
                "Security controls documentation",
                "Ongoing monitoring reports",
            ],
            penalties="Up to €35 million or 7% of annual worldwide turnover.",
            common_pitfalls=[
                "Testing only on ideal/clean data",
                "Not considering adversarial scenarios",
                "Security as afterthought rather than by design",
                "No ongoing monitoring of accuracy drift",
            ],
            related_obligations=["risk_management_system", "data_governance", "post_market_monitoring"],
        )
    )

    # 8. CONFORMITY ASSESSMENT (Art. 43)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="conformity_assessment",
                name="Conformity Assessment (Art. 43)",
                description="Providers must subject high-risk AI systems to conformity assessment procedure before placing on market or putting into service.",
                source_regulation="eu_ai_act",
                source_articles=["43(1)", "43(2)", "43(3)", "43(4)", "Annex VI", "Annex VII"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Determine applicable conformity assessment route",
                    "For most high-risk: internal control (Annex VI)",
                    "For credit scoring/insurance: may require notified body",
                    "Prepare all required documentation",
                    "Conduct or commission assessment",
                    "Issue EU declaration of conformity",
                    "Affix CE marking",
                ],
                category="governance",
                applies_to=["provider"],
                summary="Formally verify AI meets all requirements before deployment - self-assess or use notified body.",
                effort_level="high",
                legal_basis="Article 43(1): Providers of high-risk AI systems shall, prior to placing on the market or putting into service, ensure that the AI system has been subject to the relevant conformity assessment procedure.",
                what_it_means="Before deploying a high-risk AI system, you must formally verify it meets all requirements. For most financial services AI, this can be done internally (self-assessment), but you must follow strict procedures.",
                implementation_steps=[
                    "1. IDENTIFY PROCEDURE: Most financial AI uses internal control (Annex VI)",
                    "2. QUALITY MANAGEMENT: Establish QMS meeting Art. 17 requirements",
                    "3. TECHNICAL DOCUMENTATION: Ensure Annex IV documentation is complete",
                    "4. ASSESSMENT: Verify compliance with all Chapter 2 requirements",
                    "5. DECLARATION: Draw up EU declaration of conformity (Annex V)",
                    "6. CE MARKING: Affix CE marking to system/documentation",
                    "7. REGISTRATION: Register in EU database (Art. 49)",
                    "8. MAINTAIN: Keep documentation for 10 years after placing on market",
                ],
                evidence_required=[
                    "Conformity assessment report",
                    "EU Declaration of Conformity (per Annex V)",
                    "CE marking evidence",
                    "Complete technical documentation (Annex IV)",
                    "Quality management system documentation",
                    "EU database registration confirmation",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Starting assessment too late before deployment",
                    "Incomplete technical documentation",
                    "Not maintaining QMS",
                    "Forgetting to update assessment after significant changes",
                ],
                related_obligations=["technical_documentation", "quality_management", "eu_database_registration"],
            )
        )

    # 9. QUALITY MANAGEMENT SYSTEM (Art. 17)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="quality_management",
                name="Quality Management System (Art. 17)",
                description="Providers shall put in place a quality management system ensuring compliance with the AI Act requirements.",
                source_regulation="eu_ai_act",
                source_articles=["17(1)", "17(2)"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Establish documented compliance strategy and procedures",
                    "Define techniques and procedures for system design and verification",
                    "Implement data management procedures",
                    "Set up risk management procedures",
                    "Establish post-market monitoring system",
                    "Implement incident reporting procedures",
                    "Ensure communication with authorities and deployers",
                    "Maintain records and documentation",
                ],
                category="governance",
                applies_to=["provider"],
                summary="Implement a comprehensive management system covering all AI Act requirements.",
                effort_level="high",
                legal_basis="Article 17(1): Providers of high-risk AI systems shall put a quality management system in place that ensures compliance with this Regulation.",
                what_it_means="You need a comprehensive management system covering all AI Act requirements - not just policies, but active procedures, responsibilities, and continuous improvement.",
                implementation_steps=[
                    "1. SCOPE: Define QMS scope covering all high-risk AI systems",
                    "2. POLICY: Establish AI compliance policy approved by management",
                    "3. RESPONSIBILITIES: Assign clear roles and accountabilities",
                    "4. PROCEDURES: Document procedures for each requirement area",
                    "5. RESOURCES: Ensure adequate resources and competence",
                    "6. DOCUMENTATION: Establish document control procedures",
                    "7. MONITORING: Implement internal audits and management review",
                    "8. IMPROVEMENT: Establish corrective action procedures",
                ],
                evidence_required=[
                    "QMS manual and documented procedures",
                    "Organizational chart with AI compliance responsibilities",
                    "Internal audit reports",
                    "Management review records",
                    "Corrective action records",
                    "Training records for personnel",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Paper QMS that isn't actually followed",
                    "Lack of management commitment",
                    "No internal audit program",
                    "Failing to update QMS as regulations evolve",
                ],
                related_obligations=["conformity_assessment", "post_market_monitoring"],
                tools_and_templates=[
                    "ISO 9001 as foundation",
                    "ISO/IEC 42001 AI Management System",
                ],
            )
        )

    # 10. EU DATABASE REGISTRATION (Art. 49)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="eu_database_registration",
                name="EU Database Registration (Art. 49)",
                description="Providers and deployers must register high-risk AI systems in the EU database before placing on market or putting into service.",
                source_regulation="eu_ai_act",
                source_articles=["49(1)", "49(2)", "49(3)", "Annex VIII"],
                deadline="2026-08-02",
                priority="high",
                action_items=[
                    "Obtain identification credentials for EU database",
                    "Prepare all required information per Annex VIII",
                    "Register before placing on market/putting into service",
                    "Keep registration information up to date",
                    "Register any substantial modifications",
                ],
                category="governance",
                applies_to=["provider", "deployer"],
                summary="Register your high-risk AI in the public EU database before deployment.",
                effort_level="medium",
                legal_basis="Article 49(1): Before placing on the market or putting into service a high-risk AI system, the provider or authorised representative shall register that system in the EU database.",
                what_it_means="All high-risk AI systems must be registered in a public EU database with key information about the system, provider, and its compliance status.",
                implementation_steps=[
                    "1. ACCESS DATABASE: Obtain credentials for EU AI database",
                    "2. PREPARE DATA: Collect all Annex VIII required information",
                    "3. REGISTER: Enter information before market placement/deployment",
                    "4. PUBLISH: Certain information will be publicly accessible",
                    "5. UPDATE: Maintain current information, especially after changes",
                    "6. DECOMMISSION: Update status if system is withdrawn",
                ],
                evidence_required=[
                    "EU database registration confirmation",
                    "Record of information submitted",
                    "Update logs for registration changes",
                ],
                penalties="Up to €15 million or 3% of annual worldwide turnover for registration failures.",
                related_obligations=["conformity_assessment", "post_market_monitoring"],
            )
        )

    # 11. POST-MARKET MONITORING (Art. 72)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="post_market_monitoring",
                name="Post-Market Monitoring System (Art. 72)",
                description="Providers shall establish and document a post-market monitoring system to actively collect and analyze data on performance throughout the AI system's lifetime.",
                source_regulation="eu_ai_act",
                source_articles=["72(1)", "72(2)", "72(3)"],
                deadline="2026-08-02",
                priority="high",
                action_items=[
                    "Establish post-market monitoring plan",
                    "Actively collect performance data from deployers",
                    "Monitor for emerging risks and incidents",
                    "Analyze data for compliance issues",
                    "Update risk management based on findings",
                    "Report serious incidents within required timelines",
                ],
                category="operations",
                applies_to=["provider"],
                summary="Actively monitor AI performance after deployment and report serious incidents.",
                effort_level="medium",
                legal_basis="Article 72(1): Providers shall establish and document a post-market monitoring system in a manner that is proportionate to the nature of the artificial intelligence technologies and the risks of the high-risk AI system.",
                what_it_means="Compliance doesn't end at deployment. You must actively monitor how the system performs in the real world and respond to any issues that emerge.",
                implementation_steps=[
                    "1. PLAN: Document monitoring objectives, methods, and metrics",
                    "2. DATA COLLECTION: Establish channels to collect performance data from deployers",
                    "3. ANALYSIS: Regularly analyze data for performance issues, bias drift, incidents",
                    "4. THRESHOLDS: Define when issues require action",
                    "5. RESPONSE: Establish procedures for addressing identified issues",
                    "6. INCIDENT REPORTING: Implement Art. 73 serious incident reporting",
                    "7. UPDATES: Feed findings back into risk management and development",
                    "8. DOCUMENTATION: Maintain records of monitoring activities",
                ],
                evidence_required=[
                    "Post-market monitoring plan document",
                    "Monitoring data and analysis reports",
                    "Incident log and response records",
                    "Evidence of system updates based on monitoring",
                    "Serious incident reports submitted",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Passive monitoring (waiting for complaints) instead of active",
                    "Not establishing feedback channels with deployers",
                    "Failing to act on identified issues",
                    "Missing serious incident reporting deadlines",
                ],
                related_obligations=["risk_management_system", "serious_incident_reporting"],
            )
        )

    # 12. SERIOUS INCIDENT REPORTING (Art. 73)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="serious_incident_reporting",
                name="Serious Incident Reporting (Art. 73)",
                description="Providers must report any serious incident to market surveillance authorities of Member States where incident occurred. Deployers must also report serious incidents they become aware of.",
                source_regulation="eu_ai_act",
                source_articles=["73(1)", "73(2)", "73(3)", "73(4)", "73(5)"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Define what constitutes a 'serious incident' per Art. 3(49)",
                    "Establish incident detection and classification procedures",
                    "Implement immediate reporting mechanism (within 15 days or 2 days for certain incidents)",
                    "Identify relevant market surveillance authorities in each EU country",
                    "Document root cause analysis for each serious incident",
                    "Track corrective measures taken",
                    "Maintain incident register for regulatory inspection",
                ],
                category="governance",
                applies_to=["provider", "deployer"],
                summary="Report serious AI incidents (death, health/safety harm, fundamental rights violations) to authorities within strict timelines.",
                effort_level="high",
                legal_basis="Article 73(1): Providers of high-risk AI systems placed on the Union market shall report any serious incident to the market surveillance authorities of the Member States where that incident occurred.",
                what_it_means="If your AI system causes or contributes to death, serious health damage, serious damage to property/environment, or serious violation of fundamental rights, you must report to authorities within 15 days (or 2 days for deaths/imminent risk).",
                implementation_steps=[
                    "1. DEFINE INCIDENTS: Establish criteria for 'serious incidents' per Art. 3(49)",
                    "2. DETECTION: Implement monitoring to detect potential serious incidents",
                    "3. CLASSIFICATION: Create triage process to assess incident severity",
                    "4. AUTHORITY MAPPING: Identify market surveillance authorities in all deployment countries",
                    "5. REPORTING TEMPLATE: Prepare standardized incident report format",
                    "6. TIMELINE MANAGEMENT: 15-day deadline (2 days for death/imminent risk)",
                    "7. ROOT CAUSE ANALYSIS: Investigate and document causes",
                    "8. CORRECTIVE ACTIONS: Document and implement remediation",
                    "9. FOLLOW-UP: Provide additional information as requested by authorities",
                ],
                evidence_required=[
                    "Incident classification criteria and procedures",
                    "Incident detection mechanisms documentation",
                    "Incident register with all reported incidents",
                    "Incident reports submitted to authorities",
                    "Root cause analysis documentation",
                    "Corrective action records",
                    "Authority correspondence records",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover for failure to report.",
                common_pitfalls=[
                    "Not recognizing an incident as 'serious' under Art. 3(49)",
                    "Missing the 15-day (or 2-day) reporting deadline",
                    "Not reporting to ALL relevant Member States where incident occurred",
                    "Incomplete incident documentation",
                    "Not following up with additional information",
                ],
                related_obligations=["post_market_monitoring", "corrective_actions", "cooperation_authorities"],
            )
        )

    # 13. CORRECTIVE ACTIONS (Art. 20)
    if role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="corrective_actions",
                name="Corrective Actions & Withdrawal (Art. 20)",
                description="Providers must take immediate corrective action when high-risk AI system is non-compliant, including correction, withdrawal, disabling, or recall.",
                source_regulation="eu_ai_act",
                source_articles=["20(1)", "20(2)", "20(3)"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Establish non-compliance detection mechanisms",
                    "Define criteria triggering corrective action",
                    "Create corrective action procedures (correction, withdrawal, recall)",
                    "Implement system disabling capability for emergencies",
                    "Notify distributors, deployers, and authorized representatives",
                    "Inform competent authorities if risk to health/safety/fundamental rights",
                    "Document all corrective actions taken",
                ],
                category="governance",
                applies_to=["provider"],
                summary="If your AI doesn't comply with requirements, you must immediately correct it, withdraw it, or recall it.",
                effort_level="high",
                legal_basis="Article 20(1): Providers of high-risk AI systems which consider or have reason to consider that a high-risk AI system which they have placed on the market or put into service is not in conformity with this Regulation shall immediately take the necessary corrective actions.",
                what_it_means="If you discover your high-risk AI system doesn't meet requirements, you cannot ignore it. You must act immediately - fix the issue, pull the system from market, or recall it from deployers.",
                implementation_steps=[
                    "1. NON-COMPLIANCE DETECTION: Establish mechanisms to identify compliance issues",
                    "2. ASSESSMENT CRITERIA: Define when corrective action is required",
                    "3. CORRECTION PROCEDURES: How to fix the system while deployed",
                    "4. WITHDRAWAL PROCEDURE: How to remove from market",
                    "5. RECALL PROCEDURE: How to recall from existing deployers",
                    "6. DISABLING CAPABILITY: Technical ability to disable system remotely if needed",
                    "7. NOTIFICATION CHAIN: Contact list for distributors, deployers, representatives",
                    "8. AUTHORITY NOTIFICATION: When and how to notify competent authorities",
                    "9. DOCUMENTATION: Record all actions and their outcomes",
                ],
                evidence_required=[
                    "Non-compliance detection procedures",
                    "Corrective action policy and procedures",
                    "Contact lists for notification chain",
                    "Records of corrective actions taken",
                    "Authority notification records",
                    "System update/patch documentation",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Delaying corrective action hoping issue will resolve",
                    "Not notifying all parties in the supply chain",
                    "Inadequate documentation of actions taken",
                    "No mechanism to actually disable/recall deployed systems",
                ],
                related_obligations=["post_market_monitoring", "serious_incident_reporting", "cooperation_authorities"],
            )
        )

    # 14. COOPERATION WITH AUTHORITIES (Art. 21)
    obligations.append(
        Obligation(
            id="cooperation_authorities",
            name="Cooperation with Competent Authorities (Art. 21)",
            description="Providers and deployers must cooperate with national competent authorities, providing access to documentation, logs, and assistance as required.",
            source_regulation="eu_ai_act",
            source_articles=["21(1)", "21(2)"],
            deadline="2026-08-02",
            priority="high",
            action_items=[
                "Designate contact point for authority inquiries",
                "Ensure documentation is accessible and available upon request",
                "Maintain log access capabilities for regulatory inspection",
                "Train staff on authority cooperation procedures",
                "Establish legal review process for authority requests",
                "Document all authority interactions",
                "Respond within required timelines",
            ],
            category="governance",
            applies_to=["provider", "deployer"],
            summary="Cooperate with regulators - provide documentation, access to systems, and assistance when requested.",
            effort_level="medium",
            legal_basis="Article 21(1): Providers of high-risk AI systems shall, upon a reasoned request by a national competent authority, provide that authority with all the information and documentation necessary to demonstrate the conformity of the high-risk AI system.",
            what_it_means="Regulators have the right to inspect your AI systems. You must be ready to provide documentation, grant access to logs, and assist with their assessments.",
            implementation_steps=[
                "1. CONTACT POINT: Designate responsible person for authority communications",
                "2. DOCUMENTATION READINESS: Ensure all required documentation is organized and accessible",
                "3. LOG ACCESS: Verify authorities can be granted log access when needed",
                "4. RESPONSE PROCEDURES: Define how to handle authority requests",
                "5. LEGAL REVIEW: Establish process to review requests with legal counsel",
                "6. TRAINING: Train relevant staff on cooperation procedures",
                "7. RECORD KEEPING: Document all authority interactions",
                "8. TIMELINE MANAGEMENT: Track and meet response deadlines",
            ],
            evidence_required=[
                "Authority contact point designation",
                "Documentation index and access procedures",
                "Log access procedures for regulators",
                "Authority request response procedures",
                "Records of authority interactions",
                "Training records for relevant staff",
            ],
            penalties="Up to €15 million or 3% of annual worldwide turnover for failure to cooperate.",
            common_pitfalls=[
                "Unorganized documentation that can't be quickly retrieved",
                "No designated contact point for authorities",
                "Missing response deadlines",
                "Inadequate records of authority interactions",
            ],
            related_obligations=["technical_documentation", "automatic_logging"],
        )
    )

    # 15. FUNDAMENTAL RIGHTS IMPACT ASSESSMENT (Art. 27)
    if role in {AIRole.DEPLOYER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="fraia",
                name="Fundamental Rights Impact Assessment (Art. 27)",
                description="MANDATORY for: (1) deployers of credit scoring AI (Annex III 5b), (2) deployers of life/health insurance AI (Annex III 5c), (3) public bodies or private entities providing public services using any high-risk AI. Must be performed BEFORE first use.",
                source_regulation="eu_ai_act",
                source_articles=["27(1)", "27(2)", "27(3)", "27(4)"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Verify if FRAIA applies: credit scoring, life/health insurance, or public service provider",
                    "Identify processes where AI system will be used",
                    "Map categories of natural persons affected",
                    "Assess specific risks to fundamental rights (non-discrimination, privacy, dignity)",
                    "Evaluate human oversight measures",
                    "Document mitigation measures",
                    "Notify market surveillance authority of FRAIA results",
                    "Involve relevant stakeholders (DPO, works council, affected communities)",
                ],
                category="governance",
                applies_to=["deployer", "third_party_user"],
                summary="Assess fundamental rights impact BEFORE deployment. MANDATORY for credit/insurance AI and public services.",
                effort_level="high",
                legal_basis="Article 27(1): Deployers that are (a) bodies governed by public law, (b) private operators providing public services, or (c) deployers of high-risk AI referred to in point 5(b) and (c) of Annex III shall perform an assessment of the impact on fundamental rights.",
                what_it_means="If you deploy AI for credit scoring, life/health insurance, OR if you're a public entity, you MUST assess fundamental rights impacts. Private banks deploying credit scoring AI are covered by Art. 27(1)(c).",
                implementation_steps=[
                    "1. SCOPE: Identify all AI uses covered by Art. 27",
                    "2. PROCESS MAPPING: Document how AI integrates into decision processes",
                    "3. STAKEHOLDER IDENTIFICATION: Map all groups of affected persons",
                    "4. RIGHTS MAPPING: Identify which fundamental rights may be affected",
                    "5. RISK ASSESSMENT: Assess likelihood and severity of rights impacts",
                    "6. MITIGATION: Document measures to protect fundamental rights",
                    "7. HUMAN OVERSIGHT: Verify oversight measures are adequate",
                    "8. CONSULTATION: Involve DPO, works council, affected communities as appropriate",
                    "9. NOTIFICATION: Submit summary to market surveillance authority",
                    "10. REVIEW: Reassess when significant changes occur",
                ],
                evidence_required=[
                    "Completed FRAIA document",
                    "Stakeholder mapping",
                    "Rights impact analysis",
                    "Mitigation measures documentation",
                    "Notification confirmation from authority",
                    "Consultation records (DPO, works council, etc.)",
                ],
                penalties="Up to €35 million or 7% of annual worldwide turnover.",
                common_pitfalls=[
                    "Generic assessment not specific to deployment context",
                    "Not involving affected communities",
                    "Forgetting to notify the authority",
                    "Not updating FRAIA when system or use changes",
                ],
                related_obligations=["human_oversight", "dpia"],
                tools_and_templates=[
                    "EU Fundamental Rights Agency guidance",
                    "FRAIA template aligned with DPIA format",
                ],
            )
        )

    # DEPLOYER-SPECIFIC OBLIGATIONS
    if role in {AIRole.DEPLOYER, AIRole.PROVIDER_AND_DEPLOYER}:
        obligations.append(
            Obligation(
                id="deployer_obligations",
                name="Deployer General Obligations (Art. 26)",
                description="Deployers of high-risk AI systems must take appropriate technical and organizational measures to ensure use in accordance with instructions, implement human oversight, monitor operation, and keep logs.",
                source_regulation="eu_ai_act",
                source_articles=["26(1)", "26(2)", "26(3)", "26(4)", "26(5)", "26(6)", "26(7)"],
                deadline="2026-08-02",
                priority="critical",
                action_items=[
                    "Use system in accordance with provider's instructions",
                    "Assign human oversight to competent, trained personnel",
                    "Ensure input data is relevant and representative",
                    "Monitor AI system operation",
                    "Keep logs generated by the system",
                    "Inform workers' representatives before deployment",
                    "Cooperate with authorities",
                ],
                category="operations",
                applies_to=["deployer", "third_party_user"],
                summary="If you USE AI (even from a vendor), you're responsible for proper use, oversight, and monitoring.",
                effort_level="medium",
                legal_basis="Article 26(1): Deployers of high-risk AI systems shall take appropriate technical and organisational measures to ensure they use such systems in accordance with the instructions of use.",
                what_it_means="As a deployer, you're responsible for proper use, human oversight, monitoring, and transparency to workers. Even if you didn't build the AI, you're accountable for how it's used.",
                implementation_steps=[
                    "1. REVIEW INSTRUCTIONS: Thoroughly understand provider's instructions for use",
                    "2. ASSESS FIT: Verify system is appropriate for your intended use",
                    "3. ASSIGN OVERSIGHT: Designate qualified staff for human oversight",
                    "4. TRAIN PERSONNEL: Ensure oversight staff understand the system",
                    "5. INPUT DATA: Verify your input data meets quality requirements",
                    "6. MONITORING: Implement operational monitoring procedures",
                    "7. LOG RETENTION: Ensure logs are kept for required period",
                    "8. WORKER INFORMATION: Inform employees/works council before deployment",
                    "9. CONTACT POINT: Establish point of contact for authority inquiries",
                ],
                evidence_required=[
                    "Instructions for use review and sign-off",
                    "Human oversight assignments and training records",
                    "Input data quality assessments",
                    "Monitoring procedures and logs",
                    "Worker information/consultation records",
                    "Authority correspondence records",
                ],
                penalties="Up to €15 million or 3% of annual worldwide turnover.",
                related_obligations=["human_oversight", "automatic_logging", "fraia"],
            )
        )

    return obligations


def get_gdpr_obligations(
    involves_profiling: bool,
    involves_natural_persons: bool,
    use_case: AIUseCase,
    fully_automated: bool,
    uses_special_category_data: bool,
) -> List[Obligation]:
    if not involves_natural_persons:
        return []

    obligations = []

    # 1. LAWFUL BASIS (Art. 6)
    obligations.append(
        Obligation(
            id="lawful_basis",
            name="Lawful Basis for Processing (Art. 6)",
            description="All personal data processing must have a valid lawful basis. For AI systems, this is typically legitimate interests (Art. 6(1)(f)), contract performance (Art. 6(1)(b)), or consent (Art. 6(1)(a)).",
            source_regulation="gdpr",
            source_articles=["6(1)", "6(4)"],
            deadline=None,
            priority="critical",
            action_items=[
                "Identify and document lawful basis for each processing purpose",
                "For legitimate interests: conduct and document balancing test",
                "Ensure lawful basis covers AI training AND inference",
                "Document compatibility if reusing data for AI training",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="You need a legal reason to process personal data - applies whether you build or buy AI.",
            effort_level="medium",
            legal_basis="Article 6(1): Processing shall be lawful only if and to the extent that at least one of the following applies: (a) consent, (b) contract, (c) legal obligation, (d) vital interests, (e) public task, (f) legitimate interests.",
            what_it_means="You cannot process personal data without a legal reason. For AI, you need a lawful basis both for training the model and for using it to make decisions about individuals.",
            implementation_steps=[
                "1. MAP PROCESSING: Identify all personal data processing in the AI lifecycle",
                "2. IDENTIFY BASIS: Determine appropriate lawful basis for each purpose",
                "3. LEGITIMATE INTERESTS TEST: If relying on Art. 6(1)(f), document: (a) legitimate interest pursued, (b) necessity of processing, (c) balancing against data subject rights",
                "4. COMPATIBILITY: If reusing existing data for AI training, assess compatibility under Art. 6(4)",
                "5. DOCUMENT: Record lawful basis determination in ROPA",
            ],
            evidence_required=[
                "Lawful basis determination for each processing purpose",
                "Legitimate interests assessment (if applicable)",
                "Compatibility assessment for secondary use",
                "Records of Processing Activities (ROPA) entry",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Assuming consent is always the best basis (often it's not for AI)",
                "Not having lawful basis for training data separately from inference",
                "Ignoring compatibility when reusing data for AI purposes",
            ],
            related_obligations=["transparency_privacy_notice", "dpia"],
        )
    )

    # 2. TRANSPARENCY (Art. 13/14)
    obligations.append(
        Obligation(
            id="transparency_privacy_notice",
            name="Transparency & Privacy Notice (Art. 13/14)",
            description="Data subjects must be informed about AI processing, including the existence of automated decision-making, meaningful information about the logic involved, and the significance and consequences.",
            source_regulation="gdpr",
            source_articles=["13(2)(f)", "14(2)(g)"],
            deadline=None,
            priority="critical",
            action_items=[
                "Update privacy notice to disclose AI/automated processing",
                "Explain the logic of the AI in understandable terms",
                "Describe the significance and consequences for individuals",
                "Provide information about how to contest decisions",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Tell people when AI makes decisions about them and explain how it works.",
            effort_level="medium",
            legal_basis="Article 13(2)(f): The controller shall provide the data subject with information necessary to ensure fair and transparent processing, including the existence of automated decision-making, meaningful information about the logic involved, significance and consequences.",
            what_it_means="You must tell people when AI is being used to make decisions about them, explain how it works in plain language, and what the consequences of those decisions could be.",
            implementation_steps=[
                "1. IDENTIFY TOUCHPOINTS: Where to provide information (application forms, websites, etc.)",
                "2. DRAFT DISCLOSURE: Write clear, plain-language explanation of AI processing",
                "3. EXPLAIN LOGIC: Describe key factors/features AI considers (not technical details)",
                "4. DESCRIBE IMPACT: Explain possible outcomes and their consequences",
                "5. INCLUDE RIGHTS: Explain right to human review, contest decision, obtain explanation",
                "6. LAYERED APPROACH: Use layered notices if detailed information is lengthy",
            ],
            evidence_required=[
                "Updated privacy notice/policy",
                "Specific AI disclosure text",
                "Evidence notice is provided at appropriate time",
                "Accessibility compliance evidence",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Legal jargon instead of plain language",
                "Generic disclosure that doesn't describe specific AI use",
                "Not updating notice when AI system changes",
                "Failing to explain what the decision means for the person",
            ],
            related_obligations=["lawful_basis", "automated_decision_safeguards"],
        )
    )

    # 3. DATA PROTECTION IMPACT ASSESSMENT (Art. 35)
    obligations.append(
        Obligation(
            id="dpia",
            name="Data Protection Impact Assessment (Art. 35)",
            description="A DPIA is mandatory for processing likely to result in high risk to rights and freedoms, including systematic evaluation of personal aspects (profiling) and automated decisions with legal/significant effects.",
            source_regulation="gdpr",
            source_articles=["35(1)", "35(3)", "35(7)"],
            deadline=None,
            priority="critical",
            action_items=[
                "Conduct DPIA before deploying AI system",
                "Describe processing operations and purposes",
                "Assess necessity and proportionality",
                "Identify and assess risks to data subjects",
                "Identify measures to address risks",
                "Consult DPO and potentially supervisory authority",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Mandatory privacy risk assessment BEFORE deploying AI that profiles people or makes significant decisions.",
            effort_level="high",
            legal_basis="Article 35(3)(a): A DPIA is required for systematic and extensive evaluation of personal aspects of natural persons which is based on automated processing, including profiling, and on which decisions are based that produce legal effects or similarly significantly affect the natural person.",
            what_it_means="Before deploying AI that profiles people or makes significant decisions, you must formally assess and document the risks to individuals' privacy and rights, and implement measures to mitigate those risks.",
            implementation_steps=[
                "1. THRESHOLD CHECK: Confirm DPIA is required (almost always yes for AI affecting individuals)",
                "2. DESCRIBE PROCESSING: Document what data, what AI does, what decisions result",
                "3. ASSESS NECESSITY: Is this processing necessary? Are there less intrusive alternatives?",
                "4. IDENTIFY RISKS: List risks to data subjects (discrimination, unfair treatment, privacy loss, etc.)",
                "5. ASSESS RISKS: Rate likelihood and severity of each risk",
                "6. MITIGATE: Identify controls to reduce each risk to acceptable level",
                "7. CONSULT DPO: Get DPO input on assessment",
                "8. AUTHORITY CONSULTATION: If high residual risk, consult supervisory authority (Art. 36)",
                "9. DOCUMENT: Maintain DPIA as living document, update when changes occur",
            ],
            evidence_required=[
                "Completed DPIA document",
                "Risk register with mitigations",
                "DPO consultation record",
                "Authority consultation (if required)",
                "DPIA review/update logs",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Conducting DPIA after deployment instead of before",
                "Generic DPIA not specific to the AI system",
                "Not updating DPIA when AI system changes",
                "No DPO involvement",
                "Ignoring residual risks",
            ],
            related_obligations=["lawful_basis", "automated_decision_safeguards", "fraia"],
            tools_and_templates=[
                "ICO DPIA template",
                "CNIL AI DPIA guidance",
                "Art. 29 WP DPIA guidelines",
            ],
        )
    )

    # 4. AUTOMATED DECISION-MAKING (Art. 22) - if profiling or fully automated
    if involves_profiling or fully_automated:
        obligations.append(
            Obligation(
                id="automated_decision_safeguards",
                name="Automated Decision-Making Safeguards (Art. 22)",
                description="Data subjects have the right not to be subject to decisions based solely on automated processing that produce legal or similarly significant effects, unless specific conditions apply.",
                source_regulation="gdpr",
                source_articles=["22(1)", "22(2)", "22(3)", "22(4)"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Determine if Art. 22 applies (solely automated + legal/significant effect)",
                    "If Art. 22 applies, identify permitted exception (contract, law, consent)",
                    "Implement right to human intervention",
                    "Implement right to express point of view",
                    "Implement right to contest the decision",
                    "Ensure special category data is not used unless Art. 22(4) conditions met",
                ],
                category="privacy",
                applies_to=["deployer", "third_party_user"],
                summary="People have the right to NOT be subject to fully automated significant decisions - must offer human review.",
                effort_level="high",
                legal_basis="Article 22(1): The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her.",
                what_it_means="If your AI makes decisions about people without human involvement, and those decisions have significant effects (like denying credit, insurance, employment), you generally cannot do this unless: (a) it's necessary for a contract, (b) authorized by law, or (c) based on explicit consent. Even then, you must provide safeguards.",
                implementation_steps=[
                    "1. ASSESS APPLICABILITY: Is decision solely automated? Does it have legal/significant effect?",
                    "2. IDENTIFY EXCEPTION: If Art. 22 applies, which exception allows this processing?",
                    "3. IMPLEMENT HUMAN REVIEW: Design process for human to review decisions on request",
                    "4. ENABLE EXPRESSION: Allow data subjects to provide additional information/context",
                    "5. CONTEST MECHANISM: Create clear process for challenging decisions",
                    "6. TRAIN REVIEWERS: Ensure human reviewers can genuinely override AI",
                    "7. DOCUMENT PROCESS: Record how each safeguard is implemented",
                    "8. COMMUNICATE: Inform data subjects of their rights at point of decision",
                ],
                evidence_required=[
                    "Art. 22 applicability assessment",
                    "Documentation of applicable exception",
                    "Human review process documentation",
                    "Training records for human reviewers",
                    "Records of review requests and outcomes",
                    "Appeal/contest process documentation",
                ],
                penalties="Up to €20 million or 4% of annual worldwide turnover.",
                common_pitfalls=[
                    "Human review that's rubber-stamping, not genuine review",
                    "Making it too difficult to request human review",
                    "Reviewers not empowered to actually override AI",
                    "Not telling people they can request human review",
                ],
                related_obligations=["transparency_privacy_notice", "meaningful_information"],
            )
        )

    # 5. MEANINGFUL INFORMATION ABOUT LOGIC (Art. 13/14/15) - if fully automated
    if fully_automated:
        obligations.append(
            Obligation(
                id="meaningful_information",
                name="Right to Meaningful Information & Explanation (Art. 13/14/15)",
                description="Data subjects have the right to obtain meaningful information about the logic involved in automated decision-making, as well as the significance and envisaged consequences.",
                source_regulation="gdpr",
                source_articles=["13(2)(f)", "14(2)(g)", "15(1)(h)"],
                deadline=None,
                priority="high",
                action_items=[
                    "Develop plain-language explanation of AI decision logic",
                    "Explain key factors that influence decisions",
                    "Describe possible outcomes and their likelihood",
                    "Provide individual explanations on request (Art. 15)",
                    "Train customer-facing staff to explain AI decisions",
                ],
                category="privacy",
                applies_to=["deployer", "third_party_user"],
                summary="Be able to explain WHY the AI made a specific decision about someone.",
                effort_level="high",
                legal_basis="Article 15(1)(h): The data subject shall have the right to obtain meaningful information about the logic involved, as well as the significance and the envisaged consequences of such processing.",
                what_it_means="People have the right to understand why an AI made a particular decision about them. You need to be able to explain the key factors that influenced the decision, not just say 'the algorithm decided'.",
                implementation_steps=[
                    "1. DEVELOP EXPLANATIONS: Create template explanations for typical decisions",
                    "2. IDENTIFY KEY FACTORS: Document main variables/features that influence outcomes",
                    "3. IMPLEMENT EXPLAINABILITY: Use techniques (SHAP, LIME) to generate individual explanations",
                    "4. TRAIN STAFF: Ensure front-line staff can explain decisions meaningfully",
                    "5. RESPONSE PROCESS: Establish process to provide explanations within GDPR timelines (1 month)",
                    "6. AVOID JARGON: Ensure explanations are understandable to average person",
                ],
                evidence_required=[
                    "Explanation methodology documentation",
                    "Sample explanations demonstrating meaningfulness",
                    "Staff training materials and records",
                    "Response procedures for explanation requests",
                    "Records of explanations provided",
                ],
                penalties="Up to €20 million or 4% of annual worldwide turnover.",
                common_pitfalls=[
                    "Providing technical details instead of meaningful explanation",
                    "Explaining the model in general instead of the specific decision",
                    "Taking too long to respond to requests",
                    "Claiming trade secrets to avoid explanation (rarely valid)",
                ],
                related_obligations=["automated_decision_safeguards", "transparency_privacy_notice"],
                tools_and_templates=[
                    "SHAP (SHapley Additive exPlanations)",
                    "LIME (Local Interpretable Model-agnostic Explanations)",
                    "ICO guidance on explaining AI decisions",
                ],
            )
        )

    # 6. SPECIAL CATEGORY DATA (Art. 9)
    if uses_special_category_data:
        obligations.append(
            Obligation(
                id="special_category_data",
                name="Special Category Data Processing (Art. 9)",
                description="Processing of special category data (health, biometric, racial/ethnic origin, etc.) is generally prohibited unless a specific condition in Art. 9(2) applies.",
                source_regulation="gdpr",
                source_articles=["9(1)", "9(2)"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Identify all special category data processed by AI",
                    "Identify and document applicable Art. 9(2) condition for each",
                    "Implement additional safeguards for sensitive data",
                    "Consider whether data is necessary or can be removed",
                    "Document decisions and rationale",
                ],
                category="privacy",
                applies_to=["provider", "deployer", "third_party_user"],
                summary="Extra restrictions for sensitive data like health, biometrics, race - need explicit legal basis.",
                effort_level="high",
                legal_basis="Article 9(1): Processing of personal data revealing racial or ethnic origin, political opinions, religious beliefs, trade union membership, genetic data, biometric data for identification, health data, or sex life/orientation shall be prohibited. Art. 9(2) provides limited exceptions.",
                what_it_means="Special category data (health, biometrics, race, religion, etc.) has extra protection. You can only process it in limited circumstances, such as explicit consent, employment obligations, or substantial public interest with appropriate safeguards.",
                implementation_steps=[
                    "1. DATA AUDIT: Identify all special category data in training and inference data",
                    "2. NECESSITY ASSESSMENT: Is this data actually necessary? Can you achieve purpose without it?",
                    "3. IDENTIFY CONDITION: Determine which Art. 9(2) condition applies",
                    "4. EXPLICIT CONSENT: If using consent (Art. 9(2)(a)), ensure it meets explicit consent requirements",
                    "5. SUBSTANTIAL PUBLIC INTEREST: If using Art. 9(2)(g), identify legal basis in national law",
                    "6. ADDITIONAL SAFEGUARDS: Implement enhanced security, access controls, minimization",
                    "7. DOCUMENT: Record all decisions and rationale",
                ],
                evidence_required=[
                    "Special category data inventory",
                    "Art. 9(2) condition documentation for each data type",
                    "Explicit consent records (if applicable)",
                    "Legal basis documentation (if substantial public interest)",
                    "Additional safeguards documentation",
                ],
                penalties="Up to €20 million or 4% of annual worldwide turnover.",
                common_pitfalls=[
                    "Not recognizing data as special category (e.g., inferred health data)",
                    "Confusing regular consent with explicit consent",
                    "Not having specific legal basis for substantial public interest",
                    "Processing special category data because it's 'useful' without necessity",
                ],
                related_obligations=["dpia", "lawful_basis"],
            )
        )

    # 7. DATA MINIMIZATION (Art. 5(1)(c))
    obligations.append(
        Obligation(
            id="data_minimization",
            name="Data Minimization Principle (Art. 5(1)(c))",
            description="Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed.",
            source_regulation="gdpr",
            source_articles=["5(1)(c)"],
            deadline=None,
            priority="high",
            action_items=[
                "Review all personal data used by AI for necessity",
                "Remove or anonymize unnecessary data",
                "Justify retention of each data field",
                "Consider privacy-preserving techniques",
                "Regularly review data holdings",
            ],
            category="privacy",
            applies_to=["provider", "deployer"],
            summary="Only collect and use personal data you actually need - no 'just in case' data.",
            effort_level="medium",
            legal_basis="Article 5(1)(c): Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed.",
            what_it_means="You should only collect and use the personal data you actually need. Just because data might be useful for AI training doesn't mean you can use it. Every data field needs justification.",
            implementation_steps=[
                "1. DATA INVENTORY: List all personal data used in AI training and inference",
                "2. NECESSITY TEST: For each field, ask 'is this necessary for the stated purpose?'",
                "3. REMOVE UNNECESSARY: Delete or anonymize data that isn't necessary",
                "4. PSEUDONYMIZATION: Where possible, pseudonymize data",
                "5. AGGREGATION: Use aggregated data where individual-level isn't needed",
                "6. PETs: Consider privacy-enhancing technologies (differential privacy, federated learning)",
                "7. PERIODIC REVIEW: Regularly reassess data holdings",
            ],
            evidence_required=[
                "Data necessity assessment documentation",
                "Records of data removed/anonymized",
                "Justification for each data field retained",
                "Privacy-enhancing technology implementation evidence",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Collecting extra data 'just in case' for future AI use",
                "Not reviewing necessity for legacy datasets",
                "Ignoring derived/inferred data",
            ],
            related_obligations=["lawful_basis", "dpia"],
        )
    )

    # 8. ACCURACY (Art. 5(1)(d))
    obligations.append(
        Obligation(
            id="accuracy_gdpr",
            name="Data Accuracy & Right to Rectification (Art. 5(1)(d) & Art. 16)",
            description="Personal data must be accurate and kept up to date. Data subjects have the right to rectification of inaccurate data.",
            source_regulation="gdpr",
            source_articles=["5(1)(d)", "16"],
            deadline=None,
            priority="high",
            action_items=[
                "Implement processes to verify data accuracy",
                "Establish mechanisms for data subjects to correct their data",
                "Ensure corrections flow through to AI models/outputs",
                "Regularly audit data quality",
                "Document accuracy measures",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Keep data accurate - people can request corrections that must flow to AI.",
            effort_level="medium",
            legal_basis="Article 5(1)(d): Personal data shall be accurate and, where necessary, kept up to date; every reasonable step must be taken to ensure that personal data that are inaccurate are erased or rectified without delay.",
            what_it_means="If your AI uses inaccurate data, it will make inaccurate decisions. You must have processes to verify data accuracy and allow people to correct their data, including ensuring those corrections affect AI outputs.",
            implementation_steps=[
                "1. ACCURACY CHECKS: Implement validation rules and verification processes",
                "2. RECTIFICATION PROCESS: Create clear process for data subjects to request corrections",
                "3. PROPAGATION: Ensure corrections update all downstream systems including AI",
                "4. RETRAINING: Consider impact on models trained on now-corrected data",
                "5. AUDITS: Regularly audit data quality",
                "6. DOCUMENTATION: Record accuracy measures and correction requests",
            ],
            evidence_required=[
                "Data accuracy policy and procedures",
                "Validation rules documentation",
                "Rectification request handling process",
                "Records of rectification requests and actions",
                "Data quality audit reports",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Corrections not flowing through to AI models",
                "No verification of input data quality",
                "Assuming training data is automatically accurate",
            ],
            related_obligations=["data_minimization", "lawful_basis"],
        )
    )

    # 9. RIGHT TO ERASURE / RIGHT TO BE FORGOTTEN (Art. 17)
    obligations.append(
        Obligation(
            id="right_to_erasure",
            name="Right to Erasure (Art. 17)",
            description="Data subjects have the right to have their personal data erased. For AI systems, this creates challenges when data was used for training.",
            source_regulation="gdpr",
            source_articles=["17(1)", "17(2)", "17(3)"],
            deadline=None,
            priority="high",
            action_items=[
                "Establish process to receive and handle erasure requests",
                "Assess impact of erasure on AI models trained on the data",
                "Document approach to erasure in AI context (retraining, unlearning, etc.)",
                "Notify third parties who received the data",
                "Respond within 1 month (extendable to 3 months)",
                "Document exceptions that may apply (legal claims, public interest, etc.)",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Handle erasure requests - challenging for AI if data was used for training. May require retraining or machine unlearning.",
            effort_level="high",
            legal_basis="Article 17(1): The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay where one of the specified grounds applies.",
            what_it_means="If someone asks you to delete their data, you generally must comply. For AI, this is complex - if their data trained a model, true erasure may require retraining. Document your approach and any technical limitations.",
            implementation_steps=[
                "1. REQUEST HANDLING: Establish clear process for receiving erasure requests",
                "2. SCOPE ASSESSMENT: Identify all systems/datasets containing the person's data",
                "3. AI IMPACT ANALYSIS: Assess if data was used for AI training",
                "4. ERASURE OPTIONS: Determine appropriate response:",
                "   - Delete from inference/production data",
                "   - Consider model retraining if feasible",
                "   - Evaluate machine unlearning techniques",
                "   - Document if true erasure from model not technically feasible",
                "5. THIRD-PARTY NOTIFICATION: Notify recipients of the data",
                "6. EXCEPTIONS: Document if any Art. 17(3) exceptions apply",
                "7. RESPONSE: Communicate outcome to data subject within deadline",
            ],
            evidence_required=[
                "Erasure request handling procedures",
                "Records of erasure requests and responses",
                "AI data lineage documentation",
                "Technical assessment of AI model erasure options",
                "Third-party notification records",
                "Exception documentation (if applicable)",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Ignoring impact on AI models trained on the data",
                "Missing the response deadline",
                "Not notifying third parties who received the data",
                "Failing to document technical limitations",
            ],
            related_obligations=["lawful_basis", "transparency_privacy_notice"],
        )
    )

    # 10. DATA PORTABILITY (Art. 20)
    obligations.append(
        Obligation(
            id="data_portability",
            name="Right to Data Portability (Art. 20)",
            description="Data subjects have the right to receive their personal data in a structured, machine-readable format and transmit it to another controller.",
            source_regulation="gdpr",
            source_articles=["20(1)", "20(2)", "20(3)"],
            deadline=None,
            priority="medium",
            action_items=[
                "Identify data subject to portability (data provided by subject, processed by automated means)",
                "Establish process to export data in machine-readable format (JSON, CSV, XML)",
                "Enable direct transmission to another controller where technically feasible",
                "Respond within 1 month",
                "Document any limitations",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Provide people their data in portable format. Applies to data they provided, processed automatically.",
            effort_level="medium",
            legal_basis="Article 20(1): The data subject shall have the right to receive the personal data concerning him or her, which he or she has provided to a controller, in a structured, commonly used and machine-readable format.",
            what_it_means="If someone wants their data to move to a competitor, they can request it in a portable format. This applies to data they actively provided and data observed about them (but not inferred data from AI).",
            implementation_steps=[
                "1. SCOPE: Identify data subject to portability (provided by subject, automated processing, based on consent or contract)",
                "2. FORMAT: Choose machine-readable format (JSON, CSV, XML)",
                "3. EXPORT CAPABILITY: Build technical capability to export relevant data",
                "4. DIRECT TRANSMISSION: Where feasible, enable direct transfer to another controller",
                "5. RESPONSE PROCESS: Handle requests within 1 month",
                "6. DOCUMENTATION: Note what data is/isn't included and why",
            ],
            evidence_required=[
                "Data portability procedures",
                "Technical specification of export formats",
                "Records of portability requests and responses",
                "Documentation of data scope included/excluded",
            ],
            penalties="Up to €20 million or 4% of annual worldwide turnover.",
            common_pitfalls=[
                "Including inferred/derived data (not required)",
                "Non-machine-readable formats",
                "Missing response deadlines",
            ],
            related_obligations=["lawful_basis", "transparency_privacy_notice"],
        )
    )

    # 11. RECORDS OF PROCESSING ACTIVITIES (Art. 30)
    obligations.append(
        Obligation(
            id="records_of_processing",
            name="Records of Processing Activities - ROPA (Art. 30)",
            description="Controllers and processors must maintain records of processing activities, including AI systems that process personal data.",
            source_regulation="gdpr",
            source_articles=["30(1)", "30(2)", "30(3)", "30(4)", "30(5)"],
            deadline=None,
            priority="critical",
            action_items=[
                "Include all AI systems in Records of Processing Activities (ROPA)",
                "Document: purposes, data categories, recipients, transfers, retention, security measures",
                "Specify AI-specific processing (training, inference, profiling)",
                "Keep ROPA up to date as AI systems change",
                "Make available to supervisory authority on request",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Document all AI data processing in your ROPA - it's your privacy inventory.",
            effort_level="medium",
            legal_basis="Article 30(1): Each controller shall maintain a record of processing activities under its responsibility, containing specified information.",
            what_it_means="You must maintain a written record of all your data processing activities, including AI. This is your 'data inventory' that regulators can request at any time.",
            implementation_steps=[
                "1. INVENTORY: List all AI systems processing personal data",
                "2. REQUIRED FIELDS: For each AI system, document:",
                "   - Controller/processor contact details",
                "   - Purposes of processing",
                "   - Categories of data subjects",
                "   - Categories of personal data",
                "   - Recipients of data",
                "   - International transfers",
                "   - Retention periods",
                "   - Security measures",
                "3. AI-SPECIFIC: Add AI-specific details (training data, model type, automated decisions)",
                "4. MAINTENANCE: Update ROPA when AI systems change",
                "5. ACCESSIBILITY: Ensure ROPA can be provided to authorities quickly",
            ],
            evidence_required=[
                "Complete ROPA including AI processing activities",
                "Update log showing ROPA maintenance",
                "Process for keeping ROPA current",
            ],
            penalties="Up to €10 million or 2% of annual worldwide turnover (lower tier penalty).",
            common_pitfalls=[
                "Not including AI systems in ROPA",
                "ROPA not kept current as systems change",
                "Missing required information fields",
                "Unable to produce ROPA quickly when requested",
            ],
            related_obligations=["lawful_basis", "dpia"],
        )
    )

    # 12. SECURITY OF PROCESSING (Art. 32)
    obligations.append(
        Obligation(
            id="security_of_processing",
            name="Security of Processing (Art. 32)",
            description="Controllers and processors must implement appropriate technical and organizational measures to ensure security of processing, including AI systems.",
            source_regulation="gdpr",
            source_articles=["32(1)", "32(2)", "32(3)", "32(4)"],
            deadline=None,
            priority="critical",
            action_items=[
                "Implement pseudonymization and encryption where appropriate",
                "Ensure confidentiality, integrity, availability, resilience of AI systems",
                "Implement ability to restore data/systems after incident",
                "Regularly test and evaluate security measures",
                "Ensure staff with access have confidentiality obligations",
                "Address AI-specific threats (adversarial attacks, data poisoning, model extraction)",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Secure your AI systems - encryption, access controls, and resilience against AI-specific attacks.",
            effort_level="high",
            legal_basis="Article 32(1): The controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.",
            what_it_means="You must protect personal data in your AI systems with appropriate security. For AI, this includes protection against adversarial attacks, data poisoning, and model theft, in addition to standard security measures.",
            implementation_steps=[
                "1. RISK ASSESSMENT: Assess security risks specific to AI processing",
                "2. ENCRYPTION: Encrypt data at rest and in transit",
                "3. PSEUDONYMIZATION: Where feasible, pseudonymize training data",
                "4. ACCESS CONTROLS: Implement role-based access to AI systems and data",
                "5. AI-SPECIFIC THREATS: Address:",
                "   - Adversarial input attacks",
                "   - Data poisoning",
                "   - Model extraction/theft",
                "   - Inference attacks (membership inference, model inversion)",
                "6. RESILIENCE: Ensure ability to recover from incidents",
                "7. TESTING: Regularly test security measures",
                "8. STAFF OBLIGATIONS: Ensure confidentiality commitments",
            ],
            evidence_required=[
                "Security risk assessment",
                "Technical security measures documentation",
                "Access control policies and logs",
                "Security testing/audit results",
                "Staff confidentiality agreements",
                "Incident response and recovery procedures",
            ],
            penalties="Up to €10 million or 2% of annual worldwide turnover.",
            common_pitfalls=[
                "Not considering AI-specific attack vectors",
                "Inadequate access controls to training data",
                "No regular security testing",
                "Unable to recover AI systems after incident",
            ],
            related_obligations=["dpia", "accuracy_gdpr"],
        )
    )

    # 13. INTERNATIONAL DATA TRANSFERS (Art. 44-49)
    if involves_natural_persons:  # Always relevant if processing personal data
        obligations.append(
            Obligation(
                id="international_transfers",
                name="International Data Transfers (Art. 44-49)",
                description="Transfers of personal data to third countries require appropriate safeguards. Critical for AI using US cloud providers or non-EU AI vendors.",
                source_regulation="gdpr",
                source_articles=["44", "45", "46", "47", "48", "49"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Map all international transfers in AI data flows (training data, inference, storage)",
                    "Identify transfer mechanism for each (adequacy decision, SCCs, BCRs)",
                    "For US transfers: conduct Transfer Impact Assessment post-Schrems II",
                    "Implement supplementary measures if required",
                    "Document transfers and legal basis in ROPA",
                    "Review transfers when using cloud AI services (AWS, Azure, GCP)",
                ],
                category="privacy",
                applies_to=["provider", "deployer", "third_party_user"],
                summary="Using US cloud AI? You need a legal transfer mechanism + supplementary measures post-Schrems II.",
                effort_level="high",
                legal_basis="Article 44: Any transfer of personal data to a third country shall take place only if the conditions in this Chapter are complied with by the controller and processor.",
                what_it_means="If your AI system sends personal data outside the EU (including to US cloud providers like AWS, Azure, GCP, or AI APIs like OpenAI), you need a legal mechanism. After Schrems II, US transfers require Standard Contractual Clauses (SCCs) plus a Transfer Impact Assessment and supplementary measures.",
                implementation_steps=[
                    "1. DATA FLOW MAPPING: Map all international transfers in AI lifecycle",
                    "2. IDENTIFY DESTINATIONS: List all non-EU countries where data flows",
                    "3. ADEQUACY CHECK: Check if country has adequacy decision (currently: UK, Switzerland, Japan, etc. - NOT USA)",
                    "4. TRANSFER MECHANISM: For non-adequate countries, implement:",
                    "   - Standard Contractual Clauses (most common)",
                    "   - Binding Corporate Rules (for intra-group)",
                    "   - Derogations (limited cases)",
                    "5. US TRANSFERS (post-Schrems II):",
                    "   - Transfer Impact Assessment (TIA)",
                    "   - Supplementary technical measures (encryption, pseudonymization)",
                    "   - Review vendor commitments",
                    "6. DOCUMENTATION: Document all transfers and mechanisms in ROPA",
                    "7. REVIEW: Periodically reassess as legal landscape evolves",
                ],
                evidence_required=[
                    "Data transfer mapping documentation",
                    "Standard Contractual Clauses (signed)",
                    "Transfer Impact Assessments (for US)",
                    "Supplementary measures documentation",
                    "Vendor due diligence records",
                    "ROPA entries for transfers",
                ],
                penalties="Up to €20 million or 4% of annual worldwide turnover.",
                common_pitfalls=[
                    "Not recognizing cloud AI as international transfer",
                    "Relying on Privacy Shield (invalidated)",
                    "No Transfer Impact Assessment for US transfers",
                    "Inadequate supplementary measures",
                    "Not updating when using new AI vendors",
                ],
                related_obligations=["records_of_processing", "dpia", "security_of_processing"],
            )
        )

    # 14. DATA PROTECTION OFFICER (Art. 37-39)
    obligations.append(
        Obligation(
            id="data_protection_officer",
            name="Data Protection Officer (Art. 37-39)",
            description="Financial institutions typically must appoint a DPO. The DPO should be involved in AI projects processing personal data.",
            source_regulation="gdpr",
            source_articles=["37(1)", "38(1)", "38(4)", "39(1)"],
            deadline=None,
            priority="high",
            action_items=[
                "Appoint DPO if required (large scale monitoring, special category data, public authority)",
                "Ensure DPO is involved early in AI projects",
                "Consult DPO on DPIAs for AI systems",
                "Provide DPO with resources for AI oversight",
                "Publish DPO contact details",
                "Notify supervisory authority of DPO appointment",
            ],
            category="privacy",
            applies_to=["provider", "deployer", "third_party_user"],
            summary="Most financial institutions need a DPO. Involve them early in AI projects.",
            effort_level="medium",
            legal_basis="Article 37(1): The controller and the processor shall designate a data protection officer where the core activities consist of processing operations which require regular and systematic monitoring of data subjects on a large scale, or processing special categories of data on a large scale.",
            what_it_means="Financial institutions typically process data on a large scale and often handle special category data, requiring a DPO. The DPO should be consulted on all AI projects involving personal data.",
            implementation_steps=[
                "1. ASSESS REQUIREMENT: Determine if DPO is mandatory (usually yes for financial services)",
                "2. APPOINT DPO: Appoint someone with expert knowledge of data protection",
                "3. AI INVOLVEMENT: Ensure DPO is consulted on all AI projects",
                "4. DPIA ROLE: DPO reviews all DPIAs including for AI systems",
                "5. RESOURCES: Provide DPO adequate resources for AI oversight",
                "6. INDEPENDENCE: Ensure DPO can operate independently",
                "7. ACCESSIBILITY: Make DPO accessible to data subjects and authorities",
                "8. NOTIFICATION: Notify supervisory authority of DPO details",
            ],
            evidence_required=[
                "DPO appointment documentation",
                "DPO contact details publication",
                "Supervisory authority notification",
                "Records of DPO consultation on AI projects",
                "DPO resource allocation",
            ],
            penalties="Up to €10 million or 2% of annual worldwide turnover.",
            common_pitfalls=[
                "Not involving DPO in AI projects",
                "DPO lacking AI/technical expertise",
                "Insufficient resources for DPO",
                "DPO not independent",
            ],
            related_obligations=["dpia", "records_of_processing"],
        )
    )

    return obligations


def get_dora_obligations(
    institution_type: InstitutionType, role: AIRole, third_party_vendor: bool
) -> List[Obligation]:
    # DORA applies to financial entities using ICT, including AI systems
    if role == AIRole.PROVIDER:
        return []  # Pure providers not directly subject to DORA

    obligations = []

    # 1. ICT RISK MANAGEMENT FRAMEWORK (Art. 5-16)
    obligations.append(
        Obligation(
            id="ict_risk_management",
            name="ICT Risk Management Framework (Art. 5-16)",
            description="Financial entities must have a comprehensive ICT risk management framework covering identification, protection, detection, response, recovery, and learning. AI systems are part of ICT and must be included.",
            source_regulation="dora",
            source_articles=["5", "6", "7", "8", "9", "10", "11", "12", "13"],
            deadline="2025-01-17",
            priority="critical",
            action_items=[
                "Include AI systems in ICT risk management framework",
                "Identify and classify AI-related ICT risks",
                "Implement protection measures for AI systems",
                "Establish AI system monitoring and detection capabilities",
                "Define response and recovery procedures for AI failures",
                "Document AI in ICT asset inventory",
            ],
            category="resilience",
            applies_to=["deployer", "third_party_user"],
            summary="AI is ICT under DORA - include it in your ICT risk management framework.",
            effort_level="high",
            legal_basis="Article 5: Financial entities shall have a sound, comprehensive and well-documented ICT risk management framework as part of their overall risk management system.",
            what_it_means="Your AI systems are ICT systems under DORA. They must be fully integrated into your ICT risk management framework, including risk identification, protection, monitoring, incident response, and recovery planning.",
            implementation_steps=[
                "1. INVENTORY: Add all AI systems to ICT asset register with criticality classification",
                "2. RISK ASSESSMENT: Identify AI-specific risks (model failure, bias, adversarial attacks, data poisoning)",
                "3. PROTECTION: Implement controls (access management, encryption, secure development)",
                "4. DETECTION: Monitor AI system performance, anomalies, and failures",
                "5. RESPONSE: Define incident response procedures for AI failures/issues",
                "6. RECOVERY: Establish recovery procedures including model rollback capabilities",
                "7. GOVERNANCE: Assign management responsibility for AI ICT risks",
                "8. DOCUMENTATION: Document all AI-related ICT risk management activities",
            ],
            evidence_required=[
                "ICT risk management framework documentation",
                "AI systems in ICT asset inventory",
                "AI-specific risk assessment",
                "AI protection controls documentation",
                "AI monitoring and detection capabilities",
                "AI incident response and recovery procedures",
            ],
            penalties="Administrative fines and potential supervisory measures.",
            common_pitfalls=[
                "Treating AI separately from ICT risk management",
                "Not classifying AI systems by criticality",
                "Inadequate monitoring of AI system performance",
                "No rollback/recovery procedures for AI failures",
            ],
            related_obligations=["ict_incident_management", "digital_resilience_testing"],
        )
    )

    # 2. ICT INCIDENT MANAGEMENT (Art. 17-23)
    obligations.append(
        Obligation(
            id="ict_incident_management",
            name="ICT Incident Management & Reporting (Art. 17-23)",
            description="Financial entities must have ICT incident management processes including detection, classification, and reporting of major ICT-related incidents. AI system failures/issues must be covered.",
            source_regulation="dora",
            source_articles=["17", "18", "19", "20", "21"],
            deadline="2025-01-17",
            priority="high",
            action_items=[
                "Include AI incidents in incident classification scheme",
                "Define AI-specific incident types (model failures, bias incidents, etc.)",
                "Establish detection mechanisms for AI incidents",
                "Implement reporting procedures for major AI-related incidents",
                "Maintain incident log including AI incidents",
            ],
            category="resilience",
            applies_to=["deployer", "third_party_user"],
            summary="Report AI failures/incidents like other ICT incidents - may need to notify regulators.",
            effort_level="medium",
            legal_basis="Article 17: Financial entities shall define, establish and implement an ICT-related incident management process to detect, manage and notify ICT-related incidents.",
            what_it_means="When your AI system fails, produces biased outputs, or has security incidents, these are ICT incidents under DORA. You need processes to detect, manage, and potentially report these to regulators.",
            implementation_steps=[
                "1. CLASSIFICATION: Define AI incident types in your taxonomy (model failure, performance degradation, bias detected, adversarial attack, data breach, etc.)",
                "2. DETECTION: Implement monitoring to detect AI incidents (performance thresholds, anomaly detection)",
                "3. LOGGING: Log all AI incidents with timestamp, description, impact, response",
                "4. ASSESSMENT: Assess each incident against major incident criteria",
                "5. ESCALATION: Define escalation procedures for AI incidents",
                "6. REPORTING: If major incident criteria met, report to competent authority within timelines",
                "7. POST-INCIDENT: Conduct root cause analysis, document lessons learned",
            ],
            evidence_required=[
                "Incident classification scheme including AI incidents",
                "AI incident detection mechanisms",
                "Incident log with AI incidents recorded",
                "Major incident reports submitted (if any)",
                "Post-incident analysis reports",
            ],
            penalties="Administrative fines for failure to report major incidents.",
            common_pitfalls=[
                "Not recognizing AI failures as ICT incidents",
                "No monitoring to detect AI incidents",
                "Failing to report major AI-related incidents",
                "Not conducting post-incident analysis",
            ],
            related_obligations=["ict_risk_management"],
        )
    )

    # 3. DIGITAL RESILIENCE TESTING (Art. 24-27)
    obligations.append(
        Obligation(
            id="digital_resilience_testing",
            name="Digital Operational Resilience Testing (Art. 24-27)",
            description="Financial entities must establish and maintain a digital operational resilience testing program. AI systems must be included in testing scope.",
            source_regulation="dora",
            source_articles=["24", "25", "26", "27"],
            deadline="2025-01-17",
            priority="high",
            action_items=[
                "Include AI systems in resilience testing program",
                "Conduct vulnerability assessments of AI systems",
                "Test AI system recovery procedures",
                "Perform scenario testing including AI failures",
                "For critical AI: include in threat-led penetration testing (TLPT)",
            ],
            category="resilience",
            applies_to=["deployer", "third_party_user"],
            summary="Test AI system resilience - can it withstand attacks, failures, and recover?",
            effort_level="high",
            legal_basis="Article 24: Financial entities shall establish, maintain and review a sound and comprehensive digital operational resilience testing programme as an integral part of the ICT risk-management framework.",
            what_it_means="You must regularly test your AI systems' resilience - can they withstand attacks, failures, and adverse conditions? Do your recovery procedures work?",
            implementation_steps=[
                "1. SCOPE: Identify AI systems to include in testing program",
                "2. VULNERABILITY ASSESSMENT: Scan AI systems for vulnerabilities",
                "3. PENETRATION TESTING: Test AI systems against adversarial attacks",
                "4. SCENARIO TESTING: Test AI failure scenarios and recovery",
                "5. STRESS TESTING: Test AI under high load/adverse conditions",
                "6. MODEL TESTING: Test model robustness and degradation",
                "7. TLPT: For critical AI, include in threat-led penetration testing",
                "8. REMEDIATION: Address findings and document improvements",
            ],
            evidence_required=[
                "Testing program documentation including AI scope",
                "Vulnerability assessment results",
                "Penetration testing reports",
                "Scenario testing results",
                "Remediation action records",
                "TLPT reports (if applicable)",
            ],
            penalties="Administrative fines and supervisory measures.",
            common_pitfalls=[
                "Excluding AI from ICT testing scope",
                "Not testing adversarial robustness",
                "No recovery testing for AI systems",
            ],
            related_obligations=["ict_risk_management"],
        )
    )

    # 4. THIRD-PARTY ICT RISK (Art. 28-44) - if using third-party AI vendors
    if third_party_vendor:
        obligations.append(
            Obligation(
                id="third_party_ict_risk",
                name="Third-Party ICT Risk Management (Art. 28-44)",
                description="Financial entities using third-party ICT service providers (including AI vendors) must manage the associated risks through proper due diligence, contractual arrangements, and ongoing monitoring.",
                source_regulation="dora",
                source_articles=["28", "29", "30", "31", "32"],
                deadline="2025-01-17",
                priority="critical",
                action_items=[
                    "Maintain register of all AI third-party providers",
                    "Conduct due diligence on AI vendors",
                    "Ensure contracts include DORA-required provisions",
                    "Monitor AI vendor performance continuously",
                    "Assess concentration risk from AI vendors",
                    "Have exit strategies for AI vendor relationships",
                ],
                category="resilience",
                applies_to=["third_party_user"],
                summary="🔴 BUYING AI FROM A VENDOR? You must manage vendor risks, have proper contracts, and plan for vendor failure.",
                effort_level="high",
                legal_basis="Article 28: Financial entities shall manage ICT third-party risk as an integral component of ICT risk within their ICT risk management framework.",
                what_it_means="If you use third-party AI services (cloud AI, AI platforms, AI model providers), you remain responsible for managing the risks. You need contracts with specific provisions, ongoing monitoring, and exit plans.",
                implementation_steps=[
                    "1. REGISTER: Maintain register of all AI third-party providers",
                    "2. CLASSIFICATION: Classify providers by criticality/importance",
                    "3. DUE DILIGENCE: Conduct thorough due diligence before engaging AI vendors",
                    "4. CONTRACTS: Ensure contracts include Art. 30 required provisions:",
                    "   - Service level descriptions",
                    "   - Data location provisions",
                    "   - Security requirements",
                    "   - Incident notification obligations",
                    "   - Audit rights",
                    "   - Exit provisions and data return",
                    "5. MONITORING: Continuously monitor vendor performance and risks",
                    "6. CONCENTRATION: Assess concentration risk (over-reliance on single vendor)",
                    "7. EXIT PLANNING: Develop and test exit strategies",
                    "8. SUBCONTRACTING: Manage risks from vendors' subcontractors",
                ],
                evidence_required=[
                    "Third-party AI provider register",
                    "Due diligence reports for AI vendors",
                    "Contracts with DORA-compliant provisions",
                    "Ongoing monitoring reports",
                    "Concentration risk assessment",
                    "Exit strategy documentation",
                ],
                penalties="Administrative fines and potential restrictions on use of providers.",
                common_pitfalls=[
                    "Not recognizing AI services as third-party ICT",
                    "Contracts missing required DORA provisions",
                    "No ongoing monitoring of AI vendor performance",
                    "Over-concentration on single AI vendor",
                    "No viable exit strategy if vendor fails",
                ],
                related_obligations=["ict_risk_management", "information_sharing"],
            )
        )

        # Critical/Important Function Provider requirements
        obligations.append(
            Obligation(
                id="critical_function_oversight",
                name="Critical ICT Third-Party Provider Oversight (Art. 31)",
                description="If your AI vendor supports a critical or important function, enhanced requirements apply including mandatory contractual elements and notification to regulators.",
                source_regulation="dora",
                source_articles=["31", "32"],
                deadline="2025-01-17",
                priority="critical",
                action_items=[
                    "Identify if AI supports critical/important functions",
                    "If critical: ensure enhanced contractual provisions",
                    "Notify competent authority of critical provider arrangements",
                    "Implement enhanced monitoring for critical providers",
                    "Ensure business continuity for critical AI functions",
                ],
                category="resilience",
                applies_to=["third_party_user"],
                summary="🔴 CRITICAL AI FROM VENDOR? Enhanced oversight, regulator notification, and business continuity required.",
                effort_level="high",
                legal_basis="Article 31: Financial entities shall identify and assess whether an ICT service supports a critical or important function.",
                what_it_means="If your AI system performs a function essential to your business (e.g., credit decisions, fraud detection), and you use a third-party provider, you have heightened obligations including regulatory notification.",
                implementation_steps=[
                    "1. FUNCTION MAPPING: Map AI systems to business functions",
                    "2. CRITICALITY ASSESSMENT: Determine if function is critical/important",
                    "3. ENHANCED CONTRACTS: Ensure additional contractual requirements for critical",
                    "4. NOTIFICATION: Notify competent authority of critical provider arrangements",
                    "5. ENHANCED MONITORING: Implement heightened monitoring",
                    "6. BUSINESS CONTINUITY: Ensure you can continue operations if provider fails",
                    "7. SUBSTITUTABILITY: Assess ability to switch providers",
                ],
                evidence_required=[
                    "Critical function assessment",
                    "Enhanced contracts for critical providers",
                    "Regulatory notification confirmation",
                    "Business continuity plans",
                    "Substitutability assessment",
                ],
                penalties="Significant administrative fines and potential restriction on use of provider.",
                related_obligations=["third_party_ict_risk", "ict_risk_management"],
            )
        )

    # 5. INFORMATION SHARING (Art. 45)
    obligations.append(
        Obligation(
            id="information_sharing",
            name="Information Sharing on Cyber Threats (Art. 45)",
            description="Financial entities may participate in information sharing arrangements on cyber threats, including AI-specific threats and vulnerabilities.",
            source_regulation="dora",
            source_articles=["45"],
            deadline="2025-01-17",
            priority="medium",
            action_items=[
                "Consider participation in threat intelligence sharing",
                "Share AI-specific threat information with peers",
                "Implement safeguards for shared information",
                "Notify authority of participation in sharing arrangements",
            ],
            category="resilience",
            applies_to=["deployer", "third_party_user"],
            summary="Optional: Share AI threat intelligence with other financial entities.",
            effort_level="low",
            legal_basis="Article 45: Financial entities may exchange amongst themselves cyber threat information and intelligence.",
            what_it_means="You can (and are encouraged to) share information about cyber threats affecting AI systems with other financial entities, helping the sector collectively defend against emerging threats.",
            implementation_steps=[
                "1. ASSESS: Evaluate benefits of threat sharing for AI",
                "2. JOIN: Consider joining sector threat sharing groups",
                "3. SHARE: Contribute AI-specific threat intelligence",
                "4. PROTECT: Implement safeguards for sensitive shared information",
                "5. NOTIFY: Inform competent authority of sharing arrangements",
            ],
            evidence_required=[
                "Threat sharing arrangement documentation",
                "Authority notification (if participating)",
                "Safeguards for shared information",
            ],
            common_pitfalls=[
                "Not participating in valuable threat sharing",
                "Sharing competitively sensitive information inappropriately",
            ],
            related_obligations=["ict_incident_management"],
        )
    )

    return obligations


def get_gpai_obligations(
    role: AIRole,
    uses_gpai_model: bool,
    gpai_with_systemic_risk: bool,
    fine_tuned_gpai: bool,
) -> List[Obligation]:
    """
    General Purpose AI (GPAI) Model obligations under EU AI Act Articles 51-56.

    GPAI models include foundation models like GPT-4, Claude, Llama, Gemini, etc.
    These obligations primarily apply to GPAI providers, but deployers using GPAI
    downstream systems also have transparency and documentation obligations.
    """
    if not uses_gpai_model:
        return []

    obligations = []
    is_provider = role in {AIRole.PROVIDER, AIRole.PROVIDER_AND_DEPLOYER}
    _ = is_provider  # Role awareness for future provider-specific GPAI obligations

    # 1. GPAI TRANSPARENCY OBLIGATIONS (Art. 53) - For all GPAI
    obligations.append(
        Obligation(
            id="gpai_transparency",
            name="GPAI Model Transparency (Art. 53)",
            description="Providers of GPAI models must provide technical documentation, instructions for downstream providers, comply with copyright, and publish training content summary.",
            source_regulation="eu_ai_act",
            source_articles=["53(1)", "53(2)", "53(3)", "53(4)"],
            deadline="2025-08-02",
            priority="critical",
            action_items=[
                "Obtain or verify GPAI model documentation from provider",
                "Document integration approach and any modifications",
                "Assess copyright compliance for training data (if known)",
                "Ensure downstream transparency to end users",
                "Maintain records of GPAI model version and capabilities used",
                "Review provider's published training content summary",
            ],
            category="governance",
            applies_to=["provider", "deployer"],
            summary="If using GPAI (GPT-4, Claude, etc.), document it and ensure transparency downstream.",
            effort_level="medium",
            legal_basis="Article 53(1): Providers of general-purpose AI models shall draw up and keep up-to-date the technical documentation of the model, including its training and testing process.",
            what_it_means="When using foundation models like GPT-4, Claude, or Llama in your AI system, you must document this clearly and ensure the GPAI provider has met their transparency obligations. As a deployer integrating GPAI, you inherit transparency duties.",
            implementation_steps=[
                "1. INVENTORY: Identify all GPAI models used in your systems",
                "2. DOCUMENTATION: Obtain technical documentation from GPAI provider",
                "3. VERSION CONTROL: Track GPAI model versions deployed",
                "4. INTEGRATION DOCS: Document how GPAI is integrated into your system",
                "5. COPYRIGHT: Verify provider's copyright compliance representations",
                "6. DOWNSTREAM TRANSPARENCY: Inform users that GPAI is used",
                "7. MONITORING: Track GPAI provider updates and changes",
            ],
            evidence_required=[
                "GPAI model inventory",
                "Provider technical documentation",
                "Integration documentation",
                "Version tracking records",
                "User transparency notices",
            ],
            penalties="Up to €15 million or 3% of annual worldwide turnover for GPAI violations.",
            common_pitfalls=[
                "Not tracking which GPAI models are used where",
                "Missing provider documentation",
                "Not informing users that GPAI powers the system",
                "Ignoring GPAI model updates that may affect compliance",
            ],
            related_obligations=["technical_documentation", "transparency_disclosure"],
        )
    )

    # 2. GPAI MODEL EVALUATION (Art. 55) - For deployers integrating GPAI
    obligations.append(
        Obligation(
            id="gpai_evaluation",
            name="GPAI Model Evaluation & Testing (Art. 55)",
            description="Deployers integrating GPAI models into high-risk AI systems must evaluate model capabilities, limitations, and risks for their specific use case.",
            source_regulation="eu_ai_act",
            source_articles=["55(1)", "55(2)"],
            deadline="2025-08-02",
            priority="high",
            action_items=[
                "Evaluate GPAI model capabilities for intended use case",
                "Assess model limitations and failure modes",
                "Test for bias and discrimination in your context",
                "Document suitability assessment",
                "Implement safeguards for identified risks",
                "Establish ongoing performance monitoring",
            ],
            category="technical",
            applies_to=["deployer", "provider_and_deployer"],
            summary="Evaluate GPAI suitability for your use case - capabilities, limitations, and risks.",
            effort_level="high",
            legal_basis="Article 55: Providers integrating general-purpose AI models into high-risk AI systems must evaluate and test the GPAI model for their specific intended purpose.",
            what_it_means="You can't just plug in GPT-4 without assessment. You must evaluate whether the GPAI model is suitable for your specific financial services use case and test it properly.",
            implementation_steps=[
                "1. USE CASE DEFINITION: Clearly define how GPAI will be used",
                "2. CAPABILITY ASSESSMENT: Test if model can perform required tasks",
                "3. LIMITATION MAPPING: Identify where model may fail or produce errors",
                "4. BIAS TESTING: Test for discriminatory outputs in your context",
                "5. RISK ASSESSMENT: Document risks specific to your integration",
                "6. SAFEGUARDS: Implement guardrails and human oversight",
                "7. ONGOING MONITORING: Track performance in production",
            ],
            evidence_required=[
                "GPAI suitability assessment",
                "Testing results and methodology",
                "Bias evaluation report",
                "Risk assessment documentation",
                "Safeguard implementation records",
                "Monitoring procedures",
            ],
            penalties="Up to €35 million or 7% for using unsuitable GPAI in high-risk systems.",
            common_pitfalls=[
                "Assuming GPAI is suitable without testing",
                "Not testing for bias in financial contexts",
                "Inadequate safeguards for GPAI hallucinations",
                "No ongoing performance monitoring",
            ],
            related_obligations=["risk_management_system", "accuracy_robustness"],
        )
    )

    # 3. GPAI SYSTEMIC RISK (Art. 51, 55) - If using GPAI with systemic risk
    if gpai_with_systemic_risk:
        obligations.append(
            Obligation(
                id="gpai_systemic_risk",
                name="GPAI Systemic Risk Obligations (Art. 51, 55)",
                description="GPAI models with systemic risk (trained with >10^25 FLOPs or designated by Commission) have additional obligations including adversarial testing and serious incident reporting.",
                source_regulation="eu_ai_act",
                source_articles=["51(1)", "51(2)", "55(1)", "55(2)"],
                deadline="2025-08-02",
                priority="critical",
                action_items=[
                    "Verify if GPAI model has systemic risk designation",
                    "Review provider's adversarial testing results",
                    "Ensure provider has cybersecurity protections",
                    "Monitor for serious incidents involving the model",
                    "Assess systemic risk implications for your use case",
                    "Report any serious incidents to authorities",
                ],
                category="governance",
                applies_to=["provider", "deployer"],
                summary="Using frontier AI models (GPT-4, Claude 3, etc.) - additional scrutiny required.",
                effort_level="high",
                legal_basis="Article 51(2): A general-purpose AI model shall be presumed to have high impact capabilities when the cumulative amount of compute used for its training exceeds 10^25 floating point operations.",
                what_it_means="If you're using top-tier models like GPT-4, Claude 3 Opus, or similar frontier models, these likely have 'systemic risk' under the AI Act. You need to verify the provider meets enhanced obligations.",
                implementation_steps=[
                    "1. CLASSIFICATION: Determine if GPAI has systemic risk designation",
                    "2. PROVIDER VERIFICATION: Verify provider compliance with Art. 55",
                    "3. ADVERSARIAL TESTING: Review provider's red-teaming results",
                    "4. CYBERSECURITY: Assess model cybersecurity protections",
                    "5. INCIDENT MONITORING: Set up serious incident detection",
                    "6. REPORTING: Establish incident reporting procedures",
                    "7. ONGOING: Monitor for Commission designations",
                ],
                evidence_required=[
                    "Systemic risk classification assessment",
                    "Provider compliance verification",
                    "Adversarial testing review",
                    "Cybersecurity assessment",
                    "Incident monitoring procedures",
                    "Incident reports (if any)",
                ],
                penalties="Up to €35 million or 7% for systemic risk GPAI violations.",
                common_pitfalls=[
                    "Assuming provider handles everything",
                    "Not monitoring for model designation changes",
                    "Missing serious incident reporting",
                ],
                related_obligations=["gpai_transparency", "serious_incident_reporting"],
            )
        )

    # 4. FINE-TUNED GPAI OBLIGATIONS (Art. 53) - If fine-tuning
    if fine_tuned_gpai:
        obligations.append(
            Obligation(
                id="gpai_fine_tuning",
                name="Fine-Tuned GPAI Obligations (Art. 53, 25)",
                description="If you fine-tune a GPAI model, you may become a provider of a new AI system with full provider obligations including technical documentation and conformity assessment.",
                source_regulation="eu_ai_act",
                source_articles=["53(3)", "25(1)", "25(2)"],
                deadline="2025-08-02",
                priority="critical",
                action_items=[
                    "Assess if fine-tuning creates a 'new' AI system",
                    "Document fine-tuning process and data used",
                    "If new system: comply with full provider obligations",
                    "Maintain technical documentation for fine-tuned model",
                    "Test fine-tuned model for your specific use case",
                    "Consider if high-risk classification applies",
                ],
                category="governance",
                applies_to=["provider", "provider_and_deployer"],
                summary="Fine-tuning GPAI may make you a provider with full AI Act obligations.",
                effort_level="high",
                legal_basis="Article 25: A deployer of a high-risk AI system that makes a substantial modification to the system shall be considered a provider.",
                what_it_means="If you fine-tune GPT-4 or Claude for your specific use case, you may become the provider of a new AI system. This means you need to meet all provider obligations, potentially including conformity assessment for high-risk uses.",
                implementation_steps=[
                    "1. ASSESSMENT: Determine if fine-tuning = substantial modification",
                    "2. CLASSIFICATION: Assess if resulting system is high-risk",
                    "3. DOCUMENTATION: Document fine-tuning data and process",
                    "4. TESTING: Test fine-tuned model thoroughly",
                    "5. PROVIDER OBLIGATIONS: If provider, meet full obligations",
                    "6. CONFORMITY: If high-risk, complete conformity assessment",
                    "7. MAINTAIN: Keep technical documentation up to date",
                ],
                evidence_required=[
                    "Substantial modification assessment",
                    "Risk classification for fine-tuned model",
                    "Fine-tuning documentation",
                    "Testing results",
                    "Provider obligation compliance (if applicable)",
                    "Conformity assessment (if high-risk)",
                ],
                penalties="Up to €35 million or 7% if high-risk provider obligations not met.",
                common_pitfalls=[
                    "Thinking fine-tuning doesn't change obligations",
                    "Inadequate documentation of fine-tuning process",
                    "Missing conformity assessment for high-risk use",
                ],
                related_obligations=["gpai_transparency", "technical_documentation", "conformity_assessment"],
            )
        )

    return obligations


def get_sectoral_obligations(
    institution_type: InstitutionType,
    use_case: AIUseCase,
    provides_investment_advice: bool,
    processes_payments: bool,
    performs_aml_obligations: bool,
) -> List[Obligation]:
    """
    Sectoral regulatory obligations for financial institutions using AI.

    These regulations work alongside the AI Act and may impose additional
    requirements for specific use cases.
    """
    obligations = []

    # 1. MIFID II - INVESTMENT ADVICE & SUITABILITY (Art. 25)
    if provides_investment_advice or use_case in {
        AIUseCase.ROBO_ADVISORY,
        AIUseCase.ROBO_ADVISORY_RETAIL,
        AIUseCase.ROBO_ADVISORY_PROFESSIONAL,
        AIUseCase.PORTFOLIO_OPTIMIZATION,
        AIUseCase.INVESTMENT_RESEARCH,
    }:
        obligations.append(
            Obligation(
                id="mifid_suitability",
                name="MiFID II Suitability Assessment (Art. 25)",
                description="AI providing investment advice must perform suitability assessment ensuring recommendations are suitable for the client's knowledge, experience, financial situation, and investment objectives.",
                source_regulation="mifid_ii",
                source_articles=["25(2)", "25(3)", "54-56 Delegated Regulation"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Ensure AI collects required suitability information",
                    "Implement suitability assessment logic in AI",
                    "Document how AI determines suitability",
                    "Test suitability recommendations for appropriateness",
                    "Maintain audit trail of suitability assessments",
                    "Enable human review of AI recommendations",
                    "Disclose AI use in investment advice process",
                ],
                category="sectoral",
                applies_to=["provider", "deployer"],
                summary="AI investment advice must be suitable for the client - collect info and assess properly.",
                effort_level="high",
                legal_basis="MiFID II Article 25(2): Investment firms providing investment advice or portfolio management shall obtain the necessary information regarding the client's knowledge and experience, financial situation, and investment objectives.",
                what_it_means="If your AI gives investment advice (robo-advisory), it must collect client information and ensure recommendations are suitable. This isn't optional - it's a core investor protection requirement.",
                implementation_steps=[
                    "1. DATA COLLECTION: Ensure AI gathers required suitability info",
                    "2. ASSESSMENT LOGIC: Implement compliant suitability determination",
                    "3. DOCUMENTATION: Document AI's decision-making process",
                    "4. TESTING: Test across client profiles for appropriate recommendations",
                    "5. HUMAN OVERSIGHT: Enable escalation and review",
                    "6. AUDIT TRAIL: Log all suitability assessments",
                    "7. DISCLOSURE: Inform clients of AI involvement",
                ],
                evidence_required=[
                    "Suitability questionnaire/data collection",
                    "AI suitability algorithm documentation",
                    "Testing results across client profiles",
                    "Audit trail of assessments",
                    "Client disclosure documentation",
                ],
                penalties="FCA/NCA fines; client compensation for unsuitable advice; authorization risk.",
                common_pitfalls=[
                    "Insufficient client profiling",
                    "AI recommendations overriding suitability",
                    "No audit trail of AI decisions",
                    "Missing disclosure of AI use",
                ],
                related_obligations=["human_oversight", "transparency_disclosure"],
            )
        )

    # 2. MIFID II - ALGORITHMIC TRADING (Art. 17)
    if use_case in {
        AIUseCase.ALGORITHMIC_TRADING,
        AIUseCase.HIGH_FREQUENCY_TRADING,
        AIUseCase.MARKET_MAKING,
        AIUseCase.SMART_ORDER_ROUTING,
        AIUseCase.BEST_EXECUTION,
    }:
        obligations.append(
            Obligation(
                id="mifid_algo_trading",
                name="MiFID II Algorithmic Trading Requirements (Art. 17)",
                description="Investment firms using algorithmic trading must have effective systems and controls, notify competent authorities, and ensure algorithms don't contribute to disorderly markets.",
                source_regulation="mifid_ii",
                source_articles=["17(1)", "17(2)", "17(3)", "17(4)", "17(5)"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Implement effective systems and risk controls",
                    "Notify NCA of algorithmic trading activities",
                    "Implement kill switches and circuit breakers",
                    "Test algorithms before deployment and after changes",
                    "Monitor for market abuse and disorderly conditions",
                    "Maintain records for 5 years",
                    "Annual self-assessment and regulatory reporting",
                ],
                category="sectoral",
                applies_to=["provider", "deployer"],
                summary="AI trading algorithms need controls, testing, kill switches, and regulatory notification.",
                effort_level="high",
                legal_basis="MiFID II Article 17(1): An investment firm that engages in algorithmic trading shall have in place effective systems and risk controls to ensure that its trading systems are resilient and have sufficient capacity.",
                what_it_means="AI-powered trading algorithms are subject to strict MiFID II controls. You need kill switches, testing regimes, ongoing monitoring, and regulatory notifications.",
                implementation_steps=[
                    "1. NOTIFICATION: Notify NCA of algorithmic trading",
                    "2. SYSTEMS: Implement resilient trading systems",
                    "3. CONTROLS: Deploy kill switches and circuit breakers",
                    "4. TESTING: Comprehensive pre-deployment testing",
                    "5. MONITORING: Real-time monitoring for market abuse",
                    "6. RECORDS: Maintain detailed records for 5 years",
                    "7. REPORTING: Annual self-assessment and reporting",
                ],
                evidence_required=[
                    "NCA notification documentation",
                    "Systems and controls documentation",
                    "Testing records and results",
                    "Kill switch procedures",
                    "Monitoring logs",
                    "5-year record retention",
                    "Annual self-assessment",
                ],
                penalties="Significant NCA fines; suspension of trading permissions; criminal liability for market abuse.",
                common_pitfalls=[
                    "Inadequate testing before deployment",
                    "Missing kill switch procedures",
                    "Insufficient market abuse monitoring",
                    "Poor record keeping",
                ],
                related_obligations=["ict_risk_management", "automatic_logging"],
            )
        )

    # 3. PSD2 - PAYMENT AI SECURITY (Art. 5, 95-98)
    if processes_payments or use_case in {AIUseCase.FRAUD_DETECTION_CARD}:
        obligations.append(
            Obligation(
                id="psd2_security",
                name="PSD2 Payment Security for AI (Art. 95-98)",
                description="AI systems processing payments or detecting fraud must comply with PSD2 security requirements including strong customer authentication and operational/security risk management.",
                source_regulation="psd2",
                source_articles=["95", "96", "97", "98", "RTS on SCA"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Ensure AI doesn't bypass Strong Customer Authentication",
                    "Implement transaction risk analysis per RTS",
                    "Report major security incidents involving AI",
                    "Conduct operational and security risk assessment",
                    "Test AI fraud detection against SCA exemption criteria",
                    "Document AI role in payment security",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="AI in payments must support SCA and comply with PSD2 security framework.",
                effort_level="high",
                legal_basis="PSD2 Article 97: Member States shall ensure that a payment service provider applies strong customer authentication where the payer initiates an electronic payment transaction.",
                what_it_means="If AI is used in payment processing or fraud detection, it must work within the PSD2 framework. AI-based transaction risk analysis can enable SCA exemptions, but must meet strict criteria.",
                implementation_steps=[
                    "1. SCA INTEGRATION: Ensure AI supports, doesn't bypass SCA",
                    "2. TRA: If using Transaction Risk Analysis exemption, meet criteria",
                    "3. FRAUD DETECTION: Test AI fraud detection rates",
                    "4. INCIDENT REPORTING: Integrate AI incidents into security reporting",
                    "5. RISK ASSESSMENT: Include AI in operational/security risk assessment",
                    "6. DOCUMENTATION: Document AI's role in payment security",
                ],
                evidence_required=[
                    "SCA integration documentation",
                    "Transaction Risk Analysis compliance (if applicable)",
                    "Fraud detection performance metrics",
                    "Security incident reporting procedures",
                    "Operational/security risk assessment",
                ],
                penalties="NCA fines; authorization risk; liability for unauthorized transactions.",
                common_pitfalls=[
                    "AI creating SCA bypasses",
                    "TRA exemption criteria not met",
                    "Missing security incident reporting",
                ],
                related_obligations=["ict_risk_management", "fraud_detection"],
            )
        )

    # 4. AMLD6 - AML/KYC AI REQUIREMENTS
    if performs_aml_obligations or use_case in {
        AIUseCase.AML_KYC,
        AIUseCase.AML_TRANSACTION_MONITORING,
        AIUseCase.AML_CUSTOMER_RISK_SCORING,
        AIUseCase.SANCTIONS_SCREENING,
        AIUseCase.PEP_SCREENING,
        AIUseCase.TRANSACTION_MONITORING,
    }:
        obligations.append(
            Obligation(
                id="amld6_ai_requirements",
                name="AMLD6 AML/KYC AI Requirements",
                description="AI used for AML/KYC must support regulatory obligations including customer due diligence, transaction monitoring, suspicious activity reporting, and sanctions screening.",
                source_regulation="amld6",
                source_articles=["8", "11", "13", "14", "18", "33"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Ensure AI supports (not replaces) human judgment on SARs",
                    "Document AI role in customer risk assessment",
                    "Test AI transaction monitoring for false positive/negative rates",
                    "Implement AI model governance for AML models",
                    "Ensure sanctions screening AI is up-to-date",
                    "Maintain explainability for regulatory examinations",
                    "Report AI-detected suspicious activity appropriately",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="AML AI must support human judgment, be explainable, and meet regulatory effectiveness standards.",
                effort_level="high",
                legal_basis="AMLD6 Article 8: Obliged entities shall take appropriate steps to identify and assess the risks of money laundering and terrorist financing. Article 33: Suspicious transactions shall be reported to the FIU.",
                what_it_means="AI can assist with AML but cannot fully automate suspicious activity decisions. You need human oversight, explainability for examiners, and documented effectiveness.",
                implementation_steps=[
                    "1. HUMAN OVERSIGHT: Ensure humans review AI-flagged activity",
                    "2. EXPLAINABILITY: AI must explain why transactions flagged",
                    "3. EFFECTIVENESS: Test and document false positive/negative rates",
                    "4. MODEL GOVERNANCE: Implement AML model risk management",
                    "5. UPDATES: Keep sanctions lists and risk rules current",
                    "6. DOCUMENTATION: Maintain audit trail for examinations",
                    "7. REPORTING: Integrate AI into SAR process",
                ],
                evidence_required=[
                    "Human oversight procedures",
                    "AI explainability documentation",
                    "Effectiveness testing results",
                    "Model governance framework",
                    "Sanctions list update procedures",
                    "Regulatory examination records",
                ],
                penalties="Significant fines; criminal liability for AML failures; authorization risk.",
                common_pitfalls=[
                    "Over-reliance on AI without human review",
                    "Cannot explain AI decisions to examiners",
                    "High false positive rates overwhelming investigators",
                    "Outdated sanctions lists",
                ],
                related_obligations=["human_oversight", "automatic_logging"],
            )
        )

    # 5. SOLVENCY II - INSURANCE AI MODEL GOVERNANCE (Art. 44)
    if institution_type == InstitutionType.INSURER or use_case in {
        AIUseCase.INSURANCE_PRICING_LIFE,
        AIUseCase.INSURANCE_PRICING_HEALTH,
        AIUseCase.INSURANCE_UNDERWRITING_LIFE,
        AIUseCase.INSURANCE_UNDERWRITING_HEALTH,
        AIUseCase.CLAIMS_PROCESSING,
        AIUseCase.RISK_SELECTION,
    }:
        obligations.append(
            Obligation(
                id="solvency_ii_model_governance",
                name="Solvency II Model Governance (Art. 44, 120)",
                description="Insurance undertakings using AI models must comply with Solvency II governance requirements including model validation, documentation, and internal audit.",
                source_regulation="solvency_ii",
                source_articles=["44", "120", "121", "122"],
                deadline=None,
                priority="high",
                action_items=[
                    "Include AI models in model inventory",
                    "Implement model validation for AI pricing/underwriting models",
                    "Document AI model methodology and assumptions",
                    "Establish model change control procedures",
                    "Internal audit coverage of AI models",
                    "Board reporting on AI model risks",
                    "Actuarial function review of AI models",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="Insurance AI models need validation, documentation, and governance under Solvency II.",
                effort_level="high",
                legal_basis="Solvency II Article 44: Insurance undertakings shall have in place an effective system of governance which provides for sound and prudent management. Article 120: Internal models shall be validated.",
                what_it_means="AI models used in insurance pricing, underwriting, or reserving must be subject to Solvency II model governance. This includes validation, documentation, and board oversight.",
                implementation_steps=[
                    "1. INVENTORY: Add AI models to model inventory",
                    "2. VALIDATION: Independent validation of AI models",
                    "3. DOCUMENTATION: Document methodology, assumptions, limitations",
                    "4. CHANGE CONTROL: Formal approval for model changes",
                    "5. AUDIT: Include AI in internal audit scope",
                    "6. BOARD: Report AI model risks to board",
                    "7. ACTUARIAL: Actuarial function sign-off",
                ],
                evidence_required=[
                    "AI model inventory",
                    "Validation reports",
                    "Model documentation",
                    "Change control records",
                    "Internal audit reports",
                    "Board reporting",
                    "Actuarial function opinions",
                ],
                penalties="Supervisory intervention; capital add-ons; authorization risk.",
                common_pitfalls=[
                    "AI models not in formal model inventory",
                    "Inadequate validation of ML models",
                    "Missing actuarial sign-off",
                    "No board visibility of AI model risks",
                ],
                related_obligations=["risk_management_system", "technical_documentation"],
            )
        )

    # 6. CRD/CRR - CREDIT RISK MODEL REQUIREMENTS (Art. 144-153)
    if institution_type == InstitutionType.BANK or use_case in {
        AIUseCase.CREDIT_SCORING,
        AIUseCase.CREDIT_SCORING_CONSUMER,
        AIUseCase.IRB_MODELS,
        AIUseCase.PD_MODELS,
        AIUseCase.LGD_MODELS,
        AIUseCase.EAD_MODELS,
        AIUseCase.CREDIT_RISK_MODELING,
    }:
        obligations.append(
            Obligation(
                id="crr_model_requirements",
                name="CRD/CRR Credit Risk Model Requirements (Art. 144-153)",
                description="AI used in credit risk models (IRB approach) must meet CRR requirements for model approval, validation, and ongoing monitoring.",
                source_regulation="crd_crr",
                source_articles=["144", "145", "146", "147", "148", "149", "150", "151", "152", "153"],
                deadline=None,
                priority="critical",
                action_items=[
                    "Ensure AI models meet IRB model requirements",
                    "Obtain supervisory approval for AI in IRB models",
                    "Implement model validation for AI components",
                    "Document AI model methodology comprehensively",
                    "Monitor AI model performance and recalibrate",
                    "Back-test AI models against actual outcomes",
                    "Report material model changes to supervisor",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="AI in IRB credit models needs supervisory approval, validation, and ongoing monitoring.",
                effort_level="high",
                legal_basis="CRR Article 144: An institution shall obtain supervisory approval prior to using the IRB approach. Models must meet requirements in Articles 145-153.",
                what_it_means="If you use AI/ML in your IRB credit risk models (PD, LGD, EAD), you need supervisory approval. The supervisor will scrutinize AI methodology, and you must validate and monitor ongoing.",
                implementation_steps=[
                    "1. APPROVAL: Discuss AI use with supervisor before implementation",
                    "2. METHODOLOGY: Document AI methodology to IRB standards",
                    "3. DATA: Ensure training data meets regulatory requirements",
                    "4. VALIDATION: Independent validation of AI models",
                    "5. BACK-TESTING: Regular back-testing against outcomes",
                    "6. MONITORING: Ongoing performance monitoring",
                    "7. REPORTING: Report material changes to supervisor",
                ],
                evidence_required=[
                    "Supervisory approval documentation",
                    "AI methodology documentation",
                    "Data quality assessments",
                    "Validation reports",
                    "Back-testing results",
                    "Performance monitoring reports",
                    "Supervisor correspondence",
                ],
                penalties="Capital add-ons; model rejection; supervisory enforcement.",
                common_pitfalls=[
                    "Deploying AI without supervisor dialogue",
                    "Insufficient methodology documentation",
                    "Inadequate validation of ML approaches",
                    "Missing back-testing regime",
                ],
                related_obligations=["risk_management_system", "model_validation"],
            )
        )

    # 7. MAR - MARKET ABUSE AI (Art. 16)
    if use_case in {
        AIUseCase.TRADE_SURVEILLANCE,
        AIUseCase.MARKET_ABUSE_DETECTION,
        AIUseCase.INSIDER_TRADING_DETECTION,
    }:
        obligations.append(
            Obligation(
                id="mar_surveillance",
                name="MAR Market Abuse Detection Requirements (Art. 16)",
                description="AI used for market abuse detection must meet MAR requirements for detecting and reporting suspicious orders and transactions.",
                source_regulation="mar",
                source_articles=["16(1)", "16(2)"],
                deadline=None,
                priority="high",
                action_items=[
                    "Ensure AI detects market manipulation patterns",
                    "Implement insider trading detection algorithms",
                    "Test AI against known market abuse scenarios",
                    "Maintain STOR (suspicious transaction/order report) procedures",
                    "Train AI on evolving market abuse patterns",
                    "Document AI detection methodology",
                    "Report suspicious activity without delay",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="AI market abuse detection must be effective and support STOR reporting obligations.",
                effort_level="high",
                legal_basis="MAR Article 16(1): Market operators and investment firms that operate a trading venue shall establish and maintain effective arrangements, systems and procedures aimed at preventing and detecting insider dealing, market manipulation and attempted insider dealing and market manipulation.",
                what_it_means="If you use AI for trade surveillance, it must effectively detect market abuse. This means testing against known scenarios, maintaining documentation, and supporting timely STOR reporting.",
                implementation_steps=[
                    "1. SCENARIOS: Train/test AI on market abuse scenarios",
                    "2. DETECTION: Implement manipulation and insider trading detection",
                    "3. TESTING: Regular testing against known patterns",
                    "4. ALERT REVIEW: Human review of AI-generated alerts",
                    "5. STOR: Integrate with STOR reporting process",
                    "6. DOCUMENTATION: Document detection methodology",
                    "7. UPDATES: Update for evolving market abuse patterns",
                ],
                evidence_required=[
                    "Market abuse scenario coverage",
                    "Detection algorithm documentation",
                    "Testing results",
                    "Alert review procedures",
                    "STOR statistics and procedures",
                    "Methodology documentation",
                ],
                penalties="Significant MAR fines; criminal liability for market abuse facilitation.",
                common_pitfalls=[
                    "AI missing new market abuse patterns",
                    "High false positive rates overwhelming reviewers",
                    "Delayed STOR submissions",
                    "Inadequate documentation for regulators",
                ],
                related_obligations=["trade_surveillance", "automatic_logging"],
            )
        )

    # 8. CONSUMER CREDIT DIRECTIVE - CREDITWORTHINESS AI
    if use_case in {
        AIUseCase.CREDIT_SCORING,
        AIUseCase.CREDIT_SCORING_CONSUMER,
        AIUseCase.LOAN_ORIGINATION,
        AIUseCase.LOAN_APPROVAL,
        AIUseCase.AFFORDABILITY_ASSESSMENT,
    }:
        obligations.append(
            Obligation(
                id="ccd_creditworthiness",
                name="Consumer Credit Directive Creditworthiness Assessment",
                description="AI used for consumer creditworthiness assessment must comply with CCD requirements for assessing ability to repay and providing adequate explanations.",
                source_regulation="consumer_credit_directive",
                source_articles=["8", "9", "10"],
                deadline=None,
                priority="high",
                action_items=[
                    "Ensure AI assesses ability to repay, not just default probability",
                    "Use appropriate information sources for assessment",
                    "Provide adequate pre-contractual information",
                    "Explain credit decision basis to consumers",
                    "Document AI's creditworthiness methodology",
                    "Test for discriminatory outcomes",
                    "Enable consumer right to explanation",
                ],
                category="sectoral",
                applies_to=["deployer"],
                summary="Consumer credit AI must assess repayment ability and provide explanations.",
                effort_level="medium",
                legal_basis="Consumer Credit Directive Article 8: The creditor shall assess the consumer's creditworthiness on the basis of sufficient information, where appropriate obtained from the consumer.",
                what_it_means="AI assessing consumer creditworthiness must focus on ability to repay, not just statistical default prediction. Consumers have rights to understand how decisions are made.",
                implementation_steps=[
                    "1. METHODOLOGY: Ensure AI assesses repayment ability",
                    "2. DATA SOURCES: Use appropriate, relevant information",
                    "3. EXPLANATION: Implement consumer explanation capability",
                    "4. DISCLOSURE: Provide required pre-contractual information",
                    "5. TESTING: Test for bias and discrimination",
                    "6. DOCUMENTATION: Document assessment methodology",
                    "7. APPEALS: Enable appeals and human review",
                ],
                evidence_required=[
                    "Creditworthiness methodology documentation",
                    "Data source documentation",
                    "Consumer explanation templates",
                    "Pre-contractual information provided",
                    "Bias testing results",
                    "Appeals procedure",
                ],
                penalties="Consumer compensation; regulatory fines; authorization risk.",
                common_pitfalls=[
                    "AI optimizing for default prediction not repayment ability",
                    "Inadequate consumer explanations",
                    "Discriminatory outcomes",
                    "Missing pre-contractual disclosures",
                ],
                related_obligations=["transparency_disclosure", "human_oversight"],
            )
        )

    return obligations


def build_compliance_timeline(obligations: List[Obligation]) -> List[dict]:
    timeline = []
    seen = set()
    for obligation in obligations:
        if obligation.deadline and obligation.deadline not in seen:
            timeline.append(
                {
                    "date": obligation.deadline,
                    "event": f"Compliance deadline for {obligation.source_regulation.upper()}",
                    "impact": "critical",
                }
            )
            seen.add(obligation.deadline)
    return timeline


def get_classification_basis(request: ObligationRequest) -> str:
    bases = {
        # Annex III point 5(b) - Access to essential private services (NATURAL PERSONS only)
        AIUseCase.CREDIT_SCORING: "Annex III, point 5(b) - creditworthiness assessment of natural persons",
        AIUseCase.CREDIT_SCORING_CORPORATE: "Not in Annex III 5(b) - Annex III 5(b) covers only natural persons; B2B/corporate credit is minimal risk",
        AIUseCase.CORPORATE_RISK_OPINION: "Not in Annex III 5(b) - B2B/corporate risk opinion with human credit officer decision = minimal risk",
        AIUseCase.LOAN_ORIGINATION: "Annex III, point 5(b) - access to and enjoyment of essential private services (credit)",
        AIUseCase.MORTGAGE_UNDERWRITING: "Annex III, point 5(b) - access to and enjoyment of essential private services (credit)",
        # Annex III point 5(c) - Life and health insurance ONLY
        AIUseCase.INSURANCE_PRICING: "Annex III, point 5(c) - life and health insurance risk assessment (NOT property/liability)",
        AIUseCase.INSURANCE_UNDERWRITING: "Annex III, point 5(c) - life and health insurance risk assessment (NOT property/liability)",
        # Annex III point 4 - Employment
        AIUseCase.CV_SCREENING: "Annex III, point 4(a) - recruitment and selection of natural persons",
        AIUseCase.CANDIDATE_RANKING: "Annex III, point 4(a) - recruitment and selection of natural persons",
        AIUseCase.INTERVIEW_ANALYSIS: "Annex III, point 4(a) - recruitment and selection of natural persons",
        AIUseCase.EMPLOYEE_PERFORMANCE: "Annex III, point 4(b) - decisions affecting terms of work relationship",
        AIUseCase.PROMOTION_DECISIONS: "Annex III, point 4(b) - decisions on promotion and termination",
        AIUseCase.EMPLOYEE_MONITORING: "Annex III, point 4(c) - monitoring and evaluation of performance",
        # Limited risk - Article 50 transparency
        AIUseCase.CUSTOMER_CHATBOT: "Article 50(1) - AI systems intended to directly interact with natural persons",
        AIUseCase.VOICE_ASSISTANT: "Article 50(1) - AI systems intended to directly interact with natural persons",
    }
    
    base = bases.get(request.use_case)
    if base:
        return base
    
    # Context-dependent explanation
    if request.is_high_impact:
        return "Art. 6(2) - high impact on individuals may elevate to high-risk"
    
    return "Requires contextual assessment per Art. 6(3) - assess impact on individuals"


def get_warnings(request: ObligationRequest) -> List[str]:
    warnings = []
    
    # Context-dependent use cases requiring individual assessment
    context_dependent = [
        AIUseCase.FRAUD_DETECTION,
        AIUseCase.AML_KYC,
        AIUseCase.TRANSACTION_MONITORING,
        AIUseCase.CLAIMS_PROCESSING,
        AIUseCase.ROBO_ADVISORY,
        AIUseCase.COLLECTIONS_RECOVERY,
        AIUseCase.CUSTOMER_ONBOARDING,
    ]
    
    # Insurance-specific warning
    if request.use_case in [AIUseCase.INSURANCE_PRICING, AIUseCase.INSURANCE_UNDERWRITING]:
        warnings.append(
            "⚠️ IMPORTANT: Annex III point 5(c) only covers LIFE and HEALTH insurance. "
            "Property/liability insurance pricing is NOT automatically high-risk. "
            "Verify your specific insurance type."
        )
    
    # AML/KYC can be high-risk if it denies access
    if request.use_case in [AIUseCase.AML_KYC, AIUseCase.FRAUD_DETECTION, AIUseCase.CUSTOMER_ONBOARDING]:
        warnings.append(
            "⚠️ If this AI can result in denial of financial services access, "
            "it may be HIGH-RISK under Annex III point 5(b). Assess carefully."
        )
    
    if request.use_case in context_dependent:
        warnings.append(
            "Classification depends on significant impact on individuals. Conduct case-by-case assessment per Art. 6(3)."
        )
    
    if request.involves_profiling:
        warnings.append(
            "Profiling triggers GDPR Art. 22 safeguards. Consider if you need explicit consent or legitimate interest assessment."
        )
    
    if request.fully_automated:
        warnings.append(
            "⚠️ Fully automated decisions with legal/significant effects require: (1) human review mechanism, "
            "(2) right to contest decision, (3) explanation of logic. See GDPR Art. 22."
        )
    
    if request.uses_special_category_data:
        warnings.append(
            "Special category data (health, biometric, race, etc.) requires explicit Art. 9(2) legal basis. "
            "Consent alone may not be sufficient."
        )
    
    if request.third_party_vendor:
        warnings.append(
            "Third-party AI: You are a DEPLOYER under AI Act Art. 26 with full deployer obligations. "
            "DORA Art. 28-30 ICT third-party risk management applies."
        )
    
    # Role-specific warning
    if request.role == AIRole.DEPLOYER or request.role == AIRole.PROVIDER_AND_DEPLOYER:
        warnings.append(
            "As deployer, verify provider has completed conformity assessment and can provide "
            "instructions for use, CE marking evidence, and EU declaration of conformity."
        )
    
    return warnings


def get_use_case_profile(use_case: AIUseCase) -> Optional[dict]:
    profiles = get_all_use_case_profiles()
    return profiles.get(use_case)


def get_all_use_case_profiles() -> dict:
    return {
        AIUseCase.CREDIT_SCORING: {
            "label": "Credit Scoring",
            "category": "credit_lending",
            "description": "AI systems used to evaluate creditworthiness of natural persons.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 5(b)",
            "related_regulations": ["GDPR Art. 22", "Consumer Credit Directive"],
            "typical_actors": ["banks", "credit institutions", "fintech lenders"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "FRAIA (Art. 27)",
                "Technical documentation (Art. 11)",
            ],
        },
        AIUseCase.CREDIT_SCORING_CORPORATE: {
            "label": "Credit Scoring - Corporate/B2B",
            "category": "credit_lending",
            "description": "AI scoring businesses (legal persons). Annex III 5(b) covers only natural persons.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not in Annex III 5(b)",
            "related_regulations": ["DORA", "Internal governance"],
            "typical_actors": ["banks", "corporate lending", "trade finance"],
            "key_obligations": [
                "Transparency and documentation (good practice)",
                "Human oversight of credit decisions",
                "DORA ICT risk if material",
            ],
        },
        AIUseCase.CORPORATE_RISK_OPINION: {
            "label": "Corporate Risk Opinion (Multi-Agent)",
            "category": "credit_lending",
            "description": "Multi-agent system (financial, ESG, sectoral, past decisions) producing B2B risk opinion for credit officers. Human decides.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not in Annex III 5(b)",
            "related_regulations": ["DORA", "Internal governance", "Credit risk policy"],
            "typical_actors": ["banks", "corporate credit", "risk committees"],
            "key_obligations": [
                "Transparency and explainability of risk opinion",
                "Human credit officer retains final decision",
                "Documentation and audit trail",
                "DORA ICT risk if material",
            ],
        },
        AIUseCase.LOAN_ORIGINATION: {
            "label": "Loan Origination",
            "category": "credit_lending",
            "description": "AI-assisted loan application processing and approval decisions.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 5(b)",
            "related_regulations": ["GDPR Art. 22", "Consumer Credit Directive"],
            "typical_actors": ["banks", "credit unions", "digital lenders"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "Transparency to applicants",
            ],
        },
        AIUseCase.LOAN_PRICING: {
            "label": "Loan Pricing",
            "category": "credit_lending",
            "description": "AI systems for determining interest rates and loan terms.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR", "Consumer Credit Directive"],
            "typical_actors": ["banks", "fintech"],
            "key_obligations": [
                "Assess impact on individuals",
                "GDPR transparency",
            ],
        },
        AIUseCase.COLLECTIONS_RECOVERY: {
            "label": "Collections & Debt Recovery",
            "category": "credit_lending",
            "description": "AI for prioritizing and managing debt collection activities.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR", "Consumer Protection Directive"],
            "typical_actors": ["banks", "collection agencies"],
            "key_obligations": [
                "Assess significant impact",
                "Fair treatment requirements",
            ],
        },
        AIUseCase.MORTGAGE_UNDERWRITING: {
            "label": "Mortgage Underwriting",
            "category": "credit_lending",
            "description": "AI systems for mortgage application assessment.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 5(b)",
            "related_regulations": ["GDPR Art. 22", "Mortgage Credit Directive"],
            "typical_actors": ["banks", "mortgage lenders"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "FRAIA (Art. 27)",
            ],
        },
        AIUseCase.FRAUD_DETECTION: {
            "label": "Fraud Detection",
            "category": "risk_compliance",
            "description": "AI systems for detecting fraudulent transactions.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["PSD2", "AML Directive"],
            "typical_actors": ["banks", "payment providers", "insurers"],
            "key_obligations": [
                "Assess whether significant impact elevates risk",
                "GDPR transparency and lawful basis",
            ],
        },
        AIUseCase.AML_KYC: {
            "label": "AML/KYC Screening",
            "category": "risk_compliance",
            "description": "AI for anti-money laundering and know-your-customer checks.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["AML Directive 6", "DORA"],
            "typical_actors": ["banks", "investment firms", "crypto providers"],
            "key_obligations": [
                "Document risk classification rationale",
                "Align with AML and DORA controls",
            ],
        },
        AIUseCase.SANCTIONS_SCREENING: {
            "label": "Sanctions Screening",
            "category": "risk_compliance",
            "description": "AI for screening transactions and customers against sanctions lists.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["EU Sanctions Regulations", "AML Directive"],
            "typical_actors": ["banks", "payment providers"],
            "key_obligations": [
                "Accuracy and false positive management",
                "Documentation of screening decisions",
            ],
        },
        AIUseCase.TRANSACTION_MONITORING: {
            "label": "Transaction Monitoring",
            "category": "risk_compliance",
            "description": "AI for monitoring transactions for suspicious activity.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["AML Directive", "PSD2"],
            "typical_actors": ["banks", "payment providers"],
            "key_obligations": [
                "Regulatory reporting alignment",
                "Model validation",
            ],
        },
        AIUseCase.TRADE_SURVEILLANCE: {
            "label": "Trade Surveillance",
            "category": "risk_compliance",
            "description": "AI for detecting market abuse and insider trading.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["MAR", "MiFID II"],
            "typical_actors": ["investment firms", "exchanges"],
            "key_obligations": [
                "MAR compliance",
                "Alert investigation processes",
            ],
        },
        AIUseCase.REGULATORY_REPORTING: {
            "label": "Regulatory Reporting Automation",
            "category": "risk_compliance",
            "description": "AI for automating regulatory report generation.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["Various sectoral regulations"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Data accuracy requirements",
                "Audit trail maintenance",
            ],
        },
        AIUseCase.ALGORITHMIC_TRADING: {
            "label": "Algorithmic Trading",
            "category": "trading_investment",
            "description": "AI systems for automated trading decisions.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not explicitly listed in Annex III",
            "related_regulations": ["MiFID II Art. 17"],
            "typical_actors": ["investment firms", "hedge funds"],
            "key_obligations": [
                "MiFID II algorithmic trading controls",
                "Model governance and auditability",
            ],
        },
        AIUseCase.ROBO_ADVISORY: {
            "label": "Robo-Advisory",
            "category": "trading_investment",
            "description": "AI providing investment recommendations to retail clients.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3) - may be high-risk",
            "related_regulations": ["MiFID II suitability", "IDD"],
            "typical_actors": ["investment firms", "banks", "fintech"],
            "key_obligations": [
                "Suitability assessment integration",
                "Transparency and human review",
            ],
        },
        AIUseCase.PORTFOLIO_OPTIMIZATION: {
            "label": "Portfolio Optimization",
            "category": "trading_investment",
            "description": "AI for optimizing investment portfolios.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["MiFID II"],
            "typical_actors": ["asset managers", "wealth managers"],
            "key_obligations": [
                "Model governance",
                "Client disclosure",
            ],
        },
        AIUseCase.BEST_EXECUTION: {
            "label": "Best Execution",
            "category": "trading_investment",
            "description": "AI for achieving best execution in trading.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["MiFID II Art. 27"],
            "typical_actors": ["brokers", "investment firms"],
            "key_obligations": [
                "Best execution policy compliance",
                "Execution quality monitoring",
            ],
        },
        AIUseCase.MARKET_MAKING: {
            "label": "Market Making",
            "category": "trading_investment",
            "description": "AI for automated market making and liquidity provision.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["MiFID II", "MAR"],
            "typical_actors": ["market makers", "HFT firms"],
            "key_obligations": [
                "Market manipulation prevention",
                "Risk controls",
            ],
        },
        AIUseCase.INSURANCE_PRICING: {
            "label": "Insurance Pricing (Life/Health)",
            "category": "insurance",
            "description": "AI for LIFE and HEALTH insurance risk assessment and premium setting. ⚠️ Note: ONLY life/health insurance is explicitly high-risk under Annex III 5(c). Property, motor, and other non-life insurance may be context-dependent.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 5(c) - specifically life and health insurance",
            "related_regulations": ["Solvency II", "IDD", "GDPR Art. 22"],
            "typical_actors": ["life insurers", "health insurers", "reinsurers"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "FRAIA (Art. 27) - MANDATORY",
                "DPIA under GDPR",
            ],
        },
        AIUseCase.INSURANCE_UNDERWRITING: {
            "label": "Insurance Underwriting (Life/Health)",
            "category": "insurance",
            "description": "AI for LIFE and HEALTH insurance underwriting decisions. ⚠️ Note: Only life/health is explicitly high-risk. Other lines may be context-dependent.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 5(c) - specifically life and health insurance",
            "related_regulations": ["Solvency II", "IDD", "GDPR Art. 22"],
            "typical_actors": ["insurers"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Non-discrimination safeguards",
            ],
        },
        AIUseCase.CLAIMS_PROCESSING: {
            "label": "Claims Processing",
            "category": "insurance",
            "description": "AI for automated claims assessment and processing.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["Solvency II", "GDPR Art. 22"],
            "typical_actors": ["insurers"],
            "key_obligations": [
                "Assess automated decision safeguards",
                "Ensure transparency to claimants",
            ],
        },
        AIUseCase.CLAIMS_FRAUD_DETECTION: {
            "label": "Claims Fraud Detection",
            "category": "insurance",
            "description": "AI for detecting fraudulent insurance claims.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR"],
            "typical_actors": ["insurers"],
            "key_obligations": [
                "Balance fraud prevention with customer rights",
                "Appeal mechanisms",
            ],
        },
        AIUseCase.POLICY_RECOMMENDATION: {
            "label": "Policy Recommendation",
            "category": "insurance",
            "description": "AI for recommending insurance policies to customers.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["IDD", "GDPR"],
            "typical_actors": ["insurers", "brokers"],
            "key_obligations": [
                "Demands and needs assessment",
                "Disclosure of AI use",
            ],
        },
        AIUseCase.CUSTOMER_CHATBOT: {
            "label": "Customer Chatbot",
            "category": "customer_experience",
            "description": "AI chatbots interacting with customers.",
            "risk_level": "limited_risk",
            "ai_act_reference": "Art. 50(1)",
            "related_regulations": ["GDPR", "Consumer Rights Directive"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Transparency disclosure that users are interacting with AI",
                "Log and monitor escalation to humans",
            ],
        },
        AIUseCase.VOICE_ASSISTANT: {
            "label": "Voice Assistant",
            "category": "customer_experience",
            "description": "AI voice assistants for customer service.",
            "risk_level": "limited_risk",
            "ai_act_reference": "Art. 50(1)",
            "related_regulations": ["GDPR", "ePrivacy"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "AI disclosure",
                "Voice data protection",
            ],
        },
        AIUseCase.CUSTOMER_ONBOARDING: {
            "label": "Customer Onboarding",
            "category": "customer_experience",
            "description": "AI for automated customer onboarding and verification.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["AML Directive", "GDPR"],
            "typical_actors": ["banks", "fintechs"],
            "key_obligations": [
                "Identity verification accuracy",
                "KYC compliance",
            ],
        },
        AIUseCase.CUSTOMER_SEGMENTATION: {
            "label": "Customer Segmentation",
            "category": "customer_experience",
            "description": "AI for segmenting customers for marketing and service.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "GDPR profiling transparency",
                "Opt-out mechanisms",
            ],
        },
        AIUseCase.CHURN_PREDICTION: {
            "label": "Churn Prediction",
            "category": "customer_experience",
            "description": "AI for predicting customer churn.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "GDPR compliance for profiling",
            ],
        },
        AIUseCase.CROSS_SELL_UPSELL: {
            "label": "Cross-sell / Upsell",
            "category": "customer_experience",
            "description": "AI for product recommendations to existing customers.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR", "Consumer Protection"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Fair marketing practices",
                "Customer consent",
            ],
        },
        AIUseCase.SENTIMENT_ANALYSIS: {
            "label": "Sentiment Analysis",
            "category": "customer_experience",
            "description": "AI for analyzing customer sentiment from interactions.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Data protection",
                "Purpose limitation",
            ],
        },
        AIUseCase.DOCUMENT_PROCESSING: {
            "label": "Document Processing",
            "category": "operations",
            "description": "AI for extracting information from documents.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Data accuracy",
                "Retention policies",
            ],
        },
        AIUseCase.EMAIL_SCREENING: {
            "label": "Email Screening",
            "category": "operations",
            "description": "AI for screening and routing emails.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR", "ePrivacy"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Employee notification",
                "Data protection",
            ],
        },
        AIUseCase.CONTRACT_ANALYSIS: {
            "label": "Contract Analysis",
            "category": "operations",
            "description": "AI for analyzing and extracting terms from contracts.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Human review of critical terms",
                "Accuracy validation",
            ],
        },
        AIUseCase.PROCESS_AUTOMATION: {
            "label": "Process Automation",
            "category": "operations",
            "description": "AI-enhanced RPA for back-office processes.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["Operational risk requirements"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Process controls",
                "Error handling",
            ],
        },
        AIUseCase.INTERNAL_RISK_MODELS: {
            "label": "Internal Risk Models",
            "category": "risk_models",
            "description": "AI-enhanced models for regulatory capital calculation.",
            "risk_level": "context_dependent",
            "ai_act_reference": "May fall under Art. 6(3)",
            "related_regulations": ["CRD/CRR", "Solvency II"],
            "typical_actors": ["banks", "insurers"],
            "key_obligations": [
                "Existing sectoral model governance",
                "Document AI-specific risks",
            ],
        },
        AIUseCase.MARKET_RISK_MODELING: {
            "label": "Market Risk Modeling",
            "category": "risk_models",
            "description": "AI for market risk measurement and forecasting.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["CRD/CRR", "MiFID II"],
            "typical_actors": ["banks", "investment firms"],
            "key_obligations": [
                "Model validation",
                "Regulatory approval for capital models",
            ],
        },
        AIUseCase.CREDIT_RISK_MODELING: {
            "label": "Credit Risk Modeling",
            "category": "risk_models",
            "description": "AI for credit risk assessment at portfolio level.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["CRD/CRR"],
            "typical_actors": ["banks"],
            "key_obligations": [
                "Model governance framework",
                "Supervisor approval for IRB",
            ],
        },
        AIUseCase.OPERATIONAL_RISK: {
            "label": "Operational Risk",
            "category": "risk_models",
            "description": "AI for operational risk monitoring and prediction.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["CRD/CRR", "DORA"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Integration with risk framework",
                "DORA alignment",
            ],
        },
        AIUseCase.LIQUIDITY_RISK: {
            "label": "Liquidity Risk",
            "category": "risk_models",
            "description": "AI for liquidity risk forecasting and management.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["CRD/CRR"],
            "typical_actors": ["banks"],
            "key_obligations": [
                "Model validation",
                "Stress testing integration",
            ],
        },
        AIUseCase.CLIMATE_RISK: {
            "label": "Climate Risk",
            "category": "risk_models",
            "description": "AI for climate risk assessment and scenario analysis.",
            "risk_level": "minimal_risk",
            "ai_act_reference": "Not listed in Annex III",
            "related_regulations": ["CSRD", "Taxonomy Regulation"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Disclosure requirements",
                "Methodology transparency",
            ],
        },
        # HR & Employment
        AIUseCase.CV_SCREENING: {
            "label": "CV/Resume Screening",
            "category": "hr_employment",
            "description": "AI systems that filter, screen, or rank job applications and CVs to shortlist candidates for recruitment.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(a)",
            "related_regulations": ["GDPR Art. 22", "Employment Equality Directives"],
            "typical_actors": ["all organizations with HR functions", "recruitment agencies"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "Non-discrimination testing",
                "Transparency to candidates",
            ],
        },
        AIUseCase.CANDIDATE_RANKING: {
            "label": "Candidate Ranking",
            "category": "hr_employment",
            "description": "AI systems that rank or score job candidates based on qualifications, skills, or predicted job performance.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(a)",
            "related_regulations": ["GDPR Art. 22", "Employment Equality Directives"],
            "typical_actors": ["all organizations with HR functions", "recruitment platforms"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Bias auditing and monitoring",
                "Explainability of ranking criteria",
            ],
        },
        AIUseCase.INTERVIEW_ANALYSIS: {
            "label": "Interview Analysis",
            "category": "hr_employment",
            "description": "AI systems analyzing video interviews, voice patterns, or facial expressions to assess candidates.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(a)",
            "related_regulations": ["GDPR Art. 9", "Employment Equality Directives"],
            "typical_actors": ["large employers", "recruitment agencies"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Emotion recognition restrictions (Art. 5)",
                "Explicit consent requirements",
                "Scientific validity documentation",
            ],
        },
        AIUseCase.EMPLOYEE_PERFORMANCE: {
            "label": "Employee Performance Evaluation",
            "category": "hr_employment",
            "description": "AI systems used to evaluate employee performance, productivity, or work quality for HR decisions.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(b)",
            "related_regulations": ["GDPR", "Works Council Directives"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Human oversight (Art. 14)",
                "Employee information rights",
                "Works council consultation where applicable",
            ],
        },
        AIUseCase.PROMOTION_DECISIONS: {
            "label": "Promotion & Career Decisions",
            "category": "hr_employment",
            "description": "AI systems influencing promotion, transfer, or career advancement decisions.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(b)",
            "related_regulations": ["GDPR Art. 22", "Employment Equality Directives"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Non-discrimination safeguards",
                "Appeal mechanisms",
            ],
        },
        AIUseCase.WORKFORCE_PLANNING: {
            "label": "Workforce Planning",
            "category": "hr_employment",
            "description": "AI for forecasting workforce needs, skills gaps, and headcount planning.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3) - depends on individual impact",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "Assess if decisions affect individuals",
                "Aggregate vs individual-level distinction",
            ],
        },
        AIUseCase.EMPLOYEE_MONITORING: {
            "label": "Employee Monitoring",
            "category": "hr_employment",
            "description": "AI systems monitoring employee behavior, productivity, or compliance during work.",
            "risk_level": "high_risk",
            "ai_act_reference": "Annex III, point 4(b)",
            "related_regulations": ["GDPR", "ePrivacy", "Works Council Directives"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "Conformity assessment (Art. 43)",
                "Proportionality assessment",
                "Employee notification",
                "Works council consultation",
            ],
        },
        AIUseCase.COMPENSATION_ANALYSIS: {
            "label": "Compensation Analysis",
            "category": "hr_employment",
            "description": "AI systems analyzing or recommending employee compensation and benefits.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR", "Pay Transparency Directive"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "Pay equity analysis",
                "Non-discrimination in pay decisions",
            ],
        },
        AIUseCase.TALENT_RETENTION: {
            "label": "Talent Retention Prediction",
            "category": "hr_employment",
            "description": "AI predicting employee flight risk or likelihood to leave the organization.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all organizations"],
            "key_obligations": [
                "GDPR profiling transparency",
                "Assess impact on retention interventions",
            ],
        },
        AIUseCase.SKILLS_ASSESSMENT: {
            "label": "Skills Assessment",
            "category": "hr_employment",
            "description": "AI systems assessing employee skills, competencies, or training needs.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Art. 6(3)",
            "related_regulations": ["GDPR"],
            "typical_actors": ["all organizations", "training providers"],
            "key_obligations": [
                "Accuracy and validation of assessments",
                "Transparency to employees",
            ],
        },
        AIUseCase.CUSTOM: {
            "label": "Custom Use Case",
            "category": "other",
            "description": "Custom AI use case requiring individual assessment.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Requires case-by-case analysis",
            "related_regulations": ["Depends on use case"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Conduct AI Act classification assessment",
                "Document rationale",
            ],
        },
        AIUseCase.OTHER: {
            "label": "Other",
            "category": "other",
            "description": "Other AI use case.",
            "risk_level": "context_dependent",
            "ai_act_reference": "Requires case-by-case analysis",
            "related_regulations": ["Depends on use case"],
            "typical_actors": ["all financial institutions"],
            "key_obligations": [
                "Conduct AI Act classification assessment",
            ],
        },
    }
