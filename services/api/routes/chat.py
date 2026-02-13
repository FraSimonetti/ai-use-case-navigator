from fastapi import APIRouter, Header
from pydantic import BaseModel, field_validator
from typing import Any, Dict, Optional

from ..services.graphrag import GraphRAGService

router = APIRouter()
service = GraphRAGService()

_MAX_QUESTION_LENGTH = 2000


class ChatRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = None

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty.")
        if len(v) > _MAX_QUESTION_LENGTH:
            raise ValueError(
                f"Question exceeds maximum length of {_MAX_QUESTION_LENGTH} characters."
            )
        return v


@router.post("")
async def chat(
    request: ChatRequest,
    x_llm_provider: Optional[str] = Header(None, alias="X-LLM-Provider"),
    x_llm_api_key: Optional[str] = Header(None, alias="X-LLM-API-Key"),
    x_llm_model: Optional[str] = Header(None, alias="X-LLM-Model"),
):
    """RAG-powered regulatory Q&A. LLM credentials are supplied via request headers."""
    return await service.answer_question(
        question=request.question,
        context=request.context,
        llm_provider=x_llm_provider,
        llm_api_key=x_llm_api_key,
        llm_model=x_llm_model,
    )
