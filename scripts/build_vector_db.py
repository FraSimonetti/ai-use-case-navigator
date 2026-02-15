#!/usr/bin/env python3
"""
Build Vector Database for EU AI Act Navigator

This script parses the regulatory PDFs and creates a searchable vector database.

Usage:
    python scripts/build_vector_db.py

Requirements:
    - PDF files must be in one of these layouts:
      - data/raw/eu-ai-act/AI ACT.pdf
      - data/raw/gdpr/GDPR.pdf
      - data/raw/dora/DORA.pdf
      OR legacy:
      - data/AI ACT.pdf
      - data/GDPR.pdf
      - data/DORA.pdf
    - poppler-utils must be installed (for pdftotext)
      macOS: brew install poppler
      Linux: apt-get install poppler-utils
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.api.services.vector_store import VectorStore


def main():
    print("=" * 70)
    print("EU AI Act Navigator - Vector Database Builder")
    print("=" * 70)
    print()

    # Check if PDFs exist
    pdf_dir = Path("data")
    required_pdf_sets = {
        "EU AI Act": ["raw/eu-ai-act/AI ACT.pdf", "AI ACT.pdf"],
        "GDPR": ["raw/gdpr/GDPR.pdf", "GDPR.pdf"],
        "DORA": ["raw/dora/DORA.pdf", "DORA.pdf"],
    }

    missing_groups = []
    for regulation, candidates in required_pdf_sets.items():
        if not any((pdf_dir / candidate).exists() for candidate in candidates):
            missing_groups.append((regulation, candidates))

    if missing_groups:
        print("❌ Error: Missing required PDF files:")
        for regulation, candidates in missing_groups:
            tried = ", ".join(str(pdf_dir / c) for c in candidates)
            print(f"   - {regulation} (tried: {tried})")
        print()
        print("Please ensure all PDFs exist under data/raw/... (or legacy data/ root).")
        sys.exit(1)

    print("✅ Found all required PDFs")
    print()

    # Initialize vector store
    store = VectorStore()

    # Check if embeddings already exist
    if store.embeddings is not None:
        print("⚠️  Warning: Embeddings already exist.")
        response = input("Rebuild from scratch? This will take a few minutes. (y/n): ")
        if response.lower() != 'y':
            print("\n✅ Using existing embeddings.")
            print(f"   Documents indexed: {len(store.documents)}")
            print(f"   Embeddings shape: {store.embeddings.shape}")
            return

    # Parse and index PDFs
    print("Starting PDF parsing and indexing...")
    print("This may take a few minutes...")
    print()

    try:
        store.parse_and_index_pdfs(pdf_dir="data")
    except Exception as e:
        print(f"\n❌ Error during parsing: {e}")
        print("\nCommon issues:")
        print("1. Missing pdftotext utility")
        print("   - macOS: brew install poppler")
        print("   - Linux: apt-get install poppler-utils")
        print("2. Corrupted PDF files - try re-downloading")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("✅ Vector database built successfully!")
    print("=" * 70)
    print(f"Documents indexed: {len(store.documents)}")
    print(f"Embeddings shape: {store.embeddings.shape if store.embeddings is not None else 'None'}")
    print()

    # Test retrieval
    print("Testing retrieval system...")
    print()

    test_queries = [
        "What are high-risk AI systems for creditworthiness?",
        "What are the obligations for providers of high-risk AI systems?",
        "What are the GDPR requirements for automated decision-making?",
    ]

    for query in test_queries:
        print(f"Query: {query}")
        results = store.retrieve(query, top_k=2)

        if results:
            print(f"  ✅ Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"     {i}. {result.document.regulation} - {result.document.article}")
                print(f"        Score: {result.score:.3f} | Confidence: {result.confidence}")
        else:
            print("  ⚠️  No results found")
        print()

    print("=" * 70)
    print("✅ Setup complete! The chat system is now ready to use.")
    print("=" * 70)


if __name__ == "__main__":
    main()
