from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Any, Dict, Optional

from ..services.graphrag import GraphRAGService

router = APIRouter()
service = GraphRAGService()


class ChatRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None


@router.post("")
async def chat(
    request: ChatRequest,
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: Optional[str] = Header(None, alias="X-LLM-API-Key"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """Chat endpoint that accepts LLM credentials via headers."""
    return await service.answer_question(
        question=request.question,
        context=request.context,
        llm_provider=x_llm_provider,
        llm_api_key=x_llm_api_key,
        llm_model=x_llm_model,
    )
