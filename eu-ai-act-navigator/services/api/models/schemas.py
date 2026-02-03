from pydantic import BaseModel
from typing import List, Optional


class GraphNode(BaseModel):
    id: str
    type: str
    name: str


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: Optional[str] = None
    label: Optional[str] = None


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
