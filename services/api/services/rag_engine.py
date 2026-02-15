"""
RAG (Retrieval-Augmented Generation) engine for regulatory exploration.

Focus:
- Reliable retrieval from EU AI Act, GDPR, DORA
- Guided exploration (article clarification, obligations, concepts, comparison)
- Practical follow-up suggestions for iterative user navigation
"""

from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from .vector_store import RetrievedPassage, VectorStore


class RAGEngine:
    """Retrieve passages from official regulations and generate grounded answers."""

    SUPPORTED_INTENTS = {
        "article_clarification",
        "obligation_finder",
        "concept_explainer",
        "cross_regulation_compare",
        "general",
    }

    def __init__(self, vector_store: Optional[VectorStore] = None):
        self.vector_store = vector_store or VectorStore()

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
        """Answer a question using intent-aware retrieval + generation."""
        if not llm_provider or not llm_api_key or not llm_model:
            return {
                "answer": (
                    "**No API key configured.**\n\n"
                    "Go to **Settings** to add your API key.\n\n"
                    "Supported providers:\n"
                    "- **OpenRouter** - Access 100+ models (GPT, Claude, Llama)\n"
                    "- **OpenAI** - Direct GPT access\n"
                    "- **Anthropic** - Direct Claude access"
                ),
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": ["No LLM credentials provided"],
                "exploration": self._empty_exploration(),
            }

        if self.vector_store.embeddings is None:
            return {
                "answer": (
                    "**⚠️ Vector database not initialized.**\n\n"
                    "Please run:\n"
                    "```\npython services/api/services/vector_store.py\n```\n"
                ),
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": ["Vector database not initialized"],
                "exploration": self._empty_exploration(),
            }

        plan = self._build_query_plan(question, context or {})
        retrieved_passages = self._retrieve_with_fallbacks(plan)
        overall_confidence = self._assess_confidence(retrieved_passages)

        warnings: List[str] = []
        suppression_threshold = (
            0.05 if not hasattr(self.vector_store, "model") or self.vector_store.model is None else 0.2
        )

        if overall_confidence == "low" and (
            not retrieved_passages or all(p.score < suppression_threshold for p in retrieved_passages)
        ):
            return {
                "answer": (
                    "**⚠️ I could not retrieve sufficiently relevant regulatory text.**\n\n"
                    "Try one of these patterns:\n"
                    "- Include regulation + article (e.g., `GDPR Article 22`)\n"
                    "- Ask for a concept by name (e.g., `What is DPIA under GDPR?`)\n"
                    "- Ask for obligations for a role (e.g., `DORA obligations for financial entities`)"
                ),
                "retrieved_passages": [],
                "sources": [],
                "confidence": "low",
                "warnings": [
                    "Low retrieval quality; answer suppressed to avoid unsupported legal guidance."
                ],
                "exploration": self._build_exploration_metadata(plan, retrieved_passages),
            }

        if overall_confidence == "low":
            warnings.append(
                "Low retrieval confidence. Treat the response as orientation and verify sources before action."
            )

        if not retrieved_passages:
            warnings.append("No relevant passages were retrieved from EU AI Act, GDPR, or DORA.")

        system_prompt = self._build_system_prompt_with_rag(context or {}, retrieved_passages, plan)
        user_prompt = self._build_user_prompt(question, context or {}, plan)

        try:
            answer = self._call_llm(
                llm_provider=llm_provider,
                llm_api_key=llm_api_key,
                llm_model=llm_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                conversation_history=(context or {}).get("conversation_history", []),
            )
        except Exception as e:
            return {
                "answer": f"**Error generating answer:** {e}",
                "retrieved_passages": [],
                "sources": [],
                "confidence": "none",
                "warnings": [str(e)],
                "exploration": self._build_exploration_metadata(plan, []),
            }

        warnings.extend(self._verify_citations(answer, retrieved_passages))
        sources = self._format_sources(retrieved_passages)

        passages_for_display = [
            {
                "regulation": passage.document.regulation,
                "article": passage.document.article,
                "text": passage.document.text,
                "score": passage.score,
                "confidence": passage.confidence,
                "url": passage.url,
                "breadcrumb": passage.document.breadcrumb,
            }
            for passage in retrieved_passages
        ]

        return {
            "answer": answer,
            "retrieved_passages": passages_for_display,
            "sources": sources,
            "confidence": overall_confidence,
            "warnings": warnings,
            "exploration": self._build_exploration_metadata(plan, retrieved_passages),
        }

    def _empty_exploration(self) -> Dict[str, Any]:
        return {
            "intent": "general",
            "regulation_focus": "all",
            "suggested_questions": [],
            "matched_articles": [],
        }

    def _build_query_plan(self, question: str, context: Dict[str, Any]) -> Dict[str, Any]:
        question_lower = question.lower()
        intent = context.get("intent", "general")
        if intent not in self.SUPPORTED_INTENTS:
            intent = self._infer_intent(question_lower)

        regulation_focus = context.get("regulation_focus", "all")
        if regulation_focus not in {"all", "EU AI Act", "GDPR", "DORA"}:
            regulation_focus = self._infer_regulation_focus(question_lower)
        elif regulation_focus == "all":
            inferred = self._infer_regulation_focus(question_lower)
            if inferred != "all" and "compare" not in question_lower:
                regulation_focus = inferred

        article_numbers = re.findall(r"article\s+(\d+)\b", question_lower)

        expanded_query = self._expand_query(question, intent)
        search_queries = [expanded_query]

        if article_numbers:
            for art in article_numbers:
                if regulation_focus == "all":
                    search_queries.append(f"Article {art} EU AI Act GDPR DORA")
                else:
                    search_queries.append(f"Article {art} {regulation_focus}")

        if intent == "obligation_finder":
            search_queries.append(f"{question} obligations requirements shall must")
        elif intent == "concept_explainer":
            search_queries.append(f"{question} definition scope conditions")
        elif intent == "cross_regulation_compare":
            search_queries.append(f"{question} EU AI Act GDPR DORA differences")

        # Deduplicate while preserving order
        deduped: List[str] = []
        seen = set()
        for q in search_queries:
            k = q.strip().lower()
            if k and k not in seen:
                deduped.append(q)
                seen.add(k)

        return {
            "intent": intent,
            "regulation_focus": regulation_focus,
            "article_numbers": article_numbers,
            "search_queries": deduped[:4],
        }

    def _retrieve_with_fallbacks(self, plan: Dict[str, Any]) -> List[RetrievedPassage]:
        regulation_filter = None if plan["regulation_focus"] == "all" else plan["regulation_focus"]
        merged: Dict[str, RetrievedPassage] = {}

        for query in plan["search_queries"]:
            passages = self.vector_store.retrieve(
                query=query,
                top_k=12,
                regulation_filter=regulation_filter,
                min_score=0.05,
            )
            self._merge_passages(merged, passages)

        # Fallback: if filtered retrieval is weak, retry globally to avoid dead-ends
        if regulation_filter and len(merged) < 3:
            for query in plan["search_queries"][:2]:
                passages = self.vector_store.retrieve(
                    query=query,
                    top_k=8,
                    regulation_filter=None,
                    min_score=0.05,
                )
                self._merge_passages(merged, passages)

        # Fallback: direct article lookup if user asked for specific article(s)
        if len(merged) < 3 and plan["article_numbers"]:
            direct = self._lookup_articles_by_number(
                article_numbers=plan["article_numbers"],
                regulation_filter=regulation_filter,
            )
            self._merge_passages(merged, direct)

        ranked = sorted(merged.values(), key=lambda p: p.score, reverse=True)
        return ranked[:6]

    def _merge_passages(
        self,
        target: Dict[str, RetrievedPassage],
        passages: List[RetrievedPassage],
    ) -> None:
        for p in passages:
            key = f"{p.document.regulation}-{p.document.article}"
            existing = target.get(key)
            if existing is None or p.score > existing.score:
                target[key] = p

    def _lookup_articles_by_number(
        self,
        article_numbers: List[str],
        regulation_filter: Optional[str],
    ) -> List[RetrievedPassage]:
        results: List[RetrievedPassage] = []
        wanted = set(article_numbers)

        for doc in self.vector_store.documents:
            if doc.section_type != "article":
                continue
            if regulation_filter and doc.regulation != regulation_filter:
                continue

            m = re.match(r"Article\s+(\d+)", doc.article)
            if not m or m.group(1) not in wanted:
                continue

            score = 0.42 if regulation_filter else 0.31
            confidence = "medium" if score >= 0.3 else "low"
            base_url = self.vector_store.eurlex_urls.get(doc.regulation, "")
            url = f"{base_url}#{doc.article.replace(' ', '_').lower()}"

            results.append(
                RetrievedPassage(
                    document=doc,
                    score=score,
                    confidence=confidence,
                    url=url,
                )
            )

        return results

    def _infer_intent(self, question_lower: str) -> str:
        if re.search(r"article\s+\d+", question_lower) or "what does article" in question_lower:
            return "article_clarification"
        if any(k in question_lower for k in ["obligation", "must", "required", "requirement", "shall"]):
            return "obligation_finder"
        if any(k in question_lower for k in ["difference", "compare", "vs", "interaction"]):
            return "cross_regulation_compare"
        if any(k in question_lower for k in ["what is", "meaning", "define", "concept", "explain"]):
            return "concept_explainer"
        return "general"

    def _infer_regulation_focus(self, question_lower: str) -> str:
        if "gdpr" in question_lower:
            return "GDPR"
        if "dora" in question_lower:
            return "DORA"
        if "ai act" in question_lower or "eu ai act" in question_lower:
            return "EU AI Act"
        return "all"

    def _expand_query(self, query: str, intent: str) -> str:
        query_lower = query.lower()

        expansion_rules = [
            (
                ["dpia", "data protection impact", "article 35", "art 35"],
                "Article 35 GDPR data protection impact assessment high risk processing",
            ),
            (
                ["fria", "fundamental rights impact", "article 27", "art 27"],
                "Article 27 fundamental rights impact assessment deployer high-risk AI",
            ),
            (
                ["automated decision", "article 22", "profiling"],
                "Article 22 GDPR automated decision-making profiling legal effects",
            ),
            (
                ["third party ict", "ict risk", "incident reporting"],
                "DORA Article 5 Article 19 Article 28 ICT risk third-party incident reporting",
            ),
            (
                ["high-risk", "annex iii", "article 6"],
                "EU AI Act Article 6 Annex III classification high-risk AI systems",
            ),
        ]

        for triggers, expansion in expansion_rules:
            if any(trigger in query_lower for trigger in triggers):
                return f"{query} {expansion}"

        intent_expansions = {
            "article_clarification": "article text scope paragraph interpretation",
            "obligation_finder": "obligations requirements shall must compliance actions",
            "concept_explainer": "definition meaning scope exception",
            "cross_regulation_compare": "comparison overlap differences alignment",
            "general": "",
        }
        suffix = intent_expansions.get(intent, "")
        return f"{query} {suffix}".strip()

    def _assess_confidence(self, passages: List[RetrievedPassage]) -> str:
        if not passages:
            return "low"

        high_score_count = sum(1 for p in passages if p.score >= 0.5)
        medium_score_count = sum(1 for p in passages if p.score >= 0.3)

        if high_score_count >= 2:
            return "high"
        if medium_score_count >= 1 or high_score_count >= 1:
            return "medium"
        return "low"

    def _build_system_prompt_with_rag(
        self,
        context: Dict[str, Any],
        retrieved_passages: List[RetrievedPassage],
        plan: Dict[str, Any],
    ) -> str:
        role = context.get("role", "deployer")
        institution = context.get("institution_type", "financial institution")
        intent = plan.get("intent", "general")
        regulation_focus = plan.get("regulation_focus", "all")

        role_description = {
            "deployer": "a deployer (uses AI systems built by others)",
            "provider": "a provider (develops AI systems for third parties)",
            "provider_and_deployer": "both provider and deployer",
            "importer": "an importer of non-EU systems",
        }.get(role, "a financial services professional")

        if retrieved_passages:
            passages_text = "\n\n".join(
                [
                    f"### SOURCE {i+1}: {p.document.breadcrumb or f'{p.document.regulation} - {p.document.article}'}\n"
                    f"Relevance: {p.score:.2f} ({p.confidence})\n"
                    f"URL: {p.url}\n"
                    f"Text:\n{p.document.text}"
                    for i, p in enumerate(retrieved_passages)
                ]
            )
        else:
            passages_text = "No passages retrieved."

        intent_guidance = {
            "article_clarification": "Prioritise article wording, scope, exceptions, and practical meaning.",
            "obligation_finder": "Prioritise concrete obligations as actionable checklist items.",
            "concept_explainer": "Prioritise clear definitions and boundaries of the concept.",
            "cross_regulation_compare": "Compare AI Act, GDPR, and DORA where relevant; separate overlaps and differences.",
            "general": "Answer directly with citations and practical context.",
        }.get(intent, "Answer directly with citations.")

        return f"""You are an EU regulatory assistant focused on EU AI Act, GDPR, and DORA.

User context: {institution}; user role: {role_description}.
Task mode: {intent}.
Regulation focus: {regulation_focus}.

Retrieved regulatory text:
{passages_text}

Instructions:
1. Use retrieved passages as primary source. Do not invent citations.
2. Cite statements as [EU AI Act Art. X], [GDPR Art. Y], [DORA Art. Z] when applicable.
3. Separate direct regulatory content from interpretation.
4. If retrieval is incomplete, explicitly say what is missing.
5. {intent_guidance}
6. Keep answer operational for compliance teams.

Response format:
- Answer
- Regulatory basis (bullets with citations)
- Practical implications
- Caveats"""

    def _build_user_prompt(self, question: str, context: Dict[str, Any], plan: Dict[str, Any]) -> str:
        role = context.get("role", "deployer")
        institution = context.get("institution_type", "financial institution")
        return (
            f"Question from a {role} at a {institution}:\n\n"
            f"{question}\n\n"
            f"Intent mode: {plan.get('intent', 'general')}."
        )

    def _build_tls_context(self) -> ssl.SSLContext:
        """
        Build TLS context for outbound provider calls.
        Prefer certifi CA bundle when available to avoid macOS trust-store issues.
        """
        try:
            import certifi  # type: ignore

            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()

    def _call_llm(
        self,
        llm_provider: str,
        llm_api_key: str,
        llm_model: str,
        system_prompt: str,
        user_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        messages: List[Dict[str, str]] = []

        if conversation_history:
            for msg in conversation_history[-6:]:
                messages.append(
                    {
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", ""),
                    }
                )

        messages.append({"role": "user", "content": user_prompt})

        if llm_provider == "openrouter":
            payload = {
                "model": llm_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": 0.25,
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
            with urllib.request.urlopen(
                request,
                timeout=90,
                context=self._build_tls_context(),
            ) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        if llm_provider == "openai":
            payload = {
                "model": llm_model,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "temperature": 0.25,
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
            with urllib.request.urlopen(
                request,
                timeout=90,
                context=self._build_tls_context(),
            ) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]

        if llm_provider == "anthropic":
            payload = {
                "model": llm_model,
                "max_tokens": 4096,
                "system": system_prompt,
                "messages": messages,
                "temperature": 0.25,
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
            with urllib.request.urlopen(
                request,
                timeout=90,
                context=self._build_tls_context(),
            ) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["content"][0]["text"]

        raise ValueError(f"Unknown provider: {llm_provider}. Supported: openrouter, openai, anthropic")

    def _verify_citations(
        self,
        answer: str,
        retrieved_passages: List[RetrievedPassage],
    ) -> List[str]:
        reg_aliases = {
            "EU AI Act": "EU AI Act",
            "AI Act": "EU AI Act",
            "GDPR": "GDPR",
            "DORA": "DORA",
        }

        citation_pattern = re.compile(r"\[([A-Za-z ]+?)\s+Art(?:icle)?\.?\s+(\d+)\]", re.IGNORECASE)

        retrieved_set = set()
        for p in retrieved_passages:
            art_match = re.search(r"(\d+)", p.document.article)
            if art_match:
                retrieved_set.add((p.document.regulation, art_match.group(1)))

        warnings: List[str] = []
        for m in citation_pattern.finditer(answer):
            cited_reg_raw = m.group(1).strip()
            cited_art = m.group(2)

            cited_reg = reg_aliases.get(cited_reg_raw)
            if cited_reg is None:
                for alias, canonical in reg_aliases.items():
                    if alias.lower() in cited_reg_raw.lower():
                        cited_reg = canonical
                        break

            if cited_reg and (cited_reg, cited_art) not in retrieved_set:
                warnings.append(
                    f"Citation [{cited_reg_raw} Art. {cited_art}] was not found in retrieved passages."
                )

        return warnings

    def _format_sources(self, passages: List[RetrievedPassage]) -> List[Dict[str, str]]:
        sources = []
        seen = set()

        for passage in passages:
            key = f"{passage.document.regulation}-{passage.document.article}"
            if key in seen:
                continue
            seen.add(key)

            sources.append(
                {
                    "id": key,
                    "title": f"{passage.document.regulation} - {passage.document.article}",
                    "url": passage.url,
                    "regulation": passage.document.regulation,
                    "article": passage.document.article,
                    "excerpt": passage.document.text[:240],
                }
            )

        return sources

    def _build_exploration_metadata(
        self,
        plan: Dict[str, Any],
        passages: List[RetrievedPassage],
    ) -> Dict[str, Any]:
        matched_articles = []
        for p in passages[:4]:
            matched_articles.append(
                {
                    "regulation": p.document.regulation,
                    "article": p.document.article,
                    "breadcrumb": p.document.breadcrumb,
                }
            )

        suggestions = self._suggest_follow_up_questions(plan, passages)

        return {
            "intent": plan.get("intent", "general"),
            "regulation_focus": plan.get("regulation_focus", "all"),
            "suggested_questions": suggestions,
            "matched_articles": matched_articles,
        }

    def _suggest_follow_up_questions(
        self,
        plan: Dict[str, Any],
        passages: List[RetrievedPassage],
    ) -> List[str]:
        regulation = plan.get("regulation_focus", "all")
        intent = plan.get("intent", "general")

        article_refs = [f"{p.document.regulation} {p.document.article}" for p in passages[:2]]

        if article_refs:
            base = article_refs[0]
            return [
                f"Give me a plain-language summary of {base}",
                f"List concrete obligations from {base}",
                "What evidence should we keep to demonstrate compliance?",
            ]

        if intent == "obligation_finder":
            return [
                f"What are the top 5 obligations in {regulation if regulation != 'all' else 'these regulations'} for deployers?",
                "Which obligations are immediate vs ongoing?",
                "What documents should we produce for audit readiness?",
            ]

        if intent == "concept_explainer":
            return [
                "Explain this concept with one concrete banking example",
                "What are common misinterpretations of this concept?",
                "Which article should I read first for this concept?",
            ]

        if intent == "cross_regulation_compare":
            return [
                "Show overlaps between EU AI Act, GDPR, and DORA for this topic",
                "Where do obligations conflict or require separate controls?",
                "Create one consolidated compliance checklist for this topic",
            ]

        return [
            "Find the exact article for this requirement",
            "List obligations and who is accountable",
            "Explain this in plain language for non-lawyers",
        ]
