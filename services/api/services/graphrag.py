import asyncio
import json
import urllib.error
from typing import Any, Dict, Optional

from .rag_engine import RAGEngine


class GraphRAGService:
    """
    Q&A service using RAG (Retrieval-Augmented Generation).

    Retrieves relevant passages from official EU AI Act, GDPR, and DORA texts
    stored in the vector database, then generates grounded answers via LLM.
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
        Answer a regulatory question using RAG.

        Returns:
            {
                "answer": str,
                "sources": List[Dict],
                "retrieved_passages": List[Dict],
                "confidence": str,   # "high", "medium", "low", or "none"
                "warnings": List[str],
            }
        """
        try:
            return await asyncio.to_thread(
                self.rag_engine.answer_question,
                question=question,
                context=context,
                llm_provider=llm_provider,
                llm_api_key=llm_api_key,
                llm_model=llm_model,
            )

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            try:
                error_msg = json.loads(error_body).get("error", {}).get("message", str(e))
            except Exception:
                error_msg = f"HTTP {e.code}: {e.reason}"
            return {
                "answer": f"**API Error:** {error_msg}\n\nVerify your API key in Settings has available credits.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [error_msg],
            }
        except urllib.error.URLError as e:
            return {
                "answer": f"**Connection Error:** Could not reach the AI provider.\n\nDetails: {e.reason}\n\nCheck your internet connection.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [str(e.reason)],
            }
        except Exception as e:
            return {
                "answer": f"**Error:** {e}\n\nCheck your API key in Settings, or use the Use Case Analysis page.",
                "sources": [],
                "retrieved_passages": [],
                "confidence": "none",
                "warnings": [str(e)],
            }
