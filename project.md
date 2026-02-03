# Cursor Prompt: EU AI Act Navigator for Financial Institutions

## Project Overview

Build a web application that helps financial institutions (banks, insurers, investment firms, payment providers) navigate the EU AI Act and its interactions with GDPR and DORA. The platform uses GraphRAG architecture to connect regulations, obligations, use cases, and roles.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Graph Visualization**: Cytoscape.js or React Flow
- **State Management**: Zustand or React Context

### Backend
- **Runtime**: Node.js or Python FastAPI
- **Database**: PostgreSQL (structured data) + Qdrant or Pinecone (vector embeddings)
- **Graph Database**: Neo4j (knowledge graph)
- **LLM**: Claude API (Anthropic) for Q&A
- **Embeddings**: Voyage AI or OpenAI embeddings

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Fly.io (backend)
- **Search**: Hybrid search (vector + graph traversal + keyword)

---

## Project Structure

```
eu-ai-act-navigator/
├── apps/
│   └── web/                    # Next.js frontend
│       ├── app/
│       │   ├── page.tsx        # Landing page
│       │   ├── chat/           # Q&A interface
│       │   ├── explorer/       # Graph visualization
│       │   ├── obligations/    # Obligation finder
│       │   └── timeline/       # Compliance deadlines
│       ├── components/
│       │   ├── ui/             # shadcn components
│       │   ├── chat/           # Chat interface components
│       │   ├── graph/          # Graph visualization
│       │   └── forms/          # Role/use case selectors
│       └── lib/
│           ├── api.ts          # API client
│           └── types.ts        # TypeScript types
├── packages/
│   ├── database/               # Prisma schema + migrations
│   ├── graph/                  # Neo4j queries + schema
│   └── ingestion/              # Regulation parsing pipeline
├── services/
│   └── api/                    # FastAPI or Express backend
│       ├── routes/
│       │   ├── chat.py         # Q&A endpoint
│       │   ├── search.py       # Hybrid search
│       │   ├── graph.py        # Graph queries
│       │   └── obligations.py  # Obligation lookup
│       ├── services/
│       │   ├── llm.py          # Claude integration
│       │   ├── embeddings.py   # Vector operations
│       │   └── graphrag.py     # GraphRAG logic
│       └── models/
│           └── schemas.py      # Pydantic models
├── data/
│   ├── raw/                    # Original regulation PDFs/HTMLs
│   │   ├── eu-ai-act/
│   │   ├── gdpr/
│   │   └── dora/
│   ├── processed/              # Parsed JSON/structured data
│   └── embeddings/             # Pre-computed embeddings
└── scripts/
    ├── ingest.py               # Main ingestion script
    ├── parse_regulations.py    # PDF/HTML parsing
    ├── build_graph.py          # Neo4j population
    └── generate_embeddings.py  # Vector generation
```

---

## Phase 1: Data Ingestion Pipeline

### Step 1.1: Source Documents

Download official texts from EUR-Lex:
- EU AI Act: Regulation (EU) 2024/1689
- GDPR: Regulation (EU) 2016/679
- DORA: Regulation (EU) 2022/2554

```python
# scripts/download_regulations.py

REGULATIONS = {
    "eu_ai_act": {
        "celex": "32024R1689",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689",
        "name": "EU AI Act",
        "full_name": "Regulation (EU) 2024/1689 - Artificial Intelligence Act"
    },
    "gdpr": {
        "celex": "32016R0679",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679",
        "name": "GDPR",
        "full_name": "Regulation (EU) 2016/679 - General Data Protection Regulation"
    },
    "dora": {
        "celex": "32022R2554",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554",
        "name": "DORA",
        "full_name": "Regulation (EU) 2022/2554 - Digital Operational Resilience Act"
    }
}
```

### Step 1.2: Parse Regulations into Structured JSON

```python
# scripts/parse_regulations.py

from dataclasses import dataclass
from typing import List, Optional
import json

@dataclass
class Article:
    regulation: str           # "eu_ai_act", "gdpr", "dora"
    article_number: str       # "5", "22", "6(1)(a)"
    title: str
    text: str
    paragraphs: List[str]
    cross_references: List[dict]  # References to other articles/regulations
    recitals: List[int]       # Related recital numbers
    
@dataclass
class Recital:
    regulation: str
    number: int
    text: str
    articles: List[str]       # Related articles
    
@dataclass
class Definition:
    regulation: str
    term: str
    definition: str
    article_reference: str    # Where defined
    
@dataclass
class Annex:
    regulation: str
    annex_number: str         # "I", "II", "III"
    title: str
    sections: List[dict]
    
# Parse EU AI Act structure:
# - 113 Articles (Chapters I-XIII)
# - 180 Recitals
# - 13 Annexes (I-XIII)

def parse_eu_ai_act(html_content: str) -> dict:
    """
    Parse EU AI Act into structured format.
    Key structures to extract:
    
    Chapter I: General Provisions (Art. 1-4)
    - Definitions (Art. 3) - 68 defined terms
    
    Chapter II: Prohibited AI Practices (Art. 5)
    - 8 prohibited practices
    
    Chapter III: High-Risk AI Systems (Art. 6-49)
    - Classification rules (Art. 6)
    - Requirements (Art. 8-15)
    - Obligations by role (Art. 16-27)
    
    Chapter IV: Transparency (Art. 50)
    
    Chapter V: General-Purpose AI (Art. 51-56)
    
    Annex I: Union Harmonisation Legislation (product safety)
    Annex II: Deleted
    Annex III: High-Risk AI Use Cases (8 areas)
    """
    pass

def extract_cross_references(text: str) -> List[dict]:
    """
    Extract references to:
    - Other articles within same regulation
    - Other EU regulations (GDPR, DORA, etc.)
    - Recitals
    - Annexes
    
    Patterns to match:
    - "Article X" / "Articles X and Y"
    - "paragraph X" / "point (a)"
    - "Regulation (EU) XXXX/XXX"
    - "Directive XXXX/XX/EU"
    - "recital (XX)"
    - "Annex X"
    """
    pass
```

### Step 1.3: Financial Services Specific Extraction

```python
# scripts/extract_financial_context.py

FINANCIAL_AI_USE_CASES = [
    {
        "id": "credit_scoring",
        "name": "Credit Scoring / Creditworthiness Assessment",
        "risk_level": "high_risk",
        "ai_act_reference": "Annex III, point 5(b)",
        "description": "AI systems used to evaluate creditworthiness of natural persons",
        "related_regulations": ["gdpr_art_22", "consumer_credit_directive"],
        "typical_actors": ["banks", "credit_institutions", "fintech_lenders"],
        "obligations": ["conformity_assessment", "human_oversight", "transparency", "fraia"]
    },
    {
        "id": "fraud_detection",
        "name": "Fraud Detection",
        "risk_level": "context_dependent",  # May be high-risk or not
        "ai_act_reference": "Art. 6(3)",
        "description": "AI systems for detecting fraudulent transactions",
        "related_regulations": ["psd2", "aml_directive"],
        "typical_actors": ["banks", "payment_providers", "insurers"],
        "obligations": ["depends_on_classification"]
    },
    {
        "id": "aml_kyc",
        "name": "AML/KYC Screening",
        "risk_level": "context_dependent",
        "ai_act_reference": "Art. 6(3)",
        "description": "AI for anti-money laundering and know-your-customer checks",
        "related_regulations": ["aml_directive_6", "dora"],
        "typical_actors": ["banks", "investment_firms", "crypto_providers"],
        "obligations": ["depends_on_classification"]
    },
    {
        "id": "algorithmic_trading",
        "name": "Algorithmic Trading",
        "risk_level": "minimal_or_limited",
        "ai_act_reference": "Not explicitly listed in Annex III",
        "description": "AI systems for automated trading decisions",
        "related_regulations": ["mifid2_art_17"],
        "typical_actors": ["investment_firms", "hedge_funds"],
        "obligations": ["general_purpose_if_applicable", "mifid_specific"]
    },
    {
        "id": "robo_advisory",
        "name": "Robo-Advisory / Automated Investment Advice",
        "risk_level": "context_dependent",
        "ai_act_reference": "Art. 6(3) - may be high-risk",
        "description": "AI providing investment recommendations to retail clients",
        "related_regulations": ["mifid2_suitability", "idd"],
        "typical_actors": ["investment_firms", "banks", "fintech"],
        "obligations": ["transparency", "possibly_high_risk"]
    },
    {
        "id": "insurance_pricing",
        "name": "Insurance Risk Assessment & Pricing",
        "risk_level": "high_risk",
        "ai_act_reference": "Annex III, point 5(c)",
        "description": "AI for life/health insurance risk assessment and premium setting",
        "related_regulations": ["solvency2", "idd", "gdpr"],
        "typical_actors": ["insurers", "reinsurers"],
        "obligations": ["conformity_assessment", "human_oversight", "transparency", "fraia"]
    },
    {
        "id": "claims_processing",
        "name": "Insurance Claims Processing",
        "risk_level": "context_dependent",
        "ai_act_reference": "Art. 6(3)",
        "description": "AI for automated claims assessment and processing",
        "related_regulations": ["solvency2", "gdpr_art_22"],
        "typical_actors": ["insurers"],
        "obligations": ["depends_on_classification"]
    },
    {
        "id": "customer_chatbot",
        "name": "Customer Service Chatbot",
        "risk_level": "limited_risk",
        "ai_act_reference": "Art. 50(1)",
        "description": "AI chatbots interacting with customers",
        "related_regulations": ["gdpr", "consumer_rights_directive"],
        "typical_actors": ["all_financial_institutions"],
        "obligations": ["transparency_disclosure"]
    },
    {
        "id": "internal_risk_models",
        "name": "Internal Risk Models (IRB, Internal Models)",
        "risk_level": "context_dependent",
        "ai_act_reference": "May fall under Art. 6(3)",
        "description": "AI-enhanced models for regulatory capital calculation",
        "related_regulations": ["crd_crr", "solvency2"],
        "typical_actors": ["banks", "insurers"],
        "obligations": ["existing_sectoral_requirements_may_suffice"]
    }
]

ROLES_IN_AI_VALUE_CHAIN = [
    {
        "id": "provider",
        "name": "AI Provider",
        "ai_act_definition": "Art. 3(3)",
        "description": "Develops or has AI system developed and places it on market or puts into service under own name/trademark",
        "financial_examples": ["Vendor selling credit scoring AI to banks", "Fintech developing fraud detection"],
        "key_obligations": [
            "Conformity assessment (Art. 43)",
            "Technical documentation (Art. 11)",
            "Quality management system (Art. 17)",
            "Registration in EU database (Art. 49)",
            "Post-market monitoring (Art. 72)"
        ]
    },
    {
        "id": "deployer",
        "name": "AI Deployer",
        "ai_act_definition": "Art. 3(4)",
        "description": "Uses AI system under its authority (except personal non-professional use)",
        "financial_examples": ["Bank using vendor's credit scoring AI", "Insurer using third-party fraud detection"],
        "key_obligations": [
            "Use according to instructions (Art. 26)",
            "Human oversight (Art. 26(2))",
            "Input data relevance (Art. 26(4))",
            "Monitoring and incident reporting (Art. 26(5))",
            "FRAIA for high-risk (Art. 27)",
            "Inform individuals (Art. 26(11))"
        ]
    },
    {
        "id": "provider_and_deployer",
        "name": "Provider & Deployer (In-House Development)",
        "ai_act_definition": "Art. 25",
        "description": "Financial institution that develops AND uses its own AI system",
        "financial_examples": ["Large bank developing proprietary credit model", "Insurer building internal risk AI"],
        "key_obligations": [
            "All provider obligations",
            "All deployer obligations"
        ]
    },
    {
        "id": "importer",
        "name": "Importer",
        "ai_act_definition": "Art. 3(6)",
        "description": "Places on EU market an AI system from third country provider",
        "financial_examples": ["EU subsidiary of US bank importing parent's AI system"],
        "key_obligations": [
            "Verify conformity assessment done (Art. 23)",
            "Verify CE marking and documentation (Art. 23)",
            "Keep copy of documentation (Art. 23)"
        ]
    }
]
```

---

## Phase 2: Knowledge Graph Schema (Neo4j)

### Step 2.1: Node Types

```cypher
// Node labels and properties

// Regulations
CREATE CONSTRAINT regulation_id IF NOT EXISTS FOR (r:Regulation) REQUIRE r.id IS UNIQUE;

(:Regulation {
    id: "eu_ai_act",
    name: "EU AI Act",
    full_name: "Regulation (EU) 2024/1689",
    celex: "32024R1689",
    entry_into_force: date("2024-08-01"),
    full_application: date("2026-08-02")
})

// Articles
CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE;

(:Article {
    id: "eu_ai_act_art_5",
    regulation: "eu_ai_act",
    number: "5",
    title: "Prohibited AI practices",
    text: "...",
    chapter: "II",
    application_date: date("2025-02-02")
})

// Recitals
(:Recital {
    id: "eu_ai_act_rec_47",
    regulation: "eu_ai_act",
    number: 47,
    text: "..."
})

// Definitions
(:Definition {
    id: "eu_ai_act_def_ai_system",
    regulation: "eu_ai_act",
    term: "AI system",
    definition: "...",
    source_article: "3(1)"
})

// Annexes
(:Annex {
    id: "eu_ai_act_annex_iii",
    regulation: "eu_ai_act",
    number: "III",
    title: "High-Risk AI Systems Referred to in Article 6(2)"
})

// Risk Categories
(:RiskCategory {
    id: "high_risk",
    name: "High-Risk",
    description: "AI systems requiring conformity assessment",
    ai_act_articles: ["6", "8-15", "16-27"]
})

// Obligations
(:Obligation {
    id: "conformity_assessment",
    name: "Conformity Assessment",
    description: "Third-party or self-assessment of AI system compliance",
    applies_to_roles: ["provider"],
    applies_to_risk: ["high_risk"],
    ai_act_articles: ["43"]
})

// Roles
(:Role {
    id: "deployer",
    name: "Deployer",
    ai_act_definition: "Art. 3(4)",
    description: "..."
})

// Use Cases (Financial Services specific)
(:UseCase {
    id: "credit_scoring",
    name: "Credit Scoring",
    sector: "financial_services",
    description: "...",
    risk_level: "high_risk"
})

// Supervisory Authorities
(:Authority {
    id: "eba",
    name: "European Banking Authority",
    type: "eu_authority",
    sector: "banking"
})

// Deadlines/Timeline
(:Deadline {
    id: "prohibited_practices",
    description: "Prohibited AI practices apply",
    date: date("2025-02-02"),
    ai_act_articles: ["5", "113"]
})
```

### Step 2.2: Relationship Types

```cypher
// Relationship types

// Cross-references between articles
(:Article)-[:REFERENCES {context: "...", paragraph: "2"}]->(:Article)

// Article explains/relates to recital
(:Article)-[:EXPLAINED_BY]->(:Recital)
(:Recital)-[:EXPLAINS]->(:Article)

// Regulation contains articles
(:Regulation)-[:CONTAINS]->(:Article)
(:Regulation)-[:CONTAINS]->(:Annex)
(:Regulation)-[:CONTAINS]->(:Definition)

// Risk classification
(:UseCase)-[:CLASSIFIED_AS {basis: "Annex III, point 5(b)"}]->(:RiskCategory)

// Obligations
(:RiskCategory)-[:REQUIRES]->(:Obligation)
(:Role)-[:HAS_OBLIGATION {condition: "for high-risk AI"}]->(:Obligation)

// Use case obligations
(:UseCase)-[:TRIGGERS]->(:Obligation)

// Supervision
(:UseCase)-[:SUPERVISED_BY]->(:Authority)
(:Role)-[:REPORTS_TO]->(:Authority)

// Regulatory interaction
(:Regulation)-[:INTERACTS_WITH {nature: "complementary"}]->(:Regulation)
(:Article)-[:OVERLAPS_WITH {description: "automated decision-making"}]->(:Article)

// Timeline
(:Article)-[:APPLIES_FROM]->(:Deadline)
(:Obligation)-[:DEADLINE]->(:Deadline)
```

### Step 2.3: Sample Graph Population

```cypher
// Create AI Act structure
CREATE (ai_act:Regulation {
    id: "eu_ai_act",
    name: "EU AI Act",
    full_name: "Regulation (EU) 2024/1689"
})

CREATE (art5:Article {
    id: "eu_ai_act_art_5",
    number: "5",
    title: "Prohibited AI practices"
})

CREATE (art6:Article {
    id: "eu_ai_act_art_6",
    number: "6",
    title: "Classification rules for high-risk AI systems"
})

CREATE (annex_iii:Annex {
    id: "eu_ai_act_annex_iii",
    number: "III",
    title: "High-Risk AI Systems"
})

// Connect
CREATE (ai_act)-[:CONTAINS]->(art5)
CREATE (ai_act)-[:CONTAINS]->(art6)
CREATE (ai_act)-[:CONTAINS]->(annex_iii)
CREATE (art6)-[:REFERENCES]->(annex_iii)

// Credit scoring use case
CREATE (credit:UseCase {
    id: "credit_scoring",
    name: "Credit Scoring",
    sector: "financial_services"
})

CREATE (high_risk:RiskCategory {
    id: "high_risk",
    name: "High-Risk"
})

CREATE (credit)-[:CLASSIFIED_AS {basis: "Annex III, point 5(b)"}]->(high_risk)

// GDPR connection
CREATE (gdpr:Regulation {
    id: "gdpr",
    name: "GDPR"
})

CREATE (gdpr_art22:Article {
    id: "gdpr_art_22",
    number: "22",
    title: "Automated individual decision-making, including profiling"
})

CREATE (gdpr)-[:CONTAINS]->(gdpr_art22)
CREATE (art5)-[:REFERENCES {context: "data protection"}]->(gdpr)
CREATE (credit)-[:TRIGGERS]->(gdpr_art22)
```

---

## Phase 3: Backend API

### Step 3.1: FastAPI Structure

```python
# services/api/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="EU AI Act Navigator API",
    description="API for navigating EU AI Act for financial institutions",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from routes import chat, search, graph, obligations
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(obligations.router, prefix="/api/obligations", tags=["Obligations"])
```

### Step 3.2: GraphRAG Service

```python
# services/api/services/graphrag.py

from typing import List, Dict, Any
import anthropic
from neo4j import GraphDatabase
from qdrant_client import QdrantClient

class GraphRAGService:
    def __init__(self):
        self.neo4j = GraphDatabase.driver(...)
        self.qdrant = QdrantClient(...)
        self.claude = anthropic.Anthropic()
    
    async def answer_question(
        self,
        question: str,
        context: Dict[str, Any] = None  # user's role, use case, etc.
    ) -> Dict[str, Any]:
        """
        GraphRAG pipeline:
        1. Embed question
        2. Vector search for relevant chunks
        3. Graph traversal from retrieved nodes
        4. Expand context with related entities
        5. Generate answer with Claude
        """
        
        # Step 1: Vector search
        relevant_chunks = await self._vector_search(question, limit=10)
        
        # Step 2: Extract entities mentioned
        entities = await self._extract_entities(question)
        
        # Step 3: Graph expansion
        graph_context = await self._expand_graph_context(
            chunks=relevant_chunks,
            entities=entities,
            hops=2  # Traverse 2 levels of relationships
        )
        
        # Step 4: Build prompt with context
        system_prompt = self._build_system_prompt(context)
        user_prompt = self._build_user_prompt(
            question=question,
            chunks=relevant_chunks,
            graph_context=graph_context
        )
        
        # Step 5: Generate answer
        response = self.claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        return {
            "answer": response.content[0].text,
            "sources": self._format_sources(relevant_chunks),
            "related_articles": graph_context["articles"],
            "graph_data": graph_context["visualization_data"]
        }
    
    async def _expand_graph_context(
        self,
        chunks: List[Dict],
        entities: List[str],
        hops: int = 2
    ) -> Dict[str, Any]:
        """
        From retrieved chunks, traverse graph to find:
        - Related articles in same regulation
        - Cross-references to other regulations
        - Related obligations
        - Relevant use cases
        """
        query = """
        // Start from matched articles
        MATCH (a:Article)
        WHERE a.id IN $article_ids
        
        // Expand to related content (2 hops)
        CALL apoc.path.subgraphAll(a, {
            maxLevel: $hops,
            relationshipFilter: "REFERENCES|EXPLAINED_BY|REQUIRES|OVERLAPS_WITH"
        })
        YIELD nodes, relationships
        
        // Return structured context
        WITH nodes, relationships
        UNWIND nodes AS node
        RETURN 
            collect(DISTINCT CASE WHEN node:Article THEN node END) AS articles,
            collect(DISTINCT CASE WHEN node:Obligation THEN node END) AS obligations,
            collect(DISTINCT CASE WHEN node:Definition THEN node END) AS definitions,
            relationships
        """
        
        with self.neo4j.session() as session:
            result = session.run(query, article_ids=article_ids, hops=hops)
            return self._process_graph_result(result)
    
    def _build_system_prompt(self, context: Dict = None) -> str:
        return """You are an expert assistant helping financial institutions 
        understand and comply with the EU AI Act, GDPR, and DORA.
        
        Your role is to:
        1. Provide accurate, specific answers citing exact articles and paragraphs
        2. Explain how different regulations interact
        3. Identify relevant obligations based on the user's role and AI use case
        4. Clarify timelines and deadlines
        5. Highlight financial services-specific considerations
        
        Always cite your sources using the format: [Regulation Art. X(Y)]
        Example: [AI Act Art. 6(2)] or [GDPR Art. 22(1)]
        
        If information is unclear or the classification depends on specific 
        circumstances, explain the factors that would determine the answer.
        
        Current context:
        - User role: {role}
        - AI use case: {use_case}
        - Institution type: {institution_type}
        """.format(**context) if context else "..."
```

### Step 3.3: Obligation Finder

```python
# services/api/routes/obligations.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

router = APIRouter()

class InstitutionType(str, Enum):
    BANK = "bank"
    INSURER = "insurer"
    INVESTMENT_FIRM = "investment_firm"
    PAYMENT_PROVIDER = "payment_provider"
    CRYPTO_PROVIDER = "crypto_provider"
    OTHER = "other"

class AIRole(str, Enum):
    PROVIDER = "provider"
    DEPLOYER = "deployer"
    PROVIDER_AND_DEPLOYER = "provider_and_deployer"
    IMPORTER = "importer"

class AIUseCase(str, Enum):
    CREDIT_SCORING = "credit_scoring"
    FRAUD_DETECTION = "fraud_detection"
    AML_KYC = "aml_kyc"
    ALGORITHMIC_TRADING = "algorithmic_trading"
    ROBO_ADVISORY = "robo_advisory"
    INSURANCE_PRICING = "insurance_pricing"
    CLAIMS_PROCESSING = "claims_processing"
    CUSTOMER_CHATBOT = "customer_chatbot"
    INTERNAL_RISK_MODELS = "internal_risk_models"
    OTHER = "other"

class ObligationRequest(BaseModel):
    institution_type: InstitutionType
    role: AIRole
    use_case: AIUseCase
    use_case_description: Optional[str] = None
    involves_natural_persons: bool = True
    involves_profiling: bool = False

class Obligation(BaseModel):
    id: str
    name: str
    description: str
    source_regulation: str
    source_articles: List[str]
    deadline: Optional[str]
    priority: str  # "critical", "high", "medium"
    action_items: List[str]

class ObligationResponse(BaseModel):
    risk_classification: str
    classification_basis: str
    obligations: List[Obligation]
    ai_act_obligations: List[Obligation]
    gdpr_obligations: List[Obligation]
    dora_obligations: List[Obligation]
    timeline: List[dict]
    warnings: List[str]

@router.post("/find", response_model=ObligationResponse)
async def find_obligations(request: ObligationRequest):
    """
    Determine applicable obligations based on:
    - Institution type
    - Role in AI value chain
    - AI use case
    - Whether natural persons are affected
    """
    
    # Step 1: Determine risk classification
    risk_level = determine_risk_level(request)
    
    # Step 2: Get AI Act obligations by role and risk
    ai_act_obs = get_ai_act_obligations(
        role=request.role,
        risk_level=risk_level,
        use_case=request.use_case
    )
    
    # Step 3: Get GDPR obligations
    gdpr_obs = get_gdpr_obligations(
        involves_profiling=request.involves_profiling,
        involves_natural_persons=request.involves_natural_persons,
        use_case=request.use_case
    )
    
    # Step 4: Get DORA obligations
    dora_obs = get_dora_obligations(
        institution_type=request.institution_type,
        role=request.role
    )
    
    # Step 5: Build timeline
    timeline = build_compliance_timeline(
        ai_act_obs + gdpr_obs + dora_obs
    )
    
    return ObligationResponse(
        risk_classification=risk_level,
        classification_basis=get_classification_basis(request),
        obligations=ai_act_obs + gdpr_obs + dora_obs,
        ai_act_obligations=ai_act_obs,
        gdpr_obligations=gdpr_obs,
        dora_obligations=dora_obs,
        timeline=timeline,
        warnings=get_warnings(request)
    )

def determine_risk_level(request: ObligationRequest) -> str:
    """
    Determine AI Act risk classification based on use case.
    
    HIGH-RISK (Annex III):
    - Credit scoring for natural persons [5(b)]
    - Life/health insurance risk assessment and pricing [5(c)]
    
    CONTEXT-DEPENDENT:
    - Fraud detection (may be high-risk if significant impact)
    - AML/KYC (depends on implementation)
    - Robo-advisory (depends on autonomy level)
    
    LIMITED RISK (Art. 50):
    - Chatbots (transparency only)
    
    MINIMAL RISK:
    - Most other uses
    """
    
    HIGH_RISK_USE_CASES = [
        AIUseCase.CREDIT_SCORING,
        AIUseCase.INSURANCE_PRICING
    ]
    
    LIMITED_RISK_USE_CASES = [
        AIUseCase.CUSTOMER_CHATBOT
    ]
    
    if request.use_case in HIGH_RISK_USE_CASES:
        return "high_risk"
    elif request.use_case in LIMITED_RISK_USE_CASES:
        return "limited_risk"
    else:
        return "context_dependent"  # Requires further analysis
```

---

## Phase 4: Frontend

### Step 4.1: Main Layout

```tsx
// apps/web/app/layout.tsx

import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Sidebar } from '@/components/sidebar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Step 4.2: Chat Interface

```tsx
// apps/web/app/chat/page.tsx

'use client'

import { useState } from 'react'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatMessage } from '@/components/chat/chat-message'
import { SourcePanel } from '@/components/chat/source-panel'
import { GraphMiniView } from '@/components/graph/graph-mini-view'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  graphData?: GraphData
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)

  const handleSubmit = async (question: string) => {
    setIsLoading(true)
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: question }])
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          context: {
            // Could be set from user profile
            role: 'deployer',
            institution_type: 'bank'
          }
        })
      })
      
      const data = await response.json()
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        graphData: data.graph_data
      }])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage 
                key={idx} 
                message={msg}
                onSourceClick={setSelectedSource}
              />
            ))
          )}
        </div>
        
        <div className="border-t p-4">
          <ChatInput 
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder="Ask about AI Act obligations, GDPR requirements, or DORA compliance..."
          />
        </div>
      </div>
      
      {/* Source panel (collapsible) */}
      {selectedSource && (
        <SourcePanel 
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  )
}

function WelcomeScreen() {
  const exampleQuestions = [
    "We use AI for credit scoring - what are our obligations under the AI Act?",
    "How do AI Act transparency requirements interact with GDPR Article 22?",
    "We're buying an AI fraud detection system - are we a provider or deployer?",
    "What's the timeline for AI Act compliance? When do we need to be ready?",
    "Our AI vendor is outside the EU - what does DORA say about this?",
    "Do we need a Fundamental Rights Impact Assessment for our chatbot?"
  ]
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h1 className="text-3xl font-bold mb-2">EU AI Act Navigator</h1>
      <p className="text-muted-foreground mb-8">
        For Financial Institutions
      </p>
      
      <div className="grid gap-3 max-w-2xl">
        <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
        {exampleQuestions.map((q, idx) => (
          <button
            key={idx}
            className="text-left p-3 rounded-lg border hover:bg-muted transition-colors text-sm"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Step 4.3: Obligation Finder

```tsx
// apps/web/app/obligations/page.tsx

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ObligationCard } from '@/components/obligations/obligation-card'
import { TimelineView } from '@/components/obligations/timeline-view'

const INSTITUTION_TYPES = [
  { value: 'bank', label: 'Bank / Credit Institution' },
  { value: 'insurer', label: 'Insurance Company' },
  { value: 'investment_firm', label: 'Investment Firm' },
  { value: 'payment_provider', label: 'Payment Service Provider' },
  { value: 'crypto_provider', label: 'Crypto Asset Service Provider' },
]

const AI_ROLES = [
  { value: 'deployer', label: 'Deployer (using third-party AI)' },
  { value: 'provider', label: 'Provider (developing AI for others)' },
  { value: 'provider_and_deployer', label: 'Both (in-house development & use)' },
  { value: 'importer', label: 'Importer (bringing non-EU AI to market)' },
]

const USE_CASES = [
  { value: 'credit_scoring', label: 'Credit Scoring / Creditworthiness' },
  { value: 'fraud_detection', label: 'Fraud Detection' },
  { value: 'aml_kyc', label: 'AML/KYC Screening' },
  { value: 'algorithmic_trading', label: 'Algorithmic Trading' },
  { value: 'robo_advisory', label: 'Robo-Advisory' },
  { value: 'insurance_pricing', label: 'Insurance Risk Assessment & Pricing' },
  { value: 'claims_processing', label: 'Claims Processing' },
  { value: 'customer_chatbot', label: 'Customer Service Chatbot' },
  { value: 'internal_risk_models', label: 'Internal Risk Models' },
]

export default function ObligationsPage() {
  const [formData, setFormData] = useState({
    institution_type: '',
    role: '',
    use_case: '',
    involves_natural_persons: true,
    involves_profiling: false,
  })
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/obligations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error finding obligations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Obligation Finder</h1>
      <p className="text-muted-foreground mb-8">
        Identify your AI Act, GDPR, and DORA obligations based on your specific situation
      </p>

      {/* Input Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tell us about your AI system</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Institution Type</label>
              <Select 
                value={formData.institution_type}
                onValueChange={(v) => setFormData({...formData, institution_type: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Role</label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({...formData, role: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {AI_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">AI Use Case</label>
              <Select
                value={formData.use_case}
                onValueChange={(v) => setFormData({...formData, use_case: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select use case..." />
                </SelectTrigger>
                <SelectContent>
                  {USE_CASES.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="natural_persons"
                checked={formData.involves_natural_persons}
                onCheckedChange={(c) => setFormData({...formData, involves_natural_persons: !!c})}
              />
              <label htmlFor="natural_persons" className="text-sm">
                Affects natural persons (individuals)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="profiling"
                checked={formData.involves_profiling}
                onCheckedChange={(c) => setFormData({...formData, involves_profiling: !!c})}
              />
              <label htmlFor="profiling" className="text-sm">
                Involves profiling
              </label>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Analyzing...' : 'Find My Obligations'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Risk Classification */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Badge 
                  variant={results.risk_classification === 'high_risk' ? 'destructive' : 'secondary'}
                  className="text-lg px-4 py-1"
                >
                  {results.risk_classification.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-muted-foreground">
                  Based on: {results.classification_basis}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineView deadlines={results.timeline} />
            </CardContent>
          </Card>

          {/* Obligations by Regulation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Badge>AI Act</Badge>
                {results.ai_act_obligations.length} obligations
              </h3>
              {results.ai_act_obligations.map(ob => (
                <ObligationCard key={ob.id} obligation={ob} />
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Badge variant="outline">GDPR</Badge>
                {results.gdpr_obligations.length} obligations
              </h3>
              {results.gdpr_obligations.map(ob => (
                <ObligationCard key={ob.id} obligation={ob} />
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Badge variant="outline">DORA</Badge>
                {results.dora_obligations.length} obligations
              </h3>
              {results.dora_obligations.map(ob => (
                <ObligationCard key={ob.id} obligation={ob} />
              ))}
            </div>
          </div>

          {/* Warnings */}
          {results.warnings.length > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-yellow-600">⚠️ Important Considerations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-4 space-y-2">
                  {results.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
```

### Step 4.4: Graph Explorer

```tsx
// apps/web/app/explorer/page.tsx

'use client'

import { useState, useCallback, useEffect } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const CYTOSCAPE_STYLESHEET = [
  {
    selector: 'node[type="regulation"]',
    style: {
      'background-color': '#3b82f6',
      'label': 'data(label)',
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '12px',
      'width': '80px',
      'height': '80px',
    }
  },
  {
    selector: 'node[type="article"]',
    style: {
      'background-color': '#10b981',
      'label': 'data(label)',
      'width': '50px',
      'height': '50px',
    }
  },
  {
    selector: 'node[type="use_case"]',
    style: {
      'background-color': '#f59e0b',
      'label': 'data(label)',
      'shape': 'diamond',
      'width': '60px',
      'height': '60px',
    }
  },
  {
    selector: 'node[type="obligation"]',
    style: {
      'background-color': '#ef4444',
      'label': 'data(label)',
      'shape': 'rectangle',
      'width': '100px',
      'height': '40px',
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#ccc',
      'target-arrow-color': '#ccc',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '10px',
    }
  },
  {
    selector: 'edge[type="references"]',
    style: {
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
    }
  },
  {
    selector: 'edge[type="requires"]',
    style: {
      'line-color': '#ef4444',
      'target-arrow-color': '#ef4444',
      'line-style': 'dashed',
    }
  }
]

export default function ExplorerPage() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Load initial graph data
    fetchGraphData()
  }, [])

  const fetchGraphData = async (query?: string) => {
    const params = query ? `?query=${encodeURIComponent(query)}` : ''
    const response = await fetch(`/api/graph/explore${params}`)
    const data = await response.json()
    setGraphData(data)
  }

  const handleNodeSelect = useCallback((event) => {
    const node = event.target
    setSelectedNode({
      id: node.id(),
      ...node.data()
    })
  }, [])

  const elements = [
    ...graphData.nodes.map(n => ({ data: { ...n, label: n.name } })),
    ...graphData.edges.map(e => ({ data: e }))
  ]

  return (
    <div className="flex h-full">
      {/* Graph View */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 z-10">
          <Input
            placeholder="Search articles, regulations, obligations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGraphData(searchQuery)}
            className="max-w-md bg-white shadow"
          />
        </div>
        
        <CytoscapeComponent
          elements={elements}
          stylesheet={CYTOSCAPE_STYLESHEET}
          style={{ width: '100%', height: '100%' }}
          layout={{ name: 'cose', animate: true }}
          cy={(cy) => {
            cy.on('tap', 'node', handleNodeSelect)
          }}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span>Regulation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Article</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rotate-45 bg-yellow-500"></div>
              <span>Use Case</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-red-500"></div>
              <span>Obligation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <div className="w-96 border-l bg-muted/50 p-4 overflow-auto">
          <Card>
            <CardHeader>
              <Badge className="w-fit mb-2">{selectedNode.type}</Badge>
              <CardTitle>{selectedNode.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedNode.type === 'article' && (
                <>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Regulation</h4>
                    <p>{selectedNode.regulation}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Article Number</h4>
                    <p>Article {selectedNode.number}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Text Preview</h4>
                    <p className="text-sm">{selectedNode.text?.substring(0, 300)}...</p>
                  </div>
                </>
              )}
              
              {selectedNode.type === 'obligation' && (
                <>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Description</h4>
                    <p>{selectedNode.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Applies To</h4>
                    <div className="flex gap-1 flex-wrap">
                      {selectedNode.applies_to_roles?.map(r => (
                        <Badge key={r} variant="outline">{r}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedNode.type === 'use_case' && (
                <>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Risk Level</h4>
                    <Badge variant={selectedNode.risk_level === 'high_risk' ? 'destructive' : 'secondary'}>
                      {selectedNode.risk_level}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">AI Act Reference</h4>
                    <p>{selectedNode.ai_act_reference}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
```

---

## Phase 5: Key Implementation Details

### 5.1: AI Act Timeline (Critical Dates)

```typescript
// packages/database/data/timeline.ts

export const AI_ACT_TIMELINE = [
  {
    date: '2024-08-01',
    event: 'Entry into force',
    description: 'AI Act published and enters into force',
    articles: ['113']
  },
  {
    date: '2025-02-02',
    event: 'Prohibited practices apply',
    description: 'Chapter II (Prohibited AI Practices) becomes applicable',
    articles: ['5'],
    impact: 'critical',
    financial_relevance: 'Check for prohibited uses in credit, insurance, employment'
  },
  {
    date: '2025-08-02',
    event: 'GPAI rules apply',
    description: 'General-Purpose AI model requirements apply',
    articles: ['51-56'],
    impact: 'medium',
    financial_relevance: 'Relevant if using foundation models'
  },
  {
    date: '2026-08-02',
    event: 'Full application',
    description: 'All provisions apply, including high-risk AI requirements',
    articles: ['6-49'],
    impact: 'critical',
    financial_relevance: 'Credit scoring, insurance pricing AI must be compliant'
  },
  {
    date: '2027-08-02',
    event: 'Annex I AI systems',
    description: 'High-risk AI in products (Annex I) requirements apply',
    articles: ['6(1)'],
    impact: 'high',
    financial_relevance: 'Limited direct impact for most financial services'
  }
]
```

### 5.2: Cross-Reference Mapping

```typescript
// packages/graph/data/cross_references.ts

export const KEY_CROSS_REFERENCES = [
  {
    from: { regulation: 'eu_ai_act', article: '5(1)(c)' },
    to: { regulation: 'gdpr', article: '9' },
    relationship: 'references',
    context: 'Social scoring prohibition relates to special categories of data'
  },
  {
    from: { regulation: 'eu_ai_act', article: '10' },
    to: { regulation: 'gdpr', article: '5' },
    relationship: 'requires_compliance_with',
    context: 'Training data governance must respect data protection principles'
  },
  {
    from: { regulation: 'eu_ai_act', article: '26(11)' },
    to: { regulation: 'gdpr', article: '22' },
    relationship: 'overlaps_with',
    context: 'Deployer transparency obligations align with automated decision-making rights'
  },
  {
    from: { regulation: 'eu_ai_act', article: '27' },
    to: { regulation: 'gdpr', article: '35' },
    relationship: 'complements',
    context: 'Fundamental Rights Impact Assessment complements DPIA'
  },
  {
    from: { regulation: 'eu_ai_act', article: '16' },
    to: { regulation: 'dora', article: '6' },
    relationship: 'interacts_with',
    context: 'Provider quality management intersects with ICT risk management'
  },
  {
    from: { regulation: 'eu_ai_act', article: '25' },
    to: { regulation: 'dora', article: '28' },
    relationship: 'interacts_with',
    context: 'When AI provider is third-party ICT provider, DORA oversight applies'
  }
]
```

---

## Getting Started Commands

```bash
# 1. Create project structure
npx create-next-app@latest eu-ai-act-navigator --typescript --tailwind --app

# 2. Install dependencies
cd eu-ai-act-navigator
npm install @anthropic-ai/sdk neo4j-driver @qdrant/js-client-rest cytoscape react-cytoscapejs zustand
npx shadcn@latest init

# 3. Add shadcn components
npx shadcn@latest add button card input select badge checkbox

# 4. Set up backend (in separate directory)
mkdir -p services/api
cd services/api
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn anthropic neo4j qdrant-client python-dotenv pydantic

# 5. Set up Neo4j (Docker)
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# 6. Set up Qdrant (Docker)
docker run -d --name qdrant \
  -p 6333:6333 \
  qdrant/qdrant:latest
```

---

## Environment Variables

```env
# .env.local (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000

# .env (Backend)
ANTHROPIC_API_KEY=sk-ant-...
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
QDRANT_URL=http://localhost:6333
```

---

## Summary: What This Prompt Creates

1. **Data Pipeline**: Scripts to download, parse, and structure EU AI Act, GDPR, and DORA
2. **Knowledge Graph**: Neo4j schema with articles, obligations, use cases, cross-references
3. **GraphRAG Backend**: FastAPI service with hybrid search (vector + graph traversal)
4. **Q&A Interface**: Claude-powered chat focused on financial services context
5. **Obligation Finder**: Interactive tool to identify duties by role/use case
6. **Graph Explorer**: Visual navigation of regulation interconnections
7. **Timeline Tracker**: Compliance deadline monitoring

The platform is scoped for MVP (3 regulations) while being architecturally ready for expansion.