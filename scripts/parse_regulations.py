from dataclasses import dataclass
from typing import List


@dataclass
class Article:
    regulation: str
    article_number: str
    title: str
    text: str
    paragraphs: List[str]
    cross_references: List[dict]
    recitals: List[int]


@dataclass
class Recital:
    regulation: str
    number: int
    text: str
    articles: List[str]


@dataclass
class Definition:
    regulation: str
    term: str
    definition: str
    article_reference: str


@dataclass
class Annex:
    regulation: str
    annex_number: str
    title: str
    sections: List[dict]


def parse_eu_ai_act(html_content: str) -> dict:
    """
    Parse EU AI Act into structured format.
    Key structures to extract:
    - Chapters, articles, recitals, annexes
    """
    return {}


def extract_cross_references(text: str) -> List[dict]:
    """
    Extract references to:
    - Other articles within same regulation
    - Other EU regulations (GDPR, DORA, etc.)
    - Recitals
    - Annexes
    """
    return []
