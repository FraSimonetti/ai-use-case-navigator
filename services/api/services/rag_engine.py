"""
RAG (Retrieval-Augmented Generation) Engine for EU AI Act Navigator

Combines semantic retrieval from official regulatory texts with LLM generation.
"""

import json
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

from .vector_store import VectorStore, RetrievedPassage


class RAGEngine:
    """
    RAG Engine that retrieves from official regulatory texts and generates answers.

    Key Features:
    - Retrieves relevant passages from EU AI Act, GDPR, DORA
    - Confidence scoring based on retrieval quality
    - Clear separation between retrieved text and AI interpretation
    - Source attribution with EUR-Lex links
    - Warnings when confidence is low or question goes beyond retrieved sources
    """

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.vector_store = vector_store or VectorStore()

        # If no embeddings exist, prompt user to build them
        if self.vector_store.embeddings is None:
            print("⚠️  Warning: No vector embeddings found.")
            print("   Run: python services/api/services/vector_store.py")
            print("   to build the vector database from PDFs.")

    def answer_question(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        llm_provider: Optional[str] = None,
        llm_api_key: Optional[str] = None,
        llm_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG: Retrieve + Generate.

        Process:
        1. Retrieve relevant passages from regulatory texts
        2. Assess retrieval confidence
        3. If confidence is too low, warn user
        4. Generate answer using LLM with retrieved context
        5. Return answer with sources and confidence indicators

        Args:
            question: User's question
            context: Optional context (role, institution, conversation history)
            llm_provider: LLM provider (openrouter, openai, anthropic)
            llm_api_key: API key for LLM
            llm_model: Model name

        Returns:
            {
                "answer": str,  # Generated answer
                "retrieved_passages": List[Dict],  # Actual regulatory text retrieved
                "sources": List[Dict],  # Formatted sources with EUR-Lex links
                "confidence": str,  # "high", "medium", "low"
                "warnings": List[str],  # Warnings if applicable
            }
        """
        # Check if LLM credentials provided
        if not llm_provider or not llm_api_key or not llm_model:
            return {
                "answer": (
                    "**No API key configured.**\n\n"
                    "Go to **Settings** to add your API key.\n\n"
                    "Supported providers:\n"
                    "- **OpenRouter** - Access 100+ models (GPT-4, Claude, Llama)\n"
                    "- **OpenAI** - Direct GPT access\n"
                    "- **Anthropic** - Direct Claude access\n\n"
                    "---\n\n"
                    "**In the meantime**, use the **Use Case & Obligations** page which works "
                    "without any API key and has 120+ pre-mapped use cases!"
                ),
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": ["No LLM credentials provided"],
            }

        # Check if vector store is initialized
        if self.vector_store.embeddings is None:
            return {
                "answer": (
                    "**⚠️ Vector database not initialized.**\n\n"
                    "The regulatory text database has not been built yet. "
                    "Please contact the administrator to run:\n\n"
                    "```\npython services/api/services/vector_store.py\n```\n\n"
                    "This will parse the EU AI Act, GDPR, and DORA PDFs and create "
                    "the searchable vector database."
                ),
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": ["Vector database not initialized"],
            }

        # Step 1: Retrieve relevant passages
        retrieved_passages = self.vector_store.retrieve(
            query=question,
            top_k=5,
            regulation_filter=None,  # Search across all regulations
            min_score=0.1
        )

        # Step 2: Assess confidence
        overall_confidence = self._assess_confidence(retrieved_passages)

        warnings = []

        # Step 3: Check if confidence is too low
        if overall_confidence == "low":
            warnings.append(
                "⚠️ Low retrieval confidence - the question may be beyond the scope of "
                "the retrieved regulatory texts. Answer may include interpretation."
            )

        if len(retrieved_passages) == 0:
            warnings.append(
                "⚠️ No relevant passages found in regulatory texts. "
                "Answer will be based on general LLM knowledge (not official sources)."
            )

        # Step 4: Build prompt with retrieved passages
        system_prompt = self._build_system_prompt_with_rag(context, retrieved_passages)
        user_prompt = self._build_user_prompt(question, context)

        # Step 5: Generate answer using LLM
        try:
            answer = self._call_llm(
                llm_provider=llm_provider,
                llm_api_key=llm_api_key,
                llm_model=llm_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                conversation_history=(context or {}).get("conversation_history", [])
            )
        except Exception as e:
            return {
                "answer": f"**Error generating answer:** {str(e)}\n\nPlease check your API key in Settings.",
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": [str(e)],
            }

        # Step 6: Format sources
        sources = self._format_sources(retrieved_passages)

        # Step 7: Format retrieved passages for display
        passages_for_display = [
            {
                "regulation": passage.document.regulation,
                "article": passage.document.article,
                "text": passage.document.text,
                "score": passage.score,
                "confidence": passage.confidence,
                "url": passage.url,
            }
            for passage in retrieved_passages
        ]

        return {
            "answer": answer,
            "retrieved_passages": passages_for_display,
            "sources": sources,
            "confidence": overall_confidence,
            "warnings": warnings,
        }

    def _assess_confidence(self, passages: List[RetrievedPassage]) -> str:
        """
        Assess overall confidence based on retrieval scores.

        High confidence: At least 2 passages with score >= 0.5
        Medium confidence: At least 1 passage with score >= 0.3
        Low confidence: All passages have score < 0.3
        """
        if not passages:
            return "low"

        high_score_count = sum(1 for p in passages if p.score >= 0.5)
        medium_score_count = sum(1 for p in passages if p.score >= 0.3)

        if high_score_count >= 2:
            return "high"
        elif medium_score_count >= 1 or high_score_count >= 1:
            return "medium"
        else:
            return "low"

    def _build_system_prompt_with_rag(
        self,
        context: Optional[Dict[str, Any]],
        retrieved_passages: List[RetrievedPassage]
    ) -> str:
        """
        Build system prompt that includes retrieved regulatory text.

        CRITICAL: Clearly separate retrieved text from instructions.
        """
        role = (context or {}).get("role", "deployer")
        institution = (context or {}).get("institution_type", "financial institution")

        role_description = {
            "deployer": "a deployer (you use AI systems built by others)",
            "provider": "a provider (you develop AI systems for third parties)",
            "provider_and_deployer": "both a provider and deployer (you develop and use your own AI)",
            "importer": "an importer (you bring non-EU AI systems to the EU market)"
        }.get(role, "a financial services professional")

        # Build retrieved passages section
        if retrieved_passages:
            passages_text = "\n\n".join([
                f"### SOURCE {i+1}: {passage.document.regulation} - {passage.document.article}\n"
                f"**Relevance Score:** {passage.score:.2f} | **Confidence:** {passage.confidence}\n"
                f"**URL:** {passage.url}\n\n"
                f"**Text:**\n{passage.document.text}\n"
                for i, passage in enumerate(retrieved_passages)
            ])

            retrieved_section = f"""
## RETRIEVED REGULATORY TEXTS (Official Sources)

The following passages were retrieved from official EU regulatory texts stored in the vector database:

{passages_text}

---
"""
        else:
            retrieved_section = """
## RETRIEVED REGULATORY TEXTS (Official Sources)

⚠️ **No relevant passages were found in the regulatory texts for this question.**

You should indicate this to the user and clarify that your answer is based on general knowledge rather than specific retrieved regulatory text.

---
"""

        prompt = f"""You are an expert EU regulatory compliance advisor specializing in AI governance for financial institutions.

The user works at a {institution} and is {role_description}.

{retrieved_section}

## YOUR ROLE

You must answer the user's question using the retrieved regulatory texts above as your PRIMARY source.

**CRITICAL INSTRUCTIONS:**

1. **Cite Retrieved Sources:**
   - ALWAYS reference the specific retrieved passages when answering
   - Use format: [EU AI Act Art. X], [GDPR Art. Y], [DORA Art. Z]
   - If the answer is directly from a retrieved passage, quote it

2. **Distinguish Between Retrieved Text and Interpretation:**
   - **Retrieved text**: Use exact quotes or close paraphrasing with citation
   - **Interpretation**: Clearly mark as "Based on [Article X], this means..."
   - **General knowledge**: Only use if no retrieved passages are relevant, and clearly state this

3. **Confidence Indicators:**
   - If retrieved passages have low relevance scores, acknowledge this
   - If the question goes beyond retrieved sources, state this explicitly

4. **Source Attribution:**
   - Every regulatory statement must cite the source document
   - Use the EUR-Lex URLs provided in the retrieved passages

5. **Accuracy Over Completeness:**
   - It's better to say "This is not covered in the retrieved passages" than to speculate
   - Never invent article numbers or obligations not present in retrieved text

## REGULATORY CONTEXT (for general understanding)

- **EU AI Act (Regulation 2024/1689)**: Risk-based framework, effective August 1, 2024
- **GDPR (Regulation 2016/679)**: Data protection regulation
- **DORA (Regulation 2022/2554)**: Digital operational resilience for financial sector, applicable from January 17, 2025

## RESPONSE FORMAT

Structure your answer as:

**Answer:**
[Your answer based on retrieved passages, with citations]

**Sources:**
[List the specific articles/passages used, with EUR-Lex links]

**Confidence:**
[High/Medium/Low - based on retrieval quality]

**Note:**
[If applicable: any caveats, limitations, or clarifications about the answer]
"""

        return prompt

    def _build_user_prompt(self, question: str, context: Optional[Dict[str, Any]]) -> str:
        """Build user prompt with question and context."""
        role = (context or {}).get("role", "deployer")
        institution = (context or {}).get("institution_type", "financial institution")

        return f"""**Question from a {role} at a {institution}:**

{question}

Please provide a clear, structured answer that:
1. Cites the retrieved regulatory passages above
2. Distinguishes between direct regulatory text and interpretation
3. Provides practical guidance where appropriate
4. Lists all sources with EUR-Lex links"""

    def _call_llm(
        self,
        llm_provider: str,
        llm_api_key: str,
        llm_model: str,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Make a request to the specified LLM provider."""

        # Build messages array
        messages = []

        # Add conversation history if provided (limit to last 6 messages)
        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        # Add the current question
        messages.append({"role": "user", "content": user_prompt})

        if llm_provider == "openrouter":
            payload = {
                "model": llm_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": 0.3,  # Lower temperature for factual responses
            }
            request = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {llm_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://eu-ai-act-navigator.vercel.app",
                    "X-Title": "EU AI Act Navigator",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        elif llm_provider == "openai":
            payload = {
                "model": llm_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": 0.3,
            }
            request = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {llm_api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        elif llm_provider == "anthropic":
            # Anthropic uses separate system parameter
            payload = {
                "model": llm_model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
                "temperature": 0.3,
            }
            request = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "x-api-key": llm_api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["content"][0]["text"]

        else:
            raise ValueError(f"Unknown provider: {llm_provider}. Supported: openrouter, openai, anthropic")

    def _format_sources(self, passages: List[RetrievedPassage]) -> List[Dict[str, str]]:
        """Format sources for display with EUR-Lex links."""
        sources = []
        seen = set()

        for passage in passages:
            key = f"{passage.document.regulation}-{passage.document.article}"
            if key in seen:
                continue

            seen.add(key)
            sources.append({
                "title": f"{passage.document.regulation} - {passage.document.article}",
                "url": passage.url,
                "regulation": passage.document.regulation,
                "confidence": passage.confidence,
            })

        return sources
