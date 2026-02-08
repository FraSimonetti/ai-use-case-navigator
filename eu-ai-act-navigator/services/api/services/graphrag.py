import asyncio
import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

from .rag_engine import RAGEngine


class GraphRAGService:
    """
    Q&A service with RAG (Retrieval-Augmented Generation).

    Uses official regulatory texts from EU AI Act, GDPR, and DORA
    stored in a vector database for accurate, source-backed answers.
    """

    def __init__(self):
        self.rag_engine = RAGEngine()

    async def answer_question(
        self,
        question: str,
        context: Dict[str, Any] | None = None,
        llm_provider: Optional[str] = None,
        llm_api_key: Optional[str] = None,
        llm_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG (Retrieval-Augmented Generation).

        Process:
        1. Retrieve relevant passages from official regulatory texts
        2. Generate answer using LLM with retrieved context
        3. Return answer with sources, confidence, and warnings

        Args:
            question: The user's question
            context: Optional context (role, institution_type, use_case, conversation_history)
            llm_provider: Provider from headers (openrouter, openai, anthropic)
            llm_api_key: API key from headers
            llm_model: Model ID from headers

        Returns:
            {
                "answer": str,  # Generated answer
                "sources": List[Dict],  # Sources with EUR-Lex links
                "retrieved_passages": List[Dict],  # Retrieved regulatory text
                "confidence": str,  # "high", "medium", or "low"
                "warnings": List[str],  # Warnings if applicable
            }
        """
        try:
            # Use RAG engine to answer question
            result = await asyncio.to_thread(
                self.rag_engine.answer_question,
                question=question,
                context=context,
                llm_provider=llm_provider,
                llm_api_key=llm_api_key,
                llm_model=llm_model,
            )

            return result

        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8', errors='ignore')
            try:
                error_json = json.loads(error_body)
                error_msg = error_json.get('error', {}).get('message', str(e))
            except:
                error_msg = f"HTTP {e.code}: {e.reason}"
            return {
                "answer": f"**API Error:** {error_msg}\n\nPlease verify your API key in Settings is correct and has available credits.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [error_msg],
            }
        except urllib.error.URLError as e:
            return {
                "answer": f"**Connection Error:** Could not reach the AI provider.\n\nDetails: {str(e.reason)}\n\nPlease check your internet connection and try again.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [str(e.reason)],
            }
        except Exception as e:
            return {
                "answer": f"**Error:** {str(e)}\n\nTip: Check your API key in Settings, or use the **Use Case & Obligations** page.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [str(e)],
            }

    def _build_system_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        role = (context or {}).get("role", "deployer")
        institution = (context or {}).get("institution_type", "financial institution")

        role_description = {
            "deployer": "a deployer (you use AI systems built by others)",
            "provider": "a provider (you develop AI systems for third parties)",
            "provider_and_deployer": "both a provider and deployer (you develop and use your own AI)",
            "importer": "an importer (you bring non-EU AI systems to the EU market)"
        }.get(role, "a financial services professional")

        return f"""You are an expert EU regulatory compliance advisor specializing in AI governance for financial institutions.
The user works at a {institution} and is {role_description}.

You have deep expertise in:
1. **EU AI Act (Regulation 2024/1689)** - Effective August 1, 2024, with staged implementation
2. **GDPR (Regulation 2016/679)** - General Data Protection Regulation
3. **DORA (Regulation 2022/2554)** - Digital Operational Resilience Act, applicable from January 17, 2025

## KEY REGULATORY KNOWLEDGE

### EU AI Act Risk Classification
- **Prohibited AI** (Art. 5): Social scoring, emotion recognition at work (with exceptions), real-time remote biometric ID in public (with exceptions)
- **High-Risk AI** (Annex III):
  - Point 4: Employment/HR AI (CV screening, interviews, performance evaluation, monitoring)
  - Point 5(b): Credit scoring and loan decisions for NATURAL PERSONS only (B2B/corporate credit is NOT high-risk)
  - Point 5(c): Life and health insurance pricing/underwriting (NOT property, motor, liability)
  - Point 1: Biometric identification
- **Limited Risk** (Art. 50): Chatbots, emotion recognition - require transparency disclosure
- **Minimal Risk**: Most other AI - voluntary codes of conduct

### Key Deadlines
- Feb 2, 2025: Prohibited AI practices banned
- Aug 2, 2025: GPAI obligations, governance provisions apply
- Aug 2, 2026: High-risk AI obligations fully apply
- Aug 2, 2027: Certain product safety AI obligations

### Provider vs Deployer
- **Provider** (Art. 3(3)): Develops AI and places on market or puts into service under own name
- **Deployer** (Art. 3(4)): Uses AI under their authority (not personal use)
- Both have distinct obligations; deployers can become providers if they substantially modify

### GDPR-AI Intersection
- Art. 22: Right not to be subject to solely automated decisions with legal effects
- Art. 35: DPIA mandatory for systematic profiling and automated decisions
- Arts. 13-15: Must explain AI logic, significance, and consequences

### DORA for AI
- AI systems are ICT - must be in ICT risk management framework (Art. 5-16)
- Third-party AI vendors = ICT third-party risk (Art. 28-44)
- AI incidents = ICT incidents requiring classification and potential reporting

## RESPONSE GUIDELINES

1. **Always cite specific articles** in format [AI Act Art. X] or [GDPR Art. Y] or [DORA Art. Z]
2. **Be precise** about which regulations apply and why
3. **Consider the user's role** (provider vs deployer) - obligations differ significantly
4. **Highlight deadlines** when relevant
5. **Note interactions** between AI Act, GDPR, and DORA
6. **Be clear about uncertainty** - if classification depends on implementation details, say so
7. **Provide actionable guidance** - not just what the law says, but what to do

## IMPORTANT CLARIFICATIONS

- Corporate/B2B credit scoring is NOT high-risk under Annex III 5(b) - that only covers natural persons
- Property, motor, and liability insurance pricing is NOT explicitly high-risk - only life and health
- Fraud detection can be high-risk IF it denies access to financial services
- AML/KYC can be high-risk IF it denies account access
- Chatbots are LIMITED risk (not high-risk) - just need transparency disclosure"""

    def _build_user_prompt(
        self, question: str, context: Optional[Dict[str, Any]] = None
    ) -> str:
        role = (context or {}).get("role", "deployer")
        institution = (context or {}).get("institution_type", "financial institution")

        return f"""**Question from a {role} at a {institution}:**

{question}

Please provide a clear, structured answer that:
1. Directly answers the question
2. Cites specific regulatory articles where applicable
3. Notes any deadlines or timelines
4. Provides practical next steps if relevant
5. Highlights any interactions between AI Act, GDPR, and DORA"""

    def _extract_sources(self, answer: str) -> List[Dict[str, str]]:
        """Extract article citations from the answer for source display."""
        sources = []
        import re

        # Find all article citations
        patterns = [
            (r'\[AI Act Art\.?\s*(\d+)\]', 'EU AI Act', 'https://artificialintelligenceact.eu/article/'),
            (r'\[GDPR Art\.?\s*(\d+)\]', 'GDPR', 'https://gdpr-info.eu/art-'),
            (r'\[DORA Art\.?\s*(\d+)\]', 'DORA', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554'),
        ]

        seen = set()
        for pattern, regulation, base_url in patterns:
            for match in re.finditer(pattern, answer, re.IGNORECASE):
                article_num = match.group(1)
                key = f"{regulation}-{article_num}"
                if key not in seen:
                    seen.add(key)
                    if regulation == 'GDPR':
                        url = f"{base_url}{article_num}-gdpr/"
                    elif regulation == 'EU AI Act':
                        url = f"{base_url}{article_num}/"
                    else:
                        url = base_url
                    sources.append({
                        "title": f"{regulation} Article {article_num}",
                        "url": url,
                        "regulation": regulation,
                    })

        return sources

    def _make_request(
        self,
        provider: str,
        api_key: str,
        model: str,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Make a request to the specified LLM provider."""

        # Build messages array with conversation history
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if provided (for context continuity)
        if conversation_history:
            for msg in conversation_history[-6:]:  # Limit to last 6 messages
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        # Add the current question
        messages.append({"role": "user", "content": user_prompt})

        if provider == "openrouter":
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.3,  # Lower temperature for more factual responses
            }
            request = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://eu-ai-act-navigator.vercel.app",
                    "X-Title": "EU AI Act Navigator",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        elif provider == "openai":
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.3,
            }
            request = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        elif provider == "anthropic":
            # Extract system from messages for Anthropic format
            payload = {
                "model": model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": [m for m in messages if m["role"] != "system"],
                "temperature": 0.3,
            }
            request = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2024-01-01",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["content"][0]["text"]

        else:
            raise ValueError(f"Unknown provider: {provider}. Supported: openrouter, openai, anthropic")
