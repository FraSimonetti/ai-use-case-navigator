# RegolAI — Consolidated Audit Report

**Date:** 2026-02-14
**Auditors:** 5-agent specialist team (EU AI Act, GDPR, DORA/ICT, RAG Architecture, UI/UX)
**Target Audience:** CRO/COO of European financial institutions
**Scope:** Regulatory mapping engine (`obligations.py`), RAG pipeline, frontend UI

---

## EXECUTIVE SUMMARY

RegolAI has a strong foundation: 126 use cases, 3-regulation mapping (AI Act + GDPR + DORA), context-dependent classification with validation, and a working RAG pipeline. However, the audit identified **33 gaps across 5 domains**, of which **11 are critical production blockers**. The three most severe findings are:

1. **Art. 5 Prohibited Practices are entirely absent** — no `prohibited` classification exists. Systems that should be blocked (emotion recognition in employment, biometric categorization by sensitive attributes) return `high_risk` instead. Art. 5 has been in force since **February 2, 2025**. Fines: up to 35M or 7% global turnover.

2. **Production RAG embeddings are stale TF-IDF vectors** — the semantic embedding upgrade (sentence-transformers) was never deployed. All retrieval is lexical, not semantic. Paraphrase queries miss relevant chunks. The article-number regex also collides (querying "Article 6" retrieves Articles 60-69).

3. **Three GDPR request flags are dead code** — `cross_border_processing`, `large_scale_processing`, `systematic_monitoring` are collected from users but never passed to `get_gdpr_obligations()`. Users who check these boxes receive no tailored obligations.

**Bottom line:** The engine is not safe for Tier 1 financial institution deployment without fixing the 11 critical items below. With those fixes (estimated 3-4 weeks of focused work), RegolAI would be the most comprehensive AI regulatory mapping tool available for European financial services.

---

## CROSS-REVIEW: INTER-DOMAIN FINDINGS

The following gaps were identified by cross-referencing findings across regulatory domains:

### 1. FRIA (Art. 27) + DPIA (Art. 35) Misalignment
- **EU AI Act agent**: FRIA scope is gated on role only, not use case type
- **GDPR agent**: DPIA is applied unconditionally (never "mandatory" vs "recommended")
- **Cross-finding**: FRIA and DPIA should be conducted as an integrated assessment per EDPB-ENISA joint guidance. Neither obligation cross-references the other with methodology guidance.

### 2. Biometric Classification Triple Conflict
- **EU AI Act agent**: Enterprise biometric auth is NOT Annex III point 1 high-risk (point 1 covers categorization by sensitive attributes / real-time remote ID)
- **GDPR agent**: Biometric use cases don't auto-set `uses_special_category_data=True`, so Art. 9 obligations are missed
- **Cross-finding**: Biometric use cases are simultaneously over-classified (AI Act) and under-protected (GDPR). Fix both: downgrade AI Act classification for enterprise auth, auto-detect GDPR Art. 9 for all biometric use cases.

### 3. Third-Party AI Vendor: DORA + GDPR Gap
- **DORA agent**: Art. 33-44 CTPP oversight obligations missing; no RTS/ITS references
- **GDPR agent**: Art. 28 Data Processing Agreement obligations absent when `third_party_vendor=True`
- **Cross-finding**: A bank using Azure OpenAI gets DORA Art. 28-32 vendor obligations but zero GDPR Art. 28 DPA requirements and zero CTPP oversight obligations. All three must fire together.

### 4. Incident Reporting: AI Act Art. 73 + DORA Art. 19 Overlap
- **EU AI Act agent**: Art. 73 serious incident reporting is correctly implemented (15-day / 2-day timelines)
- **DORA agent**: Art. 19 major ICT incident reporting timelines (4h / 72h / 1 month) are absent
- **Cross-finding**: A single AI incident may trigger BOTH Art. 73 (AI Act) and Art. 19 (DORA) with different timelines and authorities. No guidance on parallel reporting exists in the engine.

### 5. VIDEO_INTERVIEW_ANALYSIS: Prohibited, Not High-Risk
- **EU AI Act agent**: Art. 5(1)(f) prohibits emotion recognition in employment — this use case should return `prohibited`
- **GDPR agent**: Same use case should auto-detect biometric/health data (Art. 9)
- **Cross-finding**: This use case needs a 3-layer fix: (1) prohibited classification under Art. 5, (2) auto-set special category data, (3) clear user warning that deployment is illegal.

---

## GAP ANALYSIS BY DOMAIN

### A. EU AI Act — 12 Gaps (4 Critical)

| # | Gap | Severity | Article | Fix |
|---|-----|----------|---------|-----|
| 1 | **Art. 5 prohibited practices not implemented** | CRITICAL | Art. 5(1)(a)-(h) | Add `prohibited` classification; add `check_art_5_prohibited()` before Annex III checks |
| 2 | **GPAI deadline wrong (shows Aug 2025, correct: Feb 2025)** | CRITICAL | Art. 51-56 | Change `2025-08-02` → `2025-02-02` at lines 3137, 3188, 3241, 3293 |
| 3 | **Biometric enterprise auth mis-classified as Annex III pt 1** | CRITICAL | Annex III(1) | Reclassify enterprise auth as limited/context-dependent; keep remote biometric ID as high-risk |
| 4 | **Art. 6(3) exemption missing significant-harm gate** | CRITICAL | Art. 6(3) | Block exemption when `is_high_impact` or `denies_service_access` is true |
| 5 | Art. 50(3)/(4) AI content labelling / deepfake disclosure missing | HIGH | Art. 50 | Add obligations for AI-generated content and synthetic media |
| 6 | Art. 25 substantial modification (non-GPAI deployers) missing | HIGH | Art. 25(1) | Add `substantial_modification` flag triggering provider obligations |
| 7 | Art. 16 provider obligations not standalone | MEDIUM | Art. 16 | Create explicit provider checklist obligation |
| 8 | CE marking (Art. 49) not standalone obligation | MEDIUM | Art. 49 | Separate from conformity assessment |
| 9 | GPAI Art. 53(1)(c), Art. 54, Art. 55(1)(d), Art. 56 gaps | MEDIUM | Art. 53-56 | Add copyright transparency, cooperation, energy reporting, codes of practice |
| 10 | Timeline missing 4 deadlines (Feb 2025, Aug 2025, Aug 2027, Aug 2030) | MEDIUM | Various | Add all Phase 1-4 deadlines |
| 11 | Annex III areas 2, 3 have zero use cases | LOW | Annex III | Add critical infrastructure stub + education stub |
| 12 | Generic insurance enums still present despite prior removal decision | LOW | — | Remove `INSURANCE_PRICING` / `INSURANCE_UNDERWRITING` generic enums |

### B. GDPR — 8 Gaps (3 Critical)

| # | Gap | Severity | Article | Fix |
|---|-----|----------|---------|-----|
| 1 | **Dead-code flags: `cross_border_processing`, `large_scale_processing`, `systematic_monitoring` never passed to GDPR function** | CRITICAL | Art. 35, 56 | Wire flags into `get_gdpr_obligations()` |
| 2 | **Art. 21 Right to Object entirely absent** | CRITICAL | Art. 21 | Add for all profiling use cases + legitimate interest basis |
| 3 | **Biometric use cases don't auto-set `uses_special_category_data`** | CRITICAL | Art. 9(1) | Auto-detect for FACIAL_RECOGNITION, VOICE_BIOMETRIC_AUTH, etc. |
| 4 | Art. 25 Privacy by Design absent | HIGH | Art. 25 | Add standard obligation for all natural-person cases |
| 5 | Art. 28 DPA obligations absent for third-party vendors | HIGH | Art. 28(3) | Add when `third_party_vendor=True` |
| 6 | Art. 5(1)(b)/(e) Purpose + Storage Limitation not standalone | HIGH | Art. 5 | Add explicit purpose limitation assessment + retention schedule |
| 7 | Art. 22(2) exception documentation insufficient for financial context | MEDIUM | Art. 22 | Add exception-specific obligations per 22(2)(a)/(b)/(c) |
| 8 | Art. 56 lead supervisory authority not triggered by `cross_border_processing` | MEDIUM | Art. 56 | Generate obligation when flag is set |

### C. DORA / ICT Risk — 8 Gaps (5 High)

| # | Gap | Severity | Article | Fix |
|---|-----|----------|---------|-----|
| 1 | **Art. 18(1) major incident classification criteria missing** | HIGH | Art. 18(1) | Add 6-criteria checklist + RTS 2024/1772 reference |
| 2 | **Art. 19-20 incident reporting timelines absent (4h/72h/1mo)** | HIGH | Art. 19(3) | Add explicit timelines + ITS 2024/2956 templates |
| 3 | **Art. 5(2) management body personal accountability not standalone** | HIGH | Art. 5(2) | Create `management_body_ict_accountability` obligation |
| 4 | **Art. 33-44 CTPP oversight obligations missing** | HIGH | Art. 33-44 | Add CTPP obligations when `critical_ict_service=True` |
| 5 | **Art. 26 TLPT scope self-assessment not implemented** | HIGH | Art. 26 | Add TLPT scope criteria + TIBER-EU reference |
| 6 | RTS/ITS references systematically absent | MEDIUM | Various | Add Level 2 references to each obligation |
| 7 | Art. 11(4) BCP metrics (RTO/RPO) missing | MEDIUM | Art. 11(4) | Add to resilience testing obligation |
| 8 | Art. 14 post-incident learning not standalone | MEDIUM | Art. 14 | Enhance or separate from incident management |

### D. RAG Architecture — 4 Critical + 8 Improvements

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **Production embeddings are stale TF-IDF (1000-dim), not semantic** | CRITICAL | Rebuild with sentence-transformers (`all-MiniLM-L6-v2` or `legal-bert`) |
| 2 | **Article paragraph chunking broken** — whitespace normalization kills paragraph splits | CRITICAL | Parse paragraph structure before normalization |
| 3 | **Article number regex collision** — "Article 6" matches Articles 60-69 | CRITICAL | Add word boundary `\b` to regex |
| 4 | **No post-generation citation verification** | CRITICAL | Verify cited articles exist in retrieved passages |
| 5 | No hybrid search (BM25 + semantic) | HIGH | Add BM25 alongside dense retrieval (α=0.6) |
| 6 | No cross-encoder reranking | HIGH | Add `cross-encoder/ms-marco-MiniLM-L-6-v2` reranking step |
| 7 | Breadcrumbs not persisted in documents.json | MEDIUM | Save breadcrumbs in `_save_to_disk()` |
| 8 | No evaluation pipeline | HIGH | Build 50-question golden test set with Hit@k and MRR metrics |
| 9 | No low-confidence answer suppression | MEDIUM | Return "not found" when all scores < 0.2 |
| 10 | No multi-query expansion | MEDIUM | Generate 2-3 query variants for complex questions |
| 11 | Upgrade to legal-domain embedding model | MEDIUM | Switch to `nlpaueb/legal-bert-base-uncased` (768-dim) |
| 12 | top_k=7 may include duplicates / truncated chunks | LOW | Deduplicate + sentence-boundary truncation |

### E. UI/UX — 4 Critical + 11 Improvements

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **No PDF/report export** — CROs cannot share compliance results | CRITICAL | Add "Export PDF" with structured report generation |
| 2 | **API key gate blocks Smart Q&A** — enterprise demo fails | CRITICAL | Backend-managed key for free tier, or onboarding wizard |
| 3 | **`validation` API data not surfaced in UI** — confidence + legal basis exists but invisible | CRITICAL | Add ValidationBadge component at top of results |
| 4 | **No compliance dashboard** — no portfolio overview for multi-use-case institutions | CRITICAL | Replace home page with executive dashboard |
| 5 | Timeline view is placeholder quality (flat list, no visual hierarchy) | HIGH | Redesign as milestone timeline with urgency coloring |
| 6 | Emoji icons instead of SVG icons | HIGH | Replace with `lucide-react` for cross-platform consistency |
| 7 | Step 3 context form: 20+ checkboxes without grouping | HIGH | Progressive disclosure wizard (3 sub-steps) |
| 8 | Obligation results: no filter/sort controls | HIGH | Add regulation filter + severity filter |
| 9 | Single-column layout on desktop (form then results) | MEDIUM | Two-column layout: form left, results right |
| 10 | No "Save Analysis" / session history | MEDIUM | localStorage persistence + recent analyses list |
| 11 | Custom modals lack focus trapping | MEDIUM | Replace with shadcn `Dialog` |
| 12 | No organization profile in Settings | MEDIUM | Auto-populate institution type/role |
| 13 | ObligationMatrix visualization missing | LOW | 3-column flow: Use Case → Regulation → Obligations |
| 14 | Accessibility: missing `aria-label` on spinners, info badges | LOW | Add WCAG compliance |
| 15 | Semantic color tokens not in tailwind config | LOW | Add `risk.high`, `risk.limited`, etc. to theme |

---

## RISK MATRIX

| Risk | Likelihood | Impact | Domain | Mitigation |
|------|-----------|--------|--------|-----------|
| Bank deploys prohibited AI (Art. 5) thinking it's "high-risk" | HIGH | CRITICAL (35M fine) | AI Act | Implement Art. 5 check immediately |
| Incorrect GPAI deadline causes missed compliance | HIGH | HIGH (regulatory action) | AI Act | Fix dates from Aug→Feb 2025 |
| GDPR flags silently ignored (dead code) | HIGH | HIGH (incorrect obligations) | GDPR | Wire flags into GDPR function |
| RAG returns hallucinated article citations | MEDIUM | HIGH (wrong legal advice) | RAG | Add citation verification |
| Biometric use case over-classified (unnecessary conformity assessment cost) | MEDIUM | MEDIUM (wasted resources) | AI Act+GDPR | Fix classification + auto-detect Art. 9 |
| CRO cannot export report for board | HIGH | HIGH (blocks adoption) | UI/UX | Add PDF export |
| AI incident triggers dual reporting (Art. 73 + Art. 19) with no guidance | MEDIUM | HIGH (missed deadline) | AI Act+DORA | Add parallel reporting guidance |
| Enterprise demo fails at API key gate | HIGH | HIGH (lost deal) | UI/UX | Backend-managed key or onboarding |
| TLPT scope unclear for institutions | MEDIUM | MEDIUM (audit finding) | DORA | Add self-assessment logic |
| Third-party AI vendor: no DPA + no CTPP oversight | MEDIUM | HIGH (GDPR+DORA breach) | GDPR+DORA | Add Art. 28 DPA + Art. 33-44 CTPP |

---

## PRIORITIZED ROADMAP

### Phase 1 — Critical Fixes (Week 1-2) — BLOCKS LAUNCH

| # | Item | Domain | Effort | Dependencies |
|---|------|--------|--------|-------------|
| 1 | Implement Art. 5 prohibited practices classification | AI Act | 3 days | None |
| 2 | Fix GPAI deadlines (Aug→Feb 2025) | AI Act | 0.5 day | None |
| 3 | Rebuild semantic embeddings (sentence-transformers) | RAG | 1 day | None |
| 4 | Fix article number regex collision (`\b` boundary) | RAG | 0.5 day | None |
| 5 | Wire dead-code GDPR flags into `get_gdpr_obligations()` | GDPR | 1 day | None |
| 6 | Auto-detect biometric = special category data | GDPR | 0.5 day | None |
| 7 | Fix Art. 6(3) exemption significant-harm gate | AI Act | 0.5 day | None |
| 8 | Add post-generation citation verification | RAG | 2 days | #3 |
| 9 | Fix article paragraph chunking | RAG | 2 days | #3 |
| 10 | Add PDF/report export | UI/UX | 3 days | None |
| 11 | Surface `validation` data in UI (ValidationBadge) | UI/UX | 1 day | None |

### Phase 2 — Compliance Completeness (Week 3-4)

| # | Item | Domain | Effort |
|---|------|--------|--------|
| 12 | Add Art. 21 Right to Object obligation | GDPR | 1 day |
| 13 | Add Art. 28 DPA obligation for third-party vendors | GDPR | 1 day |
| 14 | Add Art. 25 Privacy by Design obligation | GDPR | 0.5 day |
| 15 | Fix biometric classification (enterprise auth ≠ Annex III pt 1) | AI Act | 1 day |
| 16 | Add Art. 50(3)/(4) AI content labelling | AI Act | 1 day |
| 17 | Add DORA Art. 18(1) incident classification criteria | DORA | 1 day |
| 18 | Add DORA Art. 19 reporting timelines (4h/72h/1mo) | DORA | 1 day |
| 19 | Add Art. 5(2) management body accountability obligation | DORA | 0.5 day |
| 20 | Add CTPP oversight obligations (Art. 33-44) | DORA | 1 day |
| 21 | Add TLPT scope self-assessment (Art. 26) | DORA | 1 day |
| 22 | Add hybrid BM25 + semantic search | RAG | 3 days |
| 23 | Build 50-question golden test set | RAG | 2 days |
| 24 | Replace emoji with lucide-react icons | UI/UX | 1 day |
| 25 | Redesign timeline as visual milestone component | UI/UX | 2 days |

### Phase 3 — Quality & Polish (Week 5-6)

| # | Item | Domain | Effort |
|---|------|--------|--------|
| 26 | Add cross-encoder reranking | RAG | 3 days |
| 27 | Progressive disclosure in Step 3 context form | UI/UX | 2 days |
| 28 | Two-column desktop layout for obligations page | UI/UX | 1 day |
| 29 | Add obligation filter/sort controls | UI/UX | 1 day |
| 30 | Add FRIA+DPIA integration guidance | AI Act+GDPR | 0.5 day |
| 31 | Add all missing timeline deadlines | AI Act | 0.5 day |
| 32 | Add RTS/ITS references to DORA obligations | DORA | 2 days |
| 33 | Add parallel incident reporting guidance (Art. 73 + Art. 19) | AI Act+DORA | 1 day |
| 34 | Executive dashboard home page | UI/UX | 3 days |
| 35 | Save analysis / session history (localStorage) | UI/UX | 1 day |
| 36 | Upgrade embedding model to legal-bert | RAG | 1 day |
| 37 | LLM-as-judge evaluation pipeline | RAG | 3 days |
| 38 | Add missing financial use cases (10 identified) | AI Act | 3 days |

---

## APPENDIX: POSITIVE FINDINGS

The audit also confirmed significant strengths:

- **Annex III 5(b) consumer vs B2B distinction** — correctly implemented (corporate credit = minimal risk)
- **Insurance life/health scoping** — only life/health correctly marked high-risk
- **Art. 26 deployer obligations** — full Art. 26(1)-(7) mapping
- **Art. 73 serious incident reporting** — correct 15-day/2-day distinction
- **Context-dependent classification with decision tree** — well-designed criteria
- **Validation layer with confidence scoring** — excellent foundation (needs UI surfacing)
- **System prompt with prompt injection defense** — robust RAG guardrails
- **126 use cases across 10 categories** — comprehensive financial sector coverage
- **GPAI systemic risk threshold** — correctly uses 10^25 FLOPs
- **Structural metadata and breadcrumb design** — good RAG architecture (needs persistence fix)
- **Responsive layout and shadcn/ui component library** — solid frontend foundation

---

*Report generated by 5-agent coordinated audit team. All article references are to the final published text of Regulation (EU) 2024/1689 (AI Act), Regulation (EU) 2016/679 (GDPR), and Regulation (EU) 2022/2554 (DORA).*
