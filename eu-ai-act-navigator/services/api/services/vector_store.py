"""
Vector Store Service for EU AI Act Navigator

Stores and retrieves regulatory text from EU AI Act, GDPR, and DORA using semantic search.
"""

import json
import os
import pickle
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np


@dataclass
class Document:
    """Represents a chunk of regulatory text."""
    text: str
    regulation: str  # "EU AI Act", "GDPR", or "DORA"
    article: str  # e.g., "Article 9", "Recital 51", "Annex III Point 5(b)"
    section_type: str  # "article", "recital", "annex"
    metadata: Dict[str, str]  # Additional context
    chunk_id: str  # Unique identifier


@dataclass
class RetrievedPassage:
    """Represents a retrieved passage with relevance score."""
    document: Document
    score: float  # Cosine similarity score (0-1)
    confidence: str  # "high", "medium", or "low"
    url: str  # EUR-Lex URL


class VectorStore:
    """
    Vector store for regulatory documents using embeddings.

    Supports:
    - Text chunking by article/recital/annex
    - Semantic search via embeddings
    - Confidence scoring
    - Source attribution with EUR-Lex links
    """

    def __init__(self, embeddings_dir: str = "data/embeddings"):
        # Resolve path relative to project root (2 levels up from services/api/services)
        if not Path(embeddings_dir).is_absolute():
            # Get project root (assuming this file is in services/api/services/)
            project_root = Path(__file__).parent.parent.parent.parent
            self.embeddings_dir = project_root / embeddings_dir
        else:
            self.embeddings_dir = Path(embeddings_dir)

        self.embeddings_dir.mkdir(parents=True, exist_ok=True)

        self.documents: List[Document] = []
        self.embeddings: Optional[np.ndarray] = None

        # EUR-Lex base URLs
        self.eurlex_urls = {
            "EU AI Act": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
            "GDPR": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679",
            "DORA": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554"
        }

        # Load existing embeddings if available
        self._load_from_disk()

    def parse_and_index_pdfs(self, pdf_dir: str = "data"):
        """
        Parse PDF files and create vector embeddings.

        This should be run once during initialization or when PDFs are updated.
        """
        pdf_dir = Path(pdf_dir)

        # Parse each regulation
        regulations = {
            "AI ACT.pdf": "EU AI Act",
            "GDPR.pdf": "GDPR",
            "DORA.pdf": "DORA"
        }

        for pdf_file, regulation_name in regulations.items():
            pdf_path = pdf_dir / pdf_file
            if not pdf_path.exists():
                print(f"Warning: {pdf_file} not found at {pdf_path}")
                continue

            print(f"Parsing {regulation_name}...")
            documents = self._parse_pdf(str(pdf_path), regulation_name)
            self.documents.extend(documents)
            print(f"  Extracted {len(documents)} chunks from {regulation_name}")

        print(f"\nTotal documents indexed: {len(self.documents)}")

        # Generate embeddings (placeholder for now - will use sentence-transformers or OpenAI)
        self._generate_embeddings()

        # Save to disk
        self._save_to_disk()

    def _parse_pdf(self, pdf_path: str, regulation: str) -> List[Document]:
        """
        Parse a PDF and extract structured chunks.

        Strategy:
        1. Extract full text from PDF
        2. Split by articles/recitals/annexes
        3. Create Document objects with metadata
        """
        import subprocess

        # Extract text using pdftotext
        try:
            result = subprocess.run(
                ["pdftotext", pdf_path, "-"],
                capture_output=True,
                text=True,
                check=True
            )
            full_text = result.stdout
        except subprocess.CalledProcessError as e:
            print(f"Error extracting text from {pdf_path}: {e}")
            return []
        except FileNotFoundError:
            print("Error: pdftotext not found. Install poppler-utils: brew install poppler")
            return []

        documents = []

        # Parse recitals (preamble)
        recitals = self._extract_recitals(full_text, regulation)
        documents.extend(recitals)

        # Parse articles
        articles = self._extract_articles(full_text, regulation)
        documents.extend(articles)

        # Parse annexes
        annexes = self._extract_annexes(full_text, regulation)
        documents.extend(annexes)

        return documents

    def _extract_recitals(self, text: str, regulation: str) -> List[Document]:
        """Extract recitals from preamble."""
        documents = []

        # Recitals are numbered (1), (2), (3) etc. and appear before articles
        # Pattern: "(NUMBER)" followed by text until next "(NUMBER)"
        recital_pattern = r'\((\d+)\)\s+(.+?)(?=\(\d+\)|Article \d+|CHAPTER|$)'
        matches = re.finditer(recital_pattern, text, re.DOTALL)

        for match in matches:
            recital_num = match.group(1)
            recital_text = match.group(2).strip()

            # Only include substantial recitals (> 100 chars)
            if len(recital_text) < 100:
                continue

            # Clean up text
            recital_text = re.sub(r'\s+', ' ', recital_text)
            recital_text = recital_text[:2000]  # Limit length

            documents.append(Document(
                text=recital_text,
                regulation=regulation,
                article=f"Recital {recital_num}",
                section_type="recital",
                metadata={"recital_number": recital_num},
                chunk_id=f"{regulation.lower().replace(' ', '_')}_recital_{recital_num}"
            ))

        return documents

    def _extract_articles(self, text: str, regulation: str) -> List[Document]:
        """Extract articles from main body."""
        documents = []

        # Articles pattern: "Article NUMBER" followed by text
        article_pattern = r'Article\s+(\d+[a-z]?)\s*\n(.+?)(?=Article\s+\d+|ANNEX|CHAPTER|$)'
        matches = re.finditer(article_pattern, text, re.DOTALL | re.IGNORECASE)

        for match in matches:
            article_num = match.group(1)
            article_text = match.group(2).strip()

            # Clean up text
            article_text = re.sub(r'\s+', ' ', article_text)

            # Split long articles into paragraphs
            paragraphs = article_text.split('\n\n')

            for idx, para in enumerate(paragraphs):
                para = para.strip()
                if len(para) < 50:  # Skip very short paragraphs
                    continue

                # Limit paragraph length
                if len(para) > 2000:
                    para = para[:2000] + "..."

                documents.append(Document(
                    text=para,
                    regulation=regulation,
                    article=f"Article {article_num}",
                    section_type="article",
                    metadata={
                        "article_number": article_num,
                        "paragraph": str(idx + 1)
                    },
                    chunk_id=f"{regulation.lower().replace(' ', '_')}_art_{article_num}_para_{idx+1}"
                ))

        return documents

    def _extract_annexes(self, text: str, regulation: str) -> List[Document]:
        """Extract annexes."""
        documents = []

        # Annexes pattern: "ANNEX ROMAN_NUMERAL" or "ANNEX NUMBER"
        annex_pattern = r'ANNEX\s+([IVX]+|\d+)\s*\n(.+?)(?=ANNEX\s+|$)'
        matches = re.finditer(annex_pattern, text, re.DOTALL | re.IGNORECASE)

        for match in matches:
            annex_num = match.group(1)
            annex_text = match.group(2).strip()

            # Clean up text
            annex_text = re.sub(r'\s+', ' ', annex_text)

            # For Annex III (high-risk systems), extract individual points
            if annex_num == "III" and regulation == "EU AI Act":
                points = self._extract_annex_iii_points(annex_text)
                documents.extend(points)
            else:
                # Create single document for annex
                if len(annex_text) > 100:
                    documents.append(Document(
                        text=annex_text[:2000],
                        regulation=regulation,
                        article=f"Annex {annex_num}",
                        section_type="annex",
                        metadata={"annex_number": annex_num},
                        chunk_id=f"{regulation.lower().replace(' ', '_')}_annex_{annex_num}"
                    ))

        return documents

    def _extract_annex_iii_points(self, annex_text: str) -> List[Document]:
        """Extract individual points from Annex III (high-risk AI systems)."""
        documents = []

        # Points are numbered: "1.", "2.", "3." etc.
        point_pattern = r'(\d+)\.\s+(.+?)(?=\d+\.\s+|$)'
        matches = re.finditer(point_pattern, annex_text, re.DOTALL)

        for match in matches:
            point_num = match.group(1)
            point_text = match.group(2).strip()

            # Clean up
            point_text = re.sub(r'\s+', ' ', point_text)

            if len(point_text) < 50:
                continue

            # Extract sub-points (a), (b), (c)
            subpoint_pattern = r'\(([a-z])\)\s+(.+?)(?=\([a-z]\)|$)'
            submatches = list(re.finditer(subpoint_pattern, point_text, re.DOTALL))

            if submatches:
                # Create document for each sub-point
                for submatch in submatches:
                    subpoint_letter = submatch.group(1)
                    subpoint_text = submatch.group(2).strip()
                    subpoint_text = re.sub(r'\s+', ' ', subpoint_text)

                    if len(subpoint_text) < 50:
                        continue

                    documents.append(Document(
                        text=subpoint_text[:2000],
                        regulation="EU AI Act",
                        article=f"Annex III Point {point_num}({subpoint_letter})",
                        section_type="annex",
                        metadata={
                            "annex": "III",
                            "point": point_num,
                            "subpoint": subpoint_letter
                        },
                        chunk_id=f"eu_ai_act_annex_iii_{point_num}{subpoint_letter}"
                    ))
            else:
                # Create document for whole point
                documents.append(Document(
                    text=point_text[:2000],
                    regulation="EU AI Act",
                    article=f"Annex III Point {point_num}",
                    section_type="annex",
                    metadata={
                        "annex": "III",
                        "point": point_num
                    },
                    chunk_id=f"eu_ai_act_annex_iii_{point_num}"
                ))

        return documents

    def _generate_embeddings(self):
        """
        Generate embeddings for all documents using sentence-transformers.

        Uses 'all-MiniLM-L6-v2' model:
        - Fast and lightweight (384 dimensions)
        - Good semantic understanding
        - Works locally without API keys
        - Excellent for regulatory text retrieval
        """
        if not self.documents:
            print("No documents to embed")
            return

        print("Generating semantic embeddings with sentence-transformers...")

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            print("ERROR: sentence-transformers not installed!")
            print("Install with: pip install sentence-transformers")
            print("Falling back to TF-IDF (less accurate)")
            self._generate_tfidf_embeddings()
            return

        # Load pre-trained model (downloads ~90MB on first run)
        print("Loading sentence-transformers model (all-MiniLM-L6-v2)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

        # Generate embeddings for all documents
        texts = [doc.text for doc in self.documents]
        print(f"Encoding {len(texts)} documents...")

        # Batch encoding for efficiency
        self.embeddings = self.model.encode(
            texts,
            batch_size=32,
            show_progress_bar=True,
            convert_to_numpy=True
        )

        print(f"Generated embeddings: {self.embeddings.shape}")
        print("✅ Semantic embeddings ready - supports multilingual and contextual queries")

    def _generate_tfidf_embeddings(self):
        """Fallback to TF-IDF if sentence-transformers not available."""
        from sklearn.feature_extraction.text import TfidfVectorizer

        texts = [doc.text for doc in self.documents]
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.embeddings = self.vectorizer.fit_transform(texts).toarray()

        print(f"⚠️  Using TF-IDF embeddings (less accurate than semantic)")
        print(f"   Install sentence-transformers for better results: pip install sentence-transformers")

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        regulation_filter: Optional[str] = None,
        min_score: float = 0.1
    ) -> List[RetrievedPassage]:
        """
        Retrieve relevant passages for a query using semantic search.

        Args:
            query: User query (supports natural language questions)
            top_k: Number of results to return
            regulation_filter: Optional filter by regulation name
            min_score: Minimum similarity score (0-1)

        Returns:
            List of RetrievedPassage objects with scores and confidence
        """
        if self.embeddings is None or not self.documents:
            return []

        # Generate query embedding
        # Check if using semantic embeddings (sentence-transformers) or TF-IDF
        if hasattr(self, 'model'):
            # Semantic embeddings
            query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
        elif hasattr(self, 'vectorizer'):
            # TF-IDF fallback
            query_embedding = self.vectorizer.transform([query]).toarray()[0]
        else:
            # No embedding model available
            return []

        # Compute cosine similarity
        scores = np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-10
        )

        # Boost scores for regulation mentioned in query
        query_lower = query.lower()
        regulation_boost = 0.3  # Boost amount

        for idx, doc in enumerate(self.documents):
            # Check if query mentions this regulation
            if 'dora' in query_lower and doc.regulation == 'DORA':
                scores[idx] += regulation_boost
            elif 'gdpr' in query_lower and doc.regulation == 'GDPR':
                scores[idx] += regulation_boost
            elif ('ai act' in query_lower or 'eu ai act' in query_lower) and doc.regulation == 'EU AI Act':
                scores[idx] += regulation_boost

            # Boost if article number mentioned
            article_match = re.search(r'article\s+(\d+)', query_lower)
            if article_match:
                article_num = article_match.group(1)
                if f'Article {article_num}' in doc.article:
                    scores[idx] += 0.4  # Strong boost for article number match

        # Get top-k indices after boosting
        top_indices = np.argsort(scores)[::-1]

        results = []
        for idx in top_indices:
            score = scores[idx]

            if score < min_score:
                break

            doc = self.documents[idx]

            # Apply regulation filter
            if regulation_filter and doc.regulation != regulation_filter:
                continue

            # Determine confidence level
            if score >= 0.5:
                confidence = "high"
            elif score >= 0.3:
                confidence = "medium"
            else:
                confidence = "low"

            # Generate EUR-Lex URL
            base_url = self.eurlex_urls.get(doc.regulation, "")
            url = f"{base_url}#{doc.article.replace(' ', '_').lower()}"

            results.append(RetrievedPassage(
                document=doc,
                score=float(score),
                confidence=confidence,
                url=url
            ))

            if len(results) >= top_k:
                break

        return results

    def _save_to_disk(self):
        """Save documents and embeddings to disk."""
        # Save documents as JSON (avoids pickle module path issues)
        docs_path = self.embeddings_dir / "documents.json"
        docs_data = [
            {
                "text": doc.text,
                "regulation": doc.regulation,
                "article": doc.article,
                "section_type": doc.section_type,
                "metadata": doc.metadata,
                "chunk_id": doc.chunk_id
            }
            for doc in self.documents
        ]
        with open(docs_path, 'w', encoding='utf-8') as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)

        # Save embeddings
        if self.embeddings is not None:
            embeddings_path = self.embeddings_dir / "embeddings.npy"
            np.save(embeddings_path, self.embeddings)

        # Save vectorizer
        if hasattr(self, 'vectorizer'):
            vectorizer_path = self.embeddings_dir / "vectorizer.pkl"
            with open(vectorizer_path, 'wb') as f:
                pickle.dump(self.vectorizer, f)

        print(f"Saved embeddings to {self.embeddings_dir}")

    def _load_from_disk(self):
        """Load documents and embeddings from disk if available."""
        docs_path_json = self.embeddings_dir / "documents.json"
        docs_path_pkl = self.embeddings_dir / "documents.pkl"  # Legacy
        embeddings_path = self.embeddings_dir / "embeddings.npy"
        vectorizer_path = self.embeddings_dir / "vectorizer.pkl"

        # Try JSON first (new format), then pickle (legacy)
        if docs_path_json.exists() and embeddings_path.exists():
            print("Loading existing embeddings...")

            try:
                # Load documents from JSON
                with open(docs_path_json, 'r', encoding='utf-8') as f:
                    docs_data = json.load(f)

                self.documents = [
                    Document(
                        text=doc["text"],
                        regulation=doc["regulation"],
                        article=doc["article"],
                        section_type=doc["section_type"],
                        metadata=doc["metadata"],
                        chunk_id=doc["chunk_id"]
                    )
                    for doc in docs_data
                ]

                self.embeddings = np.load(embeddings_path)

                if vectorizer_path.exists():
                    with open(vectorizer_path, 'rb') as f:
                        self.vectorizer = pickle.load(f)

                print(f"Loaded {len(self.documents)} documents with embeddings")
            except Exception as e:
                print(f"⚠️  Error loading embeddings: {e}")
                print("   Rebuild with: python services/api/services/vector_store.py")
                self.documents = []
                self.embeddings = None

        elif docs_path_pkl.exists() and embeddings_path.exists():
            print("⚠️  Found legacy pickle format. Please rebuild embeddings.")
            print("   Run: python services/api/services/vector_store.py")
            self.documents = []
            self.embeddings = None
        else:
            print("No existing embeddings found. Run parse_and_index_pdfs() to create them.")


# Standalone script to build embeddings
if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("EU AI Act Navigator - Vector Store Builder")
    print("=" * 60)
    print()

    store = VectorStore()

    # Check if embeddings already exist
    if store.embeddings is not None:
        response = input("Embeddings already exist. Rebuild? (y/n): ")
        if response.lower() != 'y':
            print("Using existing embeddings.")
            sys.exit(0)

    # Parse and index PDFs
    store.parse_and_index_pdfs()

    print("\n" + "=" * 60)
    print("✅ Vector store built successfully!")
    print("=" * 60)
    print(f"Documents indexed: {len(store.documents)}")
    print(f"Embeddings shape: {store.embeddings.shape if store.embeddings is not None else 'None'}")
    print()

    # Test retrieval
    print("Testing retrieval...")
    results = store.retrieve("What are high-risk AI systems in creditworthiness?", top_k=3)

    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"\n{i}. {result.document.regulation} - {result.document.article}")
        print(f"   Score: {result.score:.3f} | Confidence: {result.confidence}")
        print(f"   Text: {result.document.text[:200]}...")
