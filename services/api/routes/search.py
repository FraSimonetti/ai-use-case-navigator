from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def search(query: str):
    return {"query": query, "results": []}
