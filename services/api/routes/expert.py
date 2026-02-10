import asyncio
import json
import re
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel

from .obligations import (
    AIRole,
    AIUseCase,
    InstitutionType,
    Obligation,
    ObligationRequest,
    build_compliance_timeline,
    determine_risk_level,
    get_ai_act_obligations,
    get_classification_basis,
    get_dora_obligations,
    get_gdpr_obligations,
    get_gpai_obligations,
    get_sectoral_obligations,
    get_warnings,
)

router = APIRouter()


# --- Models ---

class ExpertMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ExpertRequest(BaseModel):
    messages: List[ExpertMessage] = []
    collected_data: Dict[str, Any] = {}
    phase: str = "interview"  # "interview" or "complete"


class ReportRequest(BaseModel):
    classification: Dict[str, Any]
    obligations: Dict[str, Any]
    collected_data: Dict[str, Any]


# --- LLM call helper ---

def _call_llm_chat(
    provider: str,
    api_key: str,
    model: str,
    system_prompt: str,
    messages: List[Dict[str, str]],
) -> str:
    """Make a chat completion request to the specified LLM provider."""
    if provider == "openrouter":
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "temperature": 0.4,
        }
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://eu-ai-act-navigator.vercel.app",
                "X-Title": "RegolAI Expert",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]

    elif provider == "openai":
        payload = {
            "model": model,
            "messages": [{"role": "system", "content": system_prompt}] + messages,
            "temperature": 0.4,
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]

    elif provider == "anthropic":
        payload = {
            "model": model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": messages,
            "temperature": 0.4,
        }
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["content"][0]["text"]

    else:
        raise ValueError(f"Unknown provider: {provider}. Supported: openrouter, openai, anthropic")


# --- System prompt for the expert interview ---

EXPERT_SYSTEM_PROMPT = """You are RegolAI Expert, a specialized EU AI Act compliance consultant for financial institutions.

Your job is to interview the user about their AI use case and collect enough information to classify it under the EU AI Act. Ask ONE question at a time in a conversational, professional tone.

## Information to collect (ask about these in a natural conversational flow):

1. **Use case description** - What does the AI system do? What decisions does it make or support?
2. **Sector** - Financial services, insurance, legal, etc.
3. **Institution type** - Bank, insurer, investment firm, payment provider, etc.
4. **Role** - Are they the AI provider (built it), deployer (using it), or both?
5. **Affected subjects** - Does it affect natural persons (consumers/employees) or only businesses?
6. **Fully automated** - Is the decision fully automated or does a human review it?
7. **Denies service access** - Can the AI deny someone access to financial services?
8. **Affects legal rights** - Does the AI produce decisions with legal or similarly significant effects?
9. **Human oversight** - Is there meaningful human oversight of AI decisions?
10. **Special category data** - Does it process health, biometric, or other sensitive data?
11. **GPAI model** - Does it use a foundation model (GPT, Claude, Llama, etc.)?
12. **Cross-border** - Is it deployed across EU member states?
13. **Safety component** - Is the AI a safety component of a product?
14. **Vulnerable groups** - Does it affect vulnerable groups (elderly, children, patients)?

## Rules:
- Ask ONE question at a time. Be conversational and professional.
- After each user response, extract the information and update your internal tracking.
- Include a progress indicator in every response: [PROGRESS:XX%] where XX is 0-100.
- When you have collected enough information (typically 6-8 key factors), emit the classification data.
- To emit classification data, include this marker in your response:
  [CLASSIFICATION_DATA]{"use_case_description": "...", "sector": "...", "institution_type": "bank|insurer|investment_firm|payment_provider|crypto_provider|asset_manager|pension_fund|law_firm|other", "role": "provider|deployer|provider_and_deployer|importer", "involves_natural_persons": true/false, "fully_automated": true/false, "denies_service_access": true/false, "affects_legal_rights": true/false, "uses_special_category_data": true/false, "uses_gpai_model": true/false, "cross_border_processing": true/false, "safety_component": true/false, "vulnerable_groups": true/false, "is_high_impact": true/false, "involves_profiling": true/false, "suggested_use_case": "closest_enum_value_or_custom"}[/CLASSIFICATION_DATA]
- The suggested_use_case should be the closest matching AIUseCase enum value from the EU AI Act Navigator's use case list, or "custom" if none matches.
- After emitting classification data, provide a brief summary of your assessment.

## Available use case categories for suggested_use_case:
Credit & Lending: credit_scoring, credit_scoring_consumer, credit_scoring_corporate, loan_origination, loan_approval, loan_pricing, mortgage_underwriting, credit_limit_setting, affordability_assessment, collections_recovery, debt_restructuring, bnpl_credit_decisioning
Risk & Compliance: fraud_detection, aml_kyc, sanctions_screening, transaction_monitoring, trade_surveillance, regulatory_reporting, compliance_monitoring
Trading & Investment: algorithmic_trading, robo_advisory, portfolio_optimization, best_execution, market_making, investment_research, esg_scoring
Insurance: insurance_pricing_life, insurance_pricing_health, insurance_pricing_property, insurance_pricing_motor, claims_processing, claims_fraud_detection, policy_recommendation
Customer Experience: customer_chatbot, voice_assistant, customer_onboarding, customer_segmentation, churn_prediction, sentiment_analysis
HR & Employment: cv_screening, candidate_ranking, interview_analysis, employee_performance, promotion_decisions, termination_decisions, employee_monitoring, task_allocation
Security: biometric_authentication, facial_recognition, cyber_threat_detection
Operations: document_processing, contract_analysis, process_automation
Legal: legal_document_review, legal_research, case_outcome_prediction
Other: custom

Start by warmly greeting the user and asking them to describe their AI use case."""


# --- Helper functions ---

def _parse_classification_data(text: str) -> Optional[Dict[str, Any]]:
    """Extract classification JSON from LLM response."""
    match = re.search(r'\[CLASSIFICATION_DATA\](.*?)\[/CLASSIFICATION_DATA\]', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            return None
    return None


def _parse_progress(text: str) -> int:
    """Extract progress percentage from LLM response."""
    match = re.search(r'\[PROGRESS:(\d+)%\]', text)
    if match:
        return min(int(match.group(1)), 100)
    return 0


def _clean_reply(text: str) -> str:
    """Remove classification data markers and progress markers from reply text."""
    text = re.sub(r'\[CLASSIFICATION_DATA\].*?\[/CLASSIFICATION_DATA\]', '', text, flags=re.DOTALL)
    text = re.sub(r'\[PROGRESS:\d+%\]', '', text)
    return text.strip()


def _resolve_use_case(suggested: str) -> AIUseCase:
    """Resolve a suggested use case string to an AIUseCase enum."""
    try:
        return AIUseCase(suggested)
    except ValueError:
        return AIUseCase.CUSTOM


def _resolve_institution_type(value: str) -> InstitutionType:
    """Resolve institution type string to enum."""
    try:
        return InstitutionType(value)
    except ValueError:
        return InstitutionType.OTHER


def _resolve_role(value: str) -> AIRole:
    """Resolve role string to enum."""
    try:
        return AIRole(value)
    except ValueError:
        return AIRole.DEPLOYER


def _run_classification(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run full classification and obligation mapping using existing obligation engine."""
    use_case = _resolve_use_case(data.get("suggested_use_case", "custom"))
    institution_type = _resolve_institution_type(data.get("institution_type", "other"))
    role = _resolve_role(data.get("role", "deployer"))

    request = ObligationRequest(
        institution_type=institution_type,
        role=role,
        use_case=use_case,
        use_case_description=data.get("use_case_description", ""),
        involves_natural_persons=data.get("involves_natural_persons", True),
        involves_profiling=data.get("involves_profiling", False),
        is_high_impact=data.get("is_high_impact", False),
        fully_automated=data.get("fully_automated", False),
        uses_special_category_data=data.get("uses_special_category_data", False),
        cross_border_processing=data.get("cross_border_processing", False),
        vulnerable_groups=data.get("vulnerable_groups", False),
        safety_component=data.get("safety_component", False),
        affects_legal_rights=data.get("affects_legal_rights", False),
        denies_service_access=data.get("denies_service_access", False),
        uses_gpai_model=data.get("uses_gpai_model", False),
    )

    risk_level = determine_risk_level(request)
    classification_basis = get_classification_basis(request)

    ai_act_obs = get_ai_act_obligations(role, risk_level, use_case)
    gdpr_obs = get_gdpr_obligations(
        request.involves_profiling,
        request.involves_natural_persons,
        use_case,
        request.fully_automated,
        request.uses_special_category_data,
    )
    dora_obs = get_dora_obligations(institution_type, role, False)
    gpai_obs = get_gpai_obligations(
        role,
        request.uses_gpai_model,
        False,
        False,
    )
    sectoral_obs = get_sectoral_obligations(
        institution_type, use_case, False, False, False
    )

    all_obligations = ai_act_obs + gdpr_obs + dora_obs + gpai_obs + sectoral_obs
    timeline = build_compliance_timeline(all_obligations)
    warnings = get_warnings(request)

    def serialize_obligations(obs: List[Obligation]) -> List[Dict]:
        return [
            {
                "id": o.id,
                "name": o.name,
                "description": o.description,
                "source_regulation": o.source_regulation,
                "source_articles": o.source_articles,
                "deadline": o.deadline,
                "priority": o.priority,
                "action_items": o.action_items,
                "category": o.category,
            }
            for o in obs
        ]

    return {
        "classification": {
            "risk_level": risk_level,
            "classification_basis": classification_basis,
            "use_case": use_case.value,
            "institution_type": institution_type.value,
            "role": role.value,
        },
        "obligations": {
            "ai_act": serialize_obligations(ai_act_obs),
            "gdpr": serialize_obligations(gdpr_obs),
            "dora": serialize_obligations(dora_obs),
            "gpai": serialize_obligations(gpai_obs),
            "sectoral": serialize_obligations(sectoral_obs),
            "total_count": len(all_obligations),
        },
        "timeline": timeline,
        "warnings": warnings,
    }


# --- Endpoints ---

@router.post("")
async def expert_chat(
    request: ExpertRequest,
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: Optional[str] = Header(None, alias="X-LLM-API-Key"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """
    RegolAI Expert interview chat endpoint.

    Conducts an AI-powered interview to classify the user's AI use case
    under the EU AI Act and map applicable obligations.
    """
    if not x_llm_provider or not x_llm_api_key or not x_llm_model:
        return {
            "reply": "**API key required.** Please configure your API key in Settings to use the RegolAI Expert.",
            "phase": "error",
            "collected_data": {},
            "progress": 0,
        }

    # If phase is "complete" and we have classification data, run classification
    if request.phase == "complete" and request.collected_data:
        result = _run_classification(request.collected_data)
        return {
            "reply": "Classification complete. Here are your results.",
            "phase": "complete",
            "collected_data": request.collected_data,
            "progress": 100,
            **result,
        }

    # Build messages for LLM
    llm_messages = [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]

    try:
        llm_reply = await asyncio.to_thread(
            _call_llm_chat,
            x_llm_provider,
            x_llm_api_key,
            x_llm_model,
            EXPERT_SYSTEM_PROMPT,
            llm_messages,
        )
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get("error", {}).get("message", str(e))
        except Exception:
            error_msg = f"HTTP {e.code}: {e.reason}"
        return {
            "reply": f"**API Error:** {error_msg}\n\nPlease verify your API key in Settings.",
            "phase": "error",
            "collected_data": request.collected_data,
            "progress": 0,
        }
    except Exception as e:
        return {
            "reply": f"**Error:** {str(e)}\n\nPlease check your API key in Settings.",
            "phase": "error",
            "collected_data": request.collected_data,
            "progress": 0,
        }

    # Parse the LLM response
    classification_data = _parse_classification_data(llm_reply)
    progress = _parse_progress(llm_reply)
    clean_reply = _clean_reply(llm_reply)

    if classification_data:
        # LLM has collected enough data - run classification
        merged_data = {**request.collected_data, **classification_data}
        result = _run_classification(merged_data)
        return {
            "reply": clean_reply,
            "phase": "complete",
            "collected_data": merged_data,
            "progress": 100,
            **result,
        }

    return {
        "reply": clean_reply,
        "phase": "interview",
        "collected_data": request.collected_data,
        "progress": progress,
    }


@router.post("/generate-report")
async def generate_report(
    request: ReportRequest,
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: Optional[str] = Header(None, alias="X-LLM-API-Key"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """
    Generate an executive summary narrative for the PDF report.
    """
    if not x_llm_provider or not x_llm_api_key or not x_llm_model:
        return {"narrative": "API key required to generate report narrative."}

    classification = request.classification
    obligations = request.obligations
    collected_data = request.collected_data

    prompt = f"""Generate a concise executive summary (3-4 paragraphs) for a regulatory compliance report about the following AI use case.

Use Case: {collected_data.get('use_case_description', 'N/A')}
Sector: {collected_data.get('sector', 'Financial Services')}
Institution: {collected_data.get('institution_type', 'N/A')}
Role: {collected_data.get('role', 'deployer')}

Risk Classification: {classification.get('risk_level', 'N/A')}
Legal Basis: {classification.get('classification_basis', 'N/A')}

Obligation counts:
- AI Act: {len(obligations.get('ai_act', []))} obligations
- GDPR: {len(obligations.get('gdpr', []))} obligations
- DORA: {len(obligations.get('dora', []))} obligations
- GPAI: {len(obligations.get('gpai', []))} obligations
- Sectoral: {len(obligations.get('sectoral', []))} obligations

Write a professional executive summary covering:
1. Use case overview and classification result
2. Key regulatory obligations and their implications
3. Recommended next steps for compliance

Keep it factual and professional. Do not use markdown formatting."""

    try:
        narrative = await asyncio.to_thread(
            _call_llm_chat,
            x_llm_provider,
            x_llm_api_key,
            x_llm_model,
            "You are a regulatory compliance report writer specializing in EU AI Act, GDPR, and DORA.",
            [{"role": "user", "content": prompt}],
        )
        return {"narrative": narrative}
    except Exception as e:
        return {"narrative": f"Unable to generate narrative: {str(e)}"}
