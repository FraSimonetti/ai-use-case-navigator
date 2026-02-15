"""
Vector Store Service for EU AI Act Navigator

Stores and retrieves regulatory text from EU AI Act, GDPR, and DORA using semantic search.

Key design principles
─────────────────────
1. Every Document chunk carries a full structural breadcrumb:
   regulation → chapter (title) → section (title) → article (title)

2. When generating embeddings, chunks are prefixed with this breadcrumb so that
   the embedding captures both the *structural position* and the *content* of
   each passage.  This dramatically improves recall for queries like
   "when is an AI system not high-risk?" which maps to Chapter III, Section 1.

3. At retrieval time, the `retrieve()` method applies a secondary relevance
   boost for documents whose chapter/section titles contain terms that appear
   in the query (e.g. "prohibited" → Chapter II boost).

4. The full breadcrumb is returned to the caller so the RAG prompt and the UI
   can show  "EU AI Act › Chapter III › Section 1 › Article 6"  instead of
   just "Article 6".

Rebuilding embeddings
─────────────────────
After changing the parsing or structure maps below, re-index by running:

    python services/api/services/vector_store.py

The script at the bottom of this file handles the rebuild interactively.
"""

import json
import os
import pickle
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np


# ─── Regulatory structure maps ────────────────────────────────────────────────
# Each entry: article_number (int) → (chapter_num, chapter_title, section_num, section_title)
# article_num is matched with >=start and <=end logic in _get_article_context().
# These are authoritative for the final published texts.

_EU_AI_ACT_CHAPTERS: List[Tuple[int, int, str, str, Optional[str], Optional[str]]] = [
    # (art_from, art_to, chapter_num, chapter_title, section_num, section_title)
    (1,  4,  "I",   "General Provisions",                                                None, None),
    (5,  5,  "II",  "Prohibited AI Practices",                                           None, None),
    (6,  7,  "III", "High-Risk AI Systems",                                              "1",  "Classification Rules for High-Risk AI Systems"),
    (8,  15, "III", "High-Risk AI Systems",                                              "2",  "Requirements for High-Risk AI Systems"),
    (16, 27, "III", "High-Risk AI Systems",                                              "3",  "Obligations of Providers and Deployers of High-Risk AI Systems"),
    (28, 39, "III", "High-Risk AI Systems",                                              "4",  "Notifying Authorities and Notified Bodies"),
    (40, 49, "III", "High-Risk AI Systems",                                              "5",  "Standards, Conformity Assessment, Certificates and Registration"),
    (50, 50, "IV",  "Transparency Obligations for Certain AI Systems and GPAI Models",   None, None),
    (51, 56, "V",   "General-Purpose AI Models",                                         None, None),
    (57, 63, "VI",  "Measures in Support of Innovation — AI Regulatory Sandboxes",       None, None),
    (64, 70, "VII", "Governance",                                                        None, None),
    (71, 71, "VIII","EU Database for High-Risk AI Systems",                              None, None),
    (72, 80, "IX",  "Post-Market Monitoring, Information Sharing and Market Surveillance",None, None),
    (81, 88, "X",   "Liability and Penalties",                                           None, None),
    (89, 94, "XI",  "Delegation of Power and Committee Procedure",                       None, None),
    (95, 113,"XII", "Final Provisions",                                                  None, None),
]

_GDPR_CHAPTERS: List[Tuple[int, int, str, str, Optional[str], Optional[str]]] = [
    (1,  4,  "I",   "General Provisions",                                                None, None),
    (5,  11, "II",  "Principles",                                                         None, None),
    (12, 14, "III", "Rights of the Data Subject",                                        "1",  "Transparency and Modalities"),
    (15, 15, "III", "Rights of the Data Subject",                                        "2",  "Information and Access to Personal Data"),
    (16, 20, "III", "Rights of the Data Subject",                                        "3",  "Rectification and Erasure"),
    (21, 22, "III", "Rights of the Data Subject",                                        "4",  "Right to Object and Automated Individual Decision-Making"),
    (23, 23, "III", "Rights of the Data Subject",                                        "5",  "Restrictions"),
    (24, 32, "IV",  "Controller and Processor",                                          "1",  "General Obligations"),
    (33, 34, "IV",  "Controller and Processor",                                          "2",  "Security of Personal Data"),
    (35, 36, "IV",  "Controller and Processor",                                          "3",  "Data Protection Impact Assessment and Prior Consultation"),
    (37, 39, "IV",  "Controller and Processor",                                          "4",  "Data Protection Officer"),
    (40, 43, "IV",  "Controller and Processor",                                          "5",  "Codes of Conduct and Certification"),
    (44, 49, "V",   "Transfers of Personal Data to Third Countries or International Organisations", None, None),
    (50, 59, "VI",  "Independent Supervisory Authorities",                               None, None),
    (60, 76, "VII", "Cooperation and Consistency",                                       None, None),
    (77, 84, "VIII","Remedies, Liability and Penalties",                                 None, None),
    (85, 91, "IX",  "Provisions Relating to Specific Processing Situations",             None, None),
    (92, 99, "X",   "Delegated Acts and Implementing Acts",                              None, None),
]

_DORA_CHAPTERS: List[Tuple[int, int, str, str, Optional[str], Optional[str]]] = [
    (1,  4,  "I",   "General Provisions",                                                None, None),
    (5,  16, "II",  "ICT Risk Management",                                               None, None),
    (17, 23, "III", "ICT-Related Incident Management, Classification and Reporting",     None, None),
    (24, 27, "IV",  "Digital Operational Resilience Testing",                            None, None),
    (28, 44, "V",   "Managing of ICT Third-Party Risk",                                  None, None),
    (45, 56, "VI",  "Information-Sharing Arrangements",                                  None, None),
    (57, 64, "VII", "Competent Authorities",                                             None, None),
    (65, 72, "VIII","Delegated and Implementing Acts",                                   None, None),
]

# Lookup: regulation name → chapter list
_STRUCTURE_MAP = {
    "EU AI Act": _EU_AI_ACT_CHAPTERS,
    "GDPR":      _GDPR_CHAPTERS,
    "DORA":      _DORA_CHAPTERS,
}

# Key article titles for the most important articles in each regulation.
# These appear in the breadcrumb and the embedded text.
_ARTICLE_TITLES: Dict[str, Dict[int, str]] = {
    "EU AI Act": {
        1:  "Subject Matter",
        2:  "Scope",
        3:  "Definitions",
        4:  "AI Literacy",
        5:  "Prohibited AI Practices",
        6:  "Classification Rules for High-Risk AI Systems",
        7:  "Amendments to Annex III",
        8:  "Compliance with Requirements",
        9:  "Risk Management System",
        10: "Data and Data Governance",
        11: "Technical Documentation",
        12: "Record-Keeping and Logging",
        13: "Transparency and Provision of Information to Deployers",
        14: "Human Oversight",
        15: "Accuracy, Robustness and Cybersecurity",
        16: "Obligations of Providers of High-Risk AI Systems",
        17: "Quality Management System",
        18: "Documentation Keeping",
        19: "Automatically Generated Logs",
        20: "Corrective Actions and Duty of Information",
        21: "Cooperation with Competent Authorities",
        22: "Authorised Representatives of Providers",
        23: "Obligations of Importers",
        24: "Obligations of Distributors",
        25: "Responsibilities along the AI Value Chain",
        26: "Obligations of Deployers of High-Risk AI Systems",
        27: "Obligations of Fundamental Rights Impact Assessment",
        43: "Conformity Assessment",
        47: "EU Declaration of Conformity",
        49: "Registration",
        50: "Transparency Obligations for Certain AI Systems",
        51: "Classification of GPAI Models as GPAI Models with Systemic Risk",
        52: "Obligations for Providers of GPAI Models",
        53: "Obligations of Providers of GPAI Models with Systemic Risk",
        54: "Qualified Presumption for GPAI Models with Systemic Risk",
        55: "Obligations of Deployers of GPAI Models",
        56: "Codes of Practice",
        95: "Codes of Conduct for Voluntary Application",
        96: "Guidelines",
        113:"Entry into Force and Application",
    },
    "GDPR": {
        1:  "Subject-Matter and Objectives",
        2:  "Material Scope",
        3:  "Territorial Scope",
        4:  "Definitions",
        5:  "Principles Relating to Processing of Personal Data",
        6:  "Lawfulness of Processing",
        7:  "Conditions for Consent",
        9:  "Processing of Special Categories of Personal Data",
        12: "Transparent Information, Communication and Modalities",
        13: "Information to Be Provided Where Personal Data Are Collected from the Data Subject",
        14: "Information to Be Provided Where Personal Data Have Not Been Obtained from the Data Subject",
        15: "Right of Access by the Data Subject",
        16: "Right to Rectification",
        17: "Right to Erasure ('Right to Be Forgotten')",
        18: "Right to Restriction of Processing",
        20: "Right to Data Portability",
        21: "Right to Object",
        22: "Automated Individual Decision-Making, Including Profiling",
        24: "Responsibility of the Controller",
        25: "Data Protection by Design and by Default",
        28: "Processor",
        30: "Records of Processing Activities",
        32: "Security of Processing",
        33: "Notification of a Personal Data Breach to the Supervisory Authority",
        34: "Communication of a Personal Data Breach to the Data Subject",
        35: "Data Protection Impact Assessment",
        36: "Prior Consultation",
        37: "Designation of the Data Protection Officer",
        44: "General Principle for Transfers",
        46: "Transfers Subject to Appropriate Safeguards",
        83: "General Conditions for Imposing Administrative Fines",
    },
    "DORA": {
        1:  "Subject Matter",
        2:  "Scope",
        3:  "Definitions",
        4:  "Proportionality Principle",
        5:  "ICT Risk Management Framework",
        6:  "ICT Systems, Protocols and Tools",
        7:  "ICT Systems and Tools Management Policies",
        8:  "Identification",
        9:  "Protection and Prevention",
        10: "Detection",
        11: "Response and Recovery",
        12: "Backup Policies and Recovery Procedures",
        13: "Learning and Evolving",
        14: "Communication",
        15: "Further Harmonisation of ICT Risk Management Tools, Methods, Processes and Policies",
        16: "Simplified ICT Risk Management Framework",
        17: "ICT-Related Incident Management Process",
        18: "Classification of ICT-Related Incidents and Cyber Threats",
        19: "Reporting of Major ICT-Related Incidents and Voluntary Notification",
        20: "Harmonisation of Reporting Content and Templates",
        21: "Centralised Reporting",
        24: "General Requirements for Digital Operational Resilience Testing",
        25: "Testing of ICT Tools and Systems",
        26: "Advanced Testing of ICT Tools, Systems and Processes Based on TLPT",
        28: "General Principles of Sound Management of ICT Third-Party Risk",
        30: "Key Contractual Provisions",
        31: "Preliminary Assessment of ICT Concentration Risk",
        32: "Framework for the Oversight of Critical ICT Third-Party Service Providers",
        45: "Information-Sharing Arrangements on Cyber Threat Information and Intelligence",
    },
}


def _get_article_context(
    article_num_str: str,
    regulation: str,
) -> Dict[str, str]:
    """
    Return chapter/section/title metadata for a given article number and regulation.

    Returns a dict with keys:
      chapter_num, chapter_title, section_num, section_title, article_title
    Any key missing from the static maps is returned as an empty string.
    """
    try:
        art_num = int(re.match(r"(\d+)", article_num_str).group(1))
    except (AttributeError, ValueError):
        return {}

    ctx: Dict[str, str] = {
        "chapter_num":   "",
        "chapter_title": "",
        "section_num":   "",
        "section_title": "",
        "article_title": "",
    }

    chapters = _STRUCTURE_MAP.get(regulation, [])
    for art_from, art_to, chap_num, chap_title, sec_num, sec_title in chapters:
        if art_from <= art_num <= art_to:
            ctx["chapter_num"]   = chap_num
            ctx["chapter_title"] = chap_title
            ctx["section_num"]   = sec_num or ""
            ctx["section_title"] = sec_title or ""
            break

    titles = _ARTICLE_TITLES.get(regulation, {})
    ctx["article_title"] = titles.get(art_num, "")

    return ctx


def _build_breadcrumb(doc_metadata: Dict[str, str], regulation: str, article: str) -> str:
    """
    Build a human-readable breadcrumb string like:
    "EU AI Act › Chapter III: High-Risk AI Systems › Section 1: Classification Rules › Article 6: Classification Rules for High-Risk AI Systems"
    """
    parts = [regulation]

    chap_num   = doc_metadata.get("chapter_num", "")
    chap_title = doc_metadata.get("chapter_title", "")
    sec_num    = doc_metadata.get("section_num", "")
    sec_title  = doc_metadata.get("section_title", "")
    art_title  = doc_metadata.get("article_title", "")

    if chap_num and chap_title:
        parts.append(f"Chapter {chap_num}: {chap_title}")
    if sec_num and sec_title:
        parts.append(f"Section {sec_num}: {sec_title}")

    article_label = article
    if art_title:
        article_label = f"{article}: {art_title}"
    parts.append(article_label)

    return " › ".join(parts)


def _build_enriched_text(
    raw_text: str,
    regulation: str,
    article: str,
    metadata: Dict[str, str],
) -> str:
    """
    Prepend structural context to the raw chunk text before embedding.

    Example prefix:
      [EU AI Act] [Chapter III: High-Risk AI Systems]
      [Section 1: Classification Rules for High-Risk AI Systems]
      [Article 6: Classification Rules for High-Risk AI Systems]

    This ensures the embedding captures both the structural position and the
    content so that queries about chapter topics retrieve the right articles.
    """
    lines = [f"[{regulation}]"]

    chap_num   = metadata.get("chapter_num", "")
    chap_title = metadata.get("chapter_title", "")
    sec_num    = metadata.get("section_num", "")
    sec_title  = metadata.get("section_title", "")
    art_title  = metadata.get("article_title", "")

    if chap_num and chap_title:
        lines.append(f"[Chapter {chap_num}: {chap_title}]")
    if sec_num and sec_title:
        lines.append(f"[Section {sec_num}: {sec_title}]")

    article_tag = f"[{article}]"
    if art_title:
        article_tag = f"[{article}: {art_title}]"
    lines.append(article_tag)

    prefix = " ".join(lines)
    return f"{prefix}\n{raw_text}"


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class Document:
    """Represents a chunk of regulatory text with full structural context."""
    text: str                    # Raw regulatory text (for display)
    regulation: str              # "EU AI Act", "GDPR", or "DORA"
    article: str                 # e.g., "Article 9", "Recital 51", "Annex III Point 5(b)"
    section_type: str            # "article", "recital", "annex"
    metadata: Dict[str, str]     # chapter_num, chapter_title, section_num, section_title, article_title, …
    chunk_id: str                # Unique identifier
    breadcrumb: str = field(default="")  # Human-readable structural path (derived)


@dataclass
class RetrievedPassage:
    """Represents a retrieved passage with relevance score and structural context."""
    document: Document
    score: float        # Cosine similarity score (0-1), after boosting
    confidence: str     # "high", "medium", or "low"
    url: str            # EUR-Lex URL


# ─── Vector store ─────────────────────────────────────────────────────────────

class VectorStore:
    """
    Vector store for regulatory documents using enriched embeddings.

    Improvements over the previous version
    ───────────────────────────────────────
    - Every chunk carries chapter/section/article title metadata.
    - Embeddings are generated from *enriched* text (breadcrumb prefix + raw
      text) so structural context is captured in the vector space.
    - Retrieval applies a chapter/section title boost: if query terms overlap
      with chapter or section title words the corresponding documents score
      higher.
    - Existing documents.json is automatically migrated on load to add
      chapter/section metadata without requiring a full rebuild.
    """

    def __init__(self, embeddings_dir: str = "data/embeddings"):
        if not Path(embeddings_dir).is_absolute():
            project_root = Path(__file__).parent.parent.parent.parent
            self.embeddings_dir = project_root / embeddings_dir
        else:
            self.embeddings_dir = Path(embeddings_dir)

        self.embeddings_dir.mkdir(parents=True, exist_ok=True)

        self.documents: List[Document] = []
        self.embeddings: Optional[np.ndarray] = None
        self.model = None
        self.vectorizer = None
        self._encoder_load_attempted = False

        # EUR-Lex base URLs
        self.eurlex_urls = {
            "EU AI Act": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689",
            "GDPR":      "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679",
            "DORA":      "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554",
        }

        self._load_from_disk()

    def _ensure_query_encoder(self) -> bool:
        """
        Ensure we have a query encoder available at retrieval time.

        Priority:
        1. Loaded sentence-transformers model (dimension-compatible)
        2. Loaded TF-IDF vectorizer (dimension-compatible)
        3. Lazy-load sentence-transformers model matching stored embeddings
        4. Runtime TF-IDF rebuild as safe fallback
        """
        target_dim = self._embedding_dimension()

        if self.model is not None:
            try:
                model_dim = self._model_dimension(self.model)
                if target_dim is None or model_dim == target_dim:
                    return True
                print(
                    "⚠️  Warning: sentence-transformers query dimension "
                    f"({model_dim}) does not match stored embeddings ({target_dim})."
                )
                self.model = None
            except Exception as e:
                print(f"⚠️  Warning: existing sentence-transformers model unavailable: {e}")
                self.model = None

        if self.vectorizer is not None:
            vectorizer_dim = self._vectorizer_dimension()
            if target_dim is None or vectorizer_dim is None or vectorizer_dim == target_dim:
                return True
            print(
                "⚠️  Warning: TF-IDF vectorizer dimension "
                f"({vectorizer_dim}) does not match stored embeddings ({target_dim})."
            )
            self.vectorizer = None

        if not self._encoder_load_attempted:
            self._encoder_load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer

                candidate = SentenceTransformer("all-MiniLM-L6-v2")
                model_dim = self._model_dimension(candidate)
                if target_dim is None or model_dim == target_dim:
                    self.model = candidate
                    print("Loaded sentence-transformers query encoder: all-MiniLM-L6-v2")
                    return True
                print(
                    "⚠️  Warning: loaded sentence-transformers query dimension "
                    f"({model_dim}) does not match stored embeddings ({target_dim})."
                )
            except Exception as e:
                print(f"⚠️  Warning: unable to load sentence-transformers query encoder: {e}")

        return self._rebuild_tfidf_runtime()

    def _embedding_dimension(self) -> Optional[int]:
        if self.embeddings is None:
            return None
        if self.embeddings.ndim == 1:
            return int(self.embeddings.shape[0])
        if self.embeddings.ndim >= 2:
            return int(self.embeddings.shape[1])
        return None

    def _model_dimension(self, model) -> int:
        get_dim = getattr(model, "get_sentence_embedding_dimension", None)
        if callable(get_dim):
            dim = get_dim()
            if dim:
                return int(dim)
        probe = model.encode(["dimension probe"], convert_to_numpy=True)[0]
        return int(probe.shape[0])

    def _vectorizer_dimension(self) -> Optional[int]:
        if self.vectorizer is None:
            return None
        if hasattr(self.vectorizer, "vocabulary_") and self.vectorizer.vocabulary_:
            return int(len(self.vectorizer.vocabulary_))
        try:
            return int(self.vectorizer.transform(["dimension probe"]).shape[1])
        except Exception:
            return None

    def _rebuild_tfidf_runtime(self) -> bool:
        """
        Ensure retrieval still works when persisted embeddings and query encoders
        are incompatible (for example semantic vectors + legacy TF-IDF pickle).
        """
        if not self.documents:
            return False

        try:
            print(
                "⚠️  Rebuilding TF-IDF embeddings in memory to realign query and "
                "document vector dimensions."
            )
            self.model = None
            self._generate_tfidf_embeddings()
            self._init_bm25()
            return self.vectorizer is not None and self.embeddings is not None
        except Exception as e:
            print(f"⚠️  Failed to rebuild TF-IDF embeddings at runtime: {e}")
            return False

    # ── Public API ──────────────────────────────────────────────────────────

    def parse_and_index_pdfs(self, pdf_dir: str = "data") -> None:
        """Parse regulation PDFs and build enriched vector embeddings."""
        pdf_dir_path = Path(pdf_dir)

        regulations = [
            ("EU AI Act", ["AI ACT.pdf", "raw/eu-ai-act/AI ACT.pdf"]),
            ("GDPR", ["GDPR.pdf", "raw/gdpr/GDPR.pdf"]),
            ("DORA", ["DORA.pdf", "raw/dora/DORA.pdf"]),
        ]

        self.documents = []

        for regulation_name, candidate_paths in regulations:
            pdf_path = None
            for candidate in candidate_paths:
                candidate_path = pdf_dir_path / candidate
                if candidate_path.exists():
                    pdf_path = candidate_path
                    break

            if pdf_path is None:
                print(
                    f"Warning: no PDF found for {regulation_name}. "
                    f"Tried: {', '.join(str(pdf_dir_path / c) for c in candidate_paths)}"
                )
                continue

            print(f"Parsing {regulation_name}...")
            docs = self._parse_pdf(str(pdf_path), regulation_name)
            self.documents.extend(docs)
            print(f"  Extracted {len(docs)} chunks from {regulation_name}")

        print(f"\nTotal documents indexed: {len(self.documents)}")
        self._generate_embeddings()
        self._init_bm25()
        self._save_to_disk()

    def retrieve(
        self,
        query: str,
        top_k: int = 7,
        regulation_filter: Optional[str] = None,
        min_score: float = 0.05,
    ) -> List[RetrievedPassage]:
        """
        Retrieve relevant passages using cosine similarity + multi-signal boosting.

        Boosting hierarchy (additive, applied after base similarity):
          1. Regulation mention in query         +0.30
          2. Exact article number in query       +0.40
          3. Chapter title word overlap          +0.05 per matching content word
          4. Section title word overlap          +0.08 per matching content word
        """
        if self.embeddings is None or not self.documents:
            return []

        # Encode query
        if not self._ensure_query_encoder():
            return []

        if self.model is not None:
            query_embedding = self.model.encode([query], convert_to_numpy=True)[0]
        elif self.vectorizer is not None:
            query_embedding = self.vectorizer.transform([query]).toarray()[0]
        else:
            return []

        # Base cosine similarity
        norms = np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding) + 1e-10
        semantic_scores = np.dot(self.embeddings, query_embedding) / norms

        # Hybrid BM25 + semantic scoring (0.6 semantic + 0.4 BM25)
        if getattr(self, "bm25", None) is not None:
            bm25_raw = np.array(self.bm25.get_scores(query.lower().split()), dtype=float)
            bm25_max = bm25_raw.max()
            bm25_norm = bm25_raw / bm25_max if bm25_max > 0 else bm25_raw
            scores = 0.6 * semantic_scores + 0.4 * bm25_norm
        else:
            scores = semantic_scores

        query_lower = query.lower()

        # Pre-compute chapter/section boost tokens from the query once
        # (stop words filtered so "the", "of", etc. don't generate false boosts)
        _stop = {
            "the", "a", "an", "of", "for", "and", "or", "to", "in", "on",
            "is", "are", "be", "by", "with", "this", "that", "it", "at",
            "as", "from", "which", "when", "not", "does", "do", "have",
        }
        query_words = {
            w for w in re.findall(r"[a-z]+", query_lower) if len(w) > 3 and w not in _stop
        }

        # Pre-extract article number(s) from query for exact-article boost
        # Use word boundary \b so "Article 6" does not match "Article 60"
        article_nums_in_query = set(re.findall(r"article\s+(\d+)\b", query_lower))

        for idx, doc in enumerate(self.documents):
            # ── 1. Regulation boost
            if "dora" in query_lower and doc.regulation == "DORA":
                scores[idx] += 0.30
            elif "gdpr" in query_lower and doc.regulation == "GDPR":
                scores[idx] += 0.30
            elif (
                "ai act" in query_lower or "eu ai act" in query_lower
            ) and doc.regulation == "EU AI Act":
                scores[idx] += 0.30

            # ── 2. Exact article number boost
            art_match = re.match(r"Article\s+(\d+)", doc.article)
            if art_match and art_match.group(1) in article_nums_in_query:
                scores[idx] += 0.40

            # ── 3. Chapter title word overlap boost
            chap_title = doc.metadata.get("chapter_title", "").lower()
            chap_words = {
                w for w in re.findall(r"[a-z]+", chap_title) if len(w) > 3 and w not in _stop
            }
            chap_overlap = len(query_words & chap_words)
            if chap_overlap:
                scores[idx] += 0.05 * chap_overlap

            # ── 4. Section title word overlap boost
            sec_title = doc.metadata.get("section_title", "").lower()
            sec_words = {
                w for w in re.findall(r"[a-z]+", sec_title) if len(w) > 3 and w not in _stop
            }
            sec_overlap = len(query_words & sec_words)
            if sec_overlap:
                scores[idx] += 0.08 * sec_overlap

        # Sort descending
        top_indices = np.argsort(scores)[::-1]

        results: List[RetrievedPassage] = []
        for idx in top_indices:
            score = float(scores[idx])
            if score < min_score:
                break

            doc = self.documents[idx]

            if regulation_filter and doc.regulation != regulation_filter:
                continue

            confidence = (
                "high"   if score >= 0.5 else
                "medium" if score >= 0.3 else
                "low"
            )

            base_url = self.eurlex_urls.get(doc.regulation, "")
            url = f"{base_url}#{doc.article.replace(' ', '_').lower()}"

            results.append(RetrievedPassage(
                document=doc,
                score=score,
                confidence=confidence,
                url=url,
            ))

            if len(results) >= top_k:
                break

        return results

    # ── PDF parsing ─────────────────────────────────────────────────────────

    def _parse_pdf(self, pdf_path: str, regulation: str) -> List[Document]:
        """Extract text from PDF and parse into structured Document chunks."""
        import subprocess

        try:
            result = subprocess.run(
                ["pdftotext", pdf_path, "-"],
                capture_output=True,
                text=True,
                check=True,
            )
            full_text = result.stdout
        except subprocess.CalledProcessError as e:
            print(f"Error extracting text from {pdf_path}: {e}")
            return []
        except FileNotFoundError:
            print("Error: pdftotext not found. Install with: brew install poppler")
            return []

        docs: List[Document] = []
        docs.extend(self._extract_recitals(full_text, regulation))
        docs.extend(self._extract_articles(full_text, regulation))
        docs.extend(self._extract_annexes(full_text, regulation))
        return docs

    def _extract_recitals(self, text: str, regulation: str) -> List[Document]:
        """Extract numbered recitals from the preamble."""
        documents: List[Document] = []

        # Pattern: "(NUMBER)" followed by substantive text
        pattern = r"\((\d+)\)\s+(.+?)(?=\(\d+\)|Article\s+\d+|CHAPTER|$)"
        for match in re.finditer(pattern, text, re.DOTALL):
            recital_num = match.group(1)
            raw = re.sub(r"\s+", " ", match.group(2).strip())

            if len(raw) < 100:
                continue

            raw = raw[:2000]
            metadata: Dict[str, str] = {
                "recital_number": recital_num,
                "chapter_num":    "Preamble",
                "chapter_title":  "Recitals",
                "section_num":    "",
                "section_title":  "",
                "article_title":  f"Recital {recital_num}",
            }
            breadcrumb = f"{regulation} › Preamble › Recital {recital_num}"

            documents.append(Document(
                text=raw,
                regulation=regulation,
                article=f"Recital {recital_num}",
                section_type="recital",
                metadata=metadata,
                chunk_id=f"{regulation.lower().replace(' ', '_')}_recital_{recital_num}",
                breadcrumb=breadcrumb,
            ))

        return documents

    def _extract_articles(self, text: str, regulation: str) -> List[Document]:
        """
        Extract article chunks, each enriched with chapter/section/title metadata.

        Chunks are split at paragraph boundaries within the article so that each
        chunk is focused and the embedding stays within a useful length.
        """
        documents: List[Document] = []

        pattern = r"Article\s+(\d+[a-z]?)\s*\n(.+?)(?=Article\s+\d+|ANNEX|CHAPTER|$)"
        for match in re.finditer(pattern, text, re.DOTALL | re.IGNORECASE):
            article_num = match.group(1)
            # IMPORTANT: preserve whitespace structure for paragraph splitting
            # Do NOT normalize before splitting — collapsing \n\n prevents paragraph detection
            raw_body = match.group(2).strip()

            ctx = _get_article_context(article_num, regulation)

            # Split long articles into paragraph-sized chunks.
            # Try progressively coarser patterns until we get multiple chunks.
            paragraphs = [p for p in raw_body.split("\n\n") if p.strip()]
            if len(paragraphs) <= 1:
                # Try numbered-paragraph split: "1. text  2. text" or "\n1. "
                paragraphs = [p for p in re.split(r"\s+\d+\.\s+", raw_body) if p.strip()]
            if len(paragraphs) <= 1:
                # Fall back to ≥2 spaces following a period on the (now-normalized) text
                normalized_body = re.sub(r"\s+", " ", raw_body)
                paragraphs = [p for p in re.split(r"(?<=\.)\s{2,}", normalized_body) if p.strip()]
            if len(paragraphs) <= 1:
                # No structure found — use the whole article as one chunk (normalized)
                paragraphs = [re.sub(r"\s+", " ", raw_body)]

            reg_key = regulation.lower().replace(" ", "_")
            # Zero-pad article number to 3 chars so "art_006" sorts/compares before "art_060"
            art_padded = re.sub(r"(\d+)", lambda m: m.group(1).zfill(3), article_num)

            for idx, para in enumerate(paragraphs):
                # Normalize each paragraph individually after splitting
                para = re.sub(r"\s+", " ", para).strip()
                if len(para) < 50:
                    continue
                if len(para) > 2000:
                    para = para[:2000] + "…"

                metadata: Dict[str, str] = {
                    "article_number": article_num,
                    "paragraph":      str(idx + 1),
                    **ctx,
                }

                breadcrumb = _build_breadcrumb(metadata, regulation, f"Article {article_num}")

                documents.append(Document(
                    text=para,
                    regulation=regulation,
                    article=f"Article {article_num}",
                    section_type="article",
                    metadata=metadata,
                    chunk_id=f"{reg_key}_art_{art_padded}_para_{idx + 1}",
                    breadcrumb=breadcrumb,
                ))

        return documents

    def _extract_annexes(self, text: str, regulation: str) -> List[Document]:
        """Extract annexes; Annex III of the EU AI Act is parsed to sub-point level."""
        documents: List[Document] = []

        pattern = r"ANNEX\s+([IVX]+|\d+)\s*\n(.+?)(?=ANNEX\s+|$)"
        for match in re.finditer(pattern, text, re.DOTALL | re.IGNORECASE):
            annex_num = match.group(1)
            annex_text = re.sub(r"\s+", " ", match.group(2).strip())

            if regulation == "EU AI Act" and annex_num == "III":
                documents.extend(self._extract_annex_iii_points(annex_text))
            else:
                if len(annex_text) < 100:
                    continue
                metadata: Dict[str, str] = {
                    "annex_number":  annex_num,
                    "chapter_num":   "Annex",
                    "chapter_title": f"Annex {annex_num}",
                    "section_num":   "",
                    "section_title": "",
                    "article_title": f"Annex {annex_num}",
                }
                breadcrumb = f"{regulation} › Annex {annex_num}"
                documents.append(Document(
                    text=annex_text[:2000],
                    regulation=regulation,
                    article=f"Annex {annex_num}",
                    section_type="annex",
                    metadata=metadata,
                    chunk_id=f"{regulation.lower().replace(' ', '_')}_annex_{annex_num}",
                    breadcrumb=breadcrumb,
                ))

        return documents

    def _extract_annex_iii_points(self, annex_text: str) -> List[Document]:
        """
        Extract individual numbered points (and their sub-points) from Annex III.
        Annex III lists the high-risk AI system categories — granular chunking
        ensures each category is individually retrievable.
        """
        # Annex III titles per point number
        _ANNEX_III_POINT_TITLES = {
            "1": "Biometric Identification and Categorisation of Natural Persons",
            "2": "Management and Operation of Critical Infrastructure",
            "3": "Education and Vocational Training",
            "4": "Employment, Workers Management and Access to Self-Employment",
            "5": "Access to and Enjoyment of Essential Private Services and Essential Public Services and Benefits",
            "6": "Law Enforcement",
            "7": "Migration, Asylum and Border Control Management",
            "8": "Administration of Justice and Democratic Processes",
        }

        documents: List[Document] = []
        point_pattern = r"(\d+)\.\s+(.+?)(?=\d+\.\s+|$)"

        for match in re.finditer(point_pattern, annex_text, re.DOTALL):
            point_num = match.group(1)
            point_text = re.sub(r"\s+", " ", match.group(2).strip())

            if len(point_text) < 50:
                continue

            point_title = _ANNEX_III_POINT_TITLES.get(point_num, f"Point {point_num}")

            # Extract sub-points (a), (b), …
            subpoint_pattern = r"\(([a-z])\)\s+(.+?)(?=\([a-z]\)|$)"
            submatches = list(re.finditer(subpoint_pattern, point_text, re.DOTALL))

            if submatches:
                for sub in submatches:
                    sub_letter = sub.group(1)
                    sub_text = re.sub(r"\s+", " ", sub.group(2).strip())[:2000]
                    if len(sub_text) < 50:
                        continue

                    article_label = f"Annex III Point {point_num}({sub_letter})"
                    metadata: Dict[str, str] = {
                        "annex":         "III",
                        "point":         point_num,
                        "subpoint":      sub_letter,
                        "chapter_num":   "Annex III",
                        "chapter_title": "List of High-Risk AI Systems referred to in Article 6(2)",
                        "section_num":   point_num,
                        "section_title": point_title,
                        "article_title": f"Point {point_num}({sub_letter})",
                    }
                    breadcrumb = (
                        f"EU AI Act › Annex III: List of High-Risk AI Systems › "
                        f"Point {point_num}: {point_title} › Sub-point ({sub_letter})"
                    )
                    documents.append(Document(
                        text=sub_text,
                        regulation="EU AI Act",
                        article=article_label,
                        section_type="annex",
                        metadata=metadata,
                        chunk_id=f"eu_ai_act_annex_iii_{point_num}{sub_letter}",
                        breadcrumb=breadcrumb,
                    ))
            else:
                article_label = f"Annex III Point {point_num}"
                metadata = {
                    "annex":         "III",
                    "point":         point_num,
                    "chapter_num":   "Annex III",
                    "chapter_title": "List of High-Risk AI Systems referred to in Article 6(2)",
                    "section_num":   point_num,
                    "section_title": point_title,
                    "article_title": f"Point {point_num}",
                }
                breadcrumb = (
                    f"EU AI Act › Annex III: List of High-Risk AI Systems › "
                    f"Point {point_num}: {point_title}"
                )
                documents.append(Document(
                    text=point_text[:2000],
                    regulation="EU AI Act",
                    article=article_label,
                    section_type="annex",
                    metadata=metadata,
                    chunk_id=f"eu_ai_act_annex_iii_{point_num}",
                    breadcrumb=breadcrumb,
                ))

        return documents

    # ── Embedding generation ─────────────────────────────────────────────────

    def _enriched_texts_for_embedding(self) -> List[str]:
        """
        Build enriched text strings for embedding.

        Each string = breadcrumb prefix + raw article text.
        The prefix bakes chapter/section/article-title semantics into the
        embedding so that chapter-level queries retrieve the right articles.
        """
        texts = []
        for doc in self.documents:
            enriched = _build_enriched_text(
                raw_text=doc.text,
                regulation=doc.regulation,
                article=doc.article,
                metadata=doc.metadata,
            )
            texts.append(enriched)
        return texts

    def _generate_embeddings(self) -> None:
        """Generate embeddings using sentence-transformers (falls back to TF-IDF)."""
        if not self.documents:
            print("No documents to embed.")
            return

        texts = self._enriched_texts_for_embedding()

        print("Generating semantic embeddings with sentence-transformers...")
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            print("sentence-transformers not installed — falling back to TF-IDF.")
            print("Install with: pip install sentence-transformers")
            self._generate_tfidf_embeddings(texts)
            return

        print("Loading model: all-MiniLM-L6-v2 …")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        print(f"Encoding {len(texts)} enriched document texts …")
        self.embeddings = self.model.encode(
            texts,
            batch_size=32,
            show_progress_bar=True,
            convert_to_numpy=True,
        )
        print(f"Embeddings shape: {self.embeddings.shape}")
        print("✅ Enriched semantic embeddings ready.")

    def _generate_tfidf_embeddings(self, texts: Optional[List[str]] = None) -> None:
        """TF-IDF fallback — also uses enriched texts."""
        from sklearn.feature_extraction.text import TfidfVectorizer

        if texts is None:
            texts = self._enriched_texts_for_embedding()

        self.vectorizer = TfidfVectorizer(
            max_features=5000,   # Increased from 1000 to capture more regulatory vocabulary
            stop_words="english",
            ngram_range=(1, 2),  # Bigrams capture "high-risk", "data governance", etc.
            sublinear_tf=True,   # Log-normalise term frequency
        )
        self.embeddings = self.vectorizer.fit_transform(texts).toarray()
        print(f"TF-IDF embeddings shape: {self.embeddings.shape}")
        print("⚠️  Using TF-IDF — install sentence-transformers for better accuracy.")

    # ── Persistence ──────────────────────────────────────────────────────────

    def _save_to_disk(self) -> None:
        """Persist documents (JSON) and embeddings (numpy) to disk."""
        docs_path = self.embeddings_dir / "documents.json"
        docs_data = [
            {
                "text":         doc.text,
                "regulation":   doc.regulation,
                "article":      doc.article,
                "section_type": doc.section_type,
                "metadata":     doc.metadata,
                "chunk_id":     doc.chunk_id,
                # Always persist a valid breadcrumb; rebuild it if missing
                "breadcrumb":   (
                    doc.breadcrumb
                    or _build_breadcrumb(doc.metadata, doc.regulation, doc.article)
                ),
            }
            for doc in self.documents
        ]
        with open(docs_path, "w", encoding="utf-8") as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)

        if self.embeddings is not None:
            np.save(self.embeddings_dir / "embeddings.npy", self.embeddings)

        if getattr(self, "vectorizer", None) is not None:
            with open(self.embeddings_dir / "vectorizer.pkl", "wb") as f:
                pickle.dump(self.vectorizer, f)

        print(f"Saved to {self.embeddings_dir}")

    def _load_from_disk(self) -> None:
        """
        Load existing embeddings from disk.

        Migration: if loaded documents lack chapter/section metadata, enrich
        them using the static structure maps so retrieval boosting works
        immediately without a full rebuild.
        """
        docs_path     = self.embeddings_dir / "documents.json"
        legacy_path   = self.embeddings_dir / "documents.pkl"
        embeddings_path = self.embeddings_dir / "embeddings.npy"
        vectorizer_path = self.embeddings_dir / "vectorizer.pkl"

        if docs_path.exists() and embeddings_path.exists():
            print("Loading existing embeddings …")
            try:
                with open(docs_path, "r", encoding="utf-8") as f:
                    docs_data = json.load(f)

                migrated = 0
                self.documents = []
                for d in docs_data:
                    metadata = d.get("metadata", {})

                    # ── Migrate: add chapter/section/article_title if missing ──
                    needs_migration = "chapter_title" not in metadata
                    if needs_migration and d["section_type"] == "article":
                        art_match = re.match(r"Article\s+(\d+)", d["article"])
                        if art_match:
                            ctx = _get_article_context(art_match.group(1), d["regulation"])
                            metadata.update(ctx)
                            migrated += 1

                    breadcrumb = d.get("breadcrumb", "")
                    if not breadcrumb:
                        breadcrumb = _build_breadcrumb(metadata, d["regulation"], d["article"])

                    self.documents.append(Document(
                        text=d["text"],
                        regulation=d["regulation"],
                        article=d["article"],
                        section_type=d["section_type"],
                        metadata=metadata,
                        chunk_id=d["chunk_id"],
                        breadcrumb=breadcrumb,
                    ))

                self.embeddings = np.load(embeddings_path)

                if vectorizer_path.exists():
                    try:
                        with open(vectorizer_path, "rb") as f:
                            self.vectorizer = pickle.load(f)
                    except Exception as vectorizer_error:
                        # Keep semantic embeddings usable even if legacy TF-IDF
                        # pickle files are incompatible with current NumPy.
                        self.vectorizer = None
                        print(f"⚠️  Warning: could not load vectorizer.pkl: {vectorizer_error}")
                        print("   Continuing with semantic embeddings only.")

                if migrated:
                    print(f"  Migrated {migrated} documents with chapter/section metadata.")
                    # Persist the enriched metadata so the migration runs only once
                    self._save_to_disk_metadata_only()

                # Build BM25 index for hybrid retrieval
                self._init_bm25()

                print(f"Loaded {len(self.documents)} documents.")

            except Exception as e:
                print(f"⚠️  Error loading embeddings: {e}")
                print("   Rebuild with: python services/api/services/vector_store.py")
                self.documents = []
                self.embeddings = None

        elif legacy_path.exists() and embeddings_path.exists():
            print("⚠️  Legacy pickle format detected — rebuild required.")
            print("   Run: python services/api/services/vector_store.py")
        else:
            print("No embeddings found. Run parse_and_index_pdfs() to create them.")

    def _init_bm25(self) -> None:
        """
        Initialise a BM25 index over the loaded documents for hybrid retrieval.

        Requires the ``rank_bm25`` package (``pip install rank-bm25``).
        Silently skips if the package is not installed — the retriever falls
        back to pure semantic similarity in that case.
        """
        try:
            from rank_bm25 import BM25Okapi
            corpus = [doc.text.lower().split() for doc in self.documents]
            self.bm25 = BM25Okapi(corpus)
        except ImportError:
            self.bm25 = None

    def _save_to_disk_metadata_only(self) -> None:
        """Save only documents.json (not embeddings) — used during metadata migration."""
        docs_path = self.embeddings_dir / "documents.json"
        docs_data = [
            {
                "text":         doc.text,
                "regulation":   doc.regulation,
                "article":      doc.article,
                "section_type": doc.section_type,
                "metadata":     doc.metadata,
                "chunk_id":     doc.chunk_id,
                "breadcrumb":   doc.breadcrumb,
            }
            for doc in self.documents
        ]
        with open(docs_path, "w", encoding="utf-8") as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)


# ─── RAG prompt helper ────────────────────────────────────────────────────────

def format_passage_for_prompt(passage: RetrievedPassage, index: int) -> str:
    """
    Format a retrieved passage for inclusion in the RAG system prompt.
    Includes full breadcrumb so the LLM sees structural context.
    """
    doc = passage.document
    breadcrumb = doc.breadcrumb or f"{doc.regulation} › {doc.article}"

    return (
        f"### SOURCE {index}: {breadcrumb}\n"
        f"**Relevance:** {passage.score:.2f} | **Confidence:** {passage.confidence}\n"
        f"**URL:** {passage.url}\n\n"
        f"{doc.text}\n"
    )


# ─── Rebuild script ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    print("=" * 65)
    print("EU AI Act Navigator — Vector Store Builder (enriched metadata)")
    print("=" * 65)

    store = VectorStore()

    if store.embeddings is not None:
        answer = input("\nEmbeddings already exist. Rebuild? (y/n): ")
        if answer.lower() != "y":
            print("Using existing embeddings.")
            sys.exit(0)

    store.parse_and_index_pdfs()

    print("\n" + "=" * 65)
    print("✅ Vector store built successfully!")
    print("=" * 65)
    print(f"Documents: {len(store.documents)}")
    if store.embeddings is not None:
        print(f"Embeddings: {store.embeddings.shape}")
    print()

    print("Sample retrieval test: 'when shall an AI system not be considered high-risk?'")
    results = store.retrieve(
        "When shall an AI system not be considered to be high-risk?", top_k=5
    )
    for i, r in enumerate(results, 1):
        print(f"\n{i}. {r.document.breadcrumb}")
        print(f"   Score: {r.score:.3f} | Confidence: {r.confidence}")
        print(f"   Text: {r.document.text[:200]} …")
