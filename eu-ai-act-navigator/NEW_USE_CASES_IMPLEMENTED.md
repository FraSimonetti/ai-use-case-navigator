# Nuovi Use Cases Implementati - 2026-02-07

## **35 NUOVI USE CASES AGGIUNTI AL SISTEMA**

Tutti i nuovi use cases sono stati aggiunti a `obligations.py` con classificazione corretta secondo AI Act, GDPR e DORA.

---

## **CATEGORIA 1: REGTECH & COMPLIANCE (5 use cases)**

### 1. **AI_REGULATORY_CHANGE_MANAGEMENT**
- **Descrizione:** Sistema AI che scansiona automaticamente EUR-Lex e altre fonti regolamentari, estrae nuovi obblighi, e li mappa alle policy interne
- **AI Act:** Minimal Risk (strumento interno di compliance)
- **GDPR:** Non applicabile (non processa dati personali)
- **DORA:** Basso (non è ICT service critico)
- **Business Value:** 60-70% riduzione tracking manuale

### 2. **AI_REGULATORY_REPORTING_AUTOMATION**
- **Descrizione:** Generazione e invio automatico di report regolamentari (COREP, FINREP, Solvency II)
- **AI Act:** Minimal Risk (automation tool con oversight regolamentare)
- **GDPR:** Art. 6(1)(c) - obbligo legale
- **DORA:** Alto - reporting è funzione critica
- **Business Value:** Riduce errori manuali, accelera reporting

### 3. **DYNAMIC_AML_RISK_SCORING**
- **Descrizione:** Aggiornamento continuo del risk score clienti basato su comportamento real-time
- **AI Act:** HIGH-RISK se nega accesso ai servizi (Annex III 5(b))
- **GDPR:** Art. 22 automated decision-making
- **DORA:** Critico - AML è critical function
- **Business Value:** 92% fraud interception rate

### 4. **AI_MODEL_RISK_MANAGEMENT**
- **Descrizione:** Automazione della model validation, bias testing, e governance
- **AI Act:** Minimal Risk (internal governance tool)
- **GDPR:** Non applicabile
- **DORA:** Alto - model risk è parte di ICT risk management
- **Business Value:** Riduce validation time, migliora quality

### 5. **AI_COMPLIANCE_WORKFLOW**
- **Descrizione:** Routing intelligente di task compliance basato su complessità e expertise
- **AI Act:** Minimal Risk (internal workflow tool)
- **GDPR:** Processa dati dipendenti (Art. 6(1)(f) legitimate interest)
- **DORA:** Basso
- **Business Value:** Ottimizza allocazione risorse compliance

---

## **CATEGORIA 2: GENERATIVE AI & AGENTIC AI (5 use cases)**

### 6. **GENERATIVE_AI_CREDIT_MEMOS**
- **Descrizione:** LLM genera credit analysis memos da dati strutturati, con human review
- **AI Act:** Context-Dependent - se usato per decisioni = HIGH-RISK
- **GDPR:** Processa dati creditizi (Art. 6(1)(b) contract)
- **DORA:** Medio - credit decisioning supporto
- **Business Value:** 20-40% faster memo creation (JPMorgan case study)

### 7. **AI_CODE_GENERATION**
- **Descrizione:** GitHub Copilot per sviluppo software bancario
- **AI Act:** Minimal Risk (developer productivity tool)
- **GDPR:** Non applicabile (non processa dati personali)
- **DORA:** Medio - code quality impatta security
- **Business Value:** 30% developer efficiency gain (OCBC Bank case)

### 8. **AGENTIC_AI_OPERATIONS**
- **Descrizione:** AI agents autonomi che eseguono workflow end-to-end senza intervento umano
- **AI Act:** HIGH-RISK se decision affecting creditworthiness
- **GDPR:** Dipende da dati processati
- **DORA:** Alto - automation di critical functions
- **Business Value:** 30-50% workload reduction (82% adoption projected 2026)

### 9. **AI_MEETING_INTELLIGENCE**
- **Descrizione:** Summarizzazione meeting, estrazione action items, aggiornamento CRM
- **AI Act:** Minimal Risk (productivity tool)
- **GDPR:** Processa conversazioni (Art. 6(1)(f) legitimate interest)
- **DORA:** Basso
- **Business Value:** 20-40% administrative time savings

### 10. **AI_CONTRACT_INTELLIGENCE**
- **Descrizione:** Analisi contratti vendor, estrazione termini, identificazione rischi DORA
- **AI Act:** Minimal Risk (contract analysis tool)
- **GDPR:** Non applicabile (contratti B2B)
- **DORA:** Alto - vendor contract è parte di Art. 28 third-party risk
- **Business Value:** Accelera due diligence vendor

---

## **CATEGORIA 3: CLIMATE FINANCE & ESG (5 use cases)**

### 11. **CLIMATE_STRESS_TESTING_AI**
- **Descrizione:** AI simula migliaia di scenari climatici per resilience testing portfolio
- **AI Act:** Minimal Risk (internal risk management)
- **GDPR:** Non applicabile
- **DORA:** Medio - stress testing è parte risk management
- **Business Value:** ECB climate stress test compliance

### 12. **GREEN_LENDING_CLIMATE_RISK**
- **Descrizione:** Scoring climate risk per decisioni prestiti verdi, adjust loan terms
- **AI Act:** HIGH-RISK se impatta creditworthiness (Annex III 5(b))
- **GDPR:** Art. 6(1)(b) contract + Art. 22 automated decisions
- **DORA:** Medio
- **Business Value:** SFDR/CSRD compliance, green taxonomy alignment

### 13. **AI_CSRD_ESG_REPORTING**
- **Descrizione:** Generazione automatica sustainability reports (ESRS, GRI, TCFD)
- **AI Act:** Minimal Risk (reporting automation)
- **GDPR:** Non applicabile (dati aziendali)
- **DORA:** Basso
- **Business Value:** 50-70% reporting workload reduction, CSRD Phase 1 compliance

### 14. **CARBON_FOOTPRINT_TRACKING**
- **Descrizione:** Calcolo Scope 3 emissions da transazioni clienti
- **AI Act:** Minimal Risk (analytics tool)
- **GDPR:** Processa transaction data (Art. 6(1)(b) contract)
- **DORA:** Basso
- **Business Value:** SFDR disclosure compliance

### 15. **ESG_SENTIMENT_ANALYSIS**
- **Descrizione:** Analisi news/social media per controversie ESG
- **AI Act:** Minimal Risk (investment research tool)
- **GDPR:** Processa dati pubblici
- **DORA:** Basso
- **Business Value:** Early warning ESG risks

---

## **CATEGORIA 4: IDENTITY & eKYC (5 use cases)**

### 16. **EIDAS_DIGITAL_IDENTITY**
- **Descrizione:** Integrazione AI verification con EU Digital Identity Wallet (eIDAS 2.0)
- **AI Act:** HIGH-RISK se biometric identification (Annex III 1)
- **GDPR:** Art. 9 special category data (biometric)
- **DORA:** Alto - identity verification è critical function
- **Business Value:** eIDAS 2.0 mandate compliance (deadline end 2026)

### 17. **FACIAL_RECOGNITION_KYC**
- **Descrizione:** Verifica identità biometrica tramite facial recognition
- **AI Act:** **HIGH-RISK** (Annex III 1 - Biometric Identification)
- **GDPR:** Art. 9 special category data + Art. 22 automated decisions
- **DORA:** Alto - KYC è critical function
- **Business Value:** Onboarding speed, fraud prevention

### 18. **DOCUMENT_FORGERY_DETECTION**
- **Descrizione:** AI rileva documenti falsi (passaporti, utility bills)
- **AI Act:** Context-Dependent (se nega onboarding = HIGH-RISK)
- **GDPR:** Processa ID documents (Art. 6(1)(c) legal obligation AML)
- **DORA:** Alto - KYC fraud prevention
- **Business Value:** 95%+ fake document detection rate

### 19. **LIVENESS_DETECTION**
- **Descrizione:** Prevenzione deepfake attacks durante video KYC
- **AI Act:** HIGH-RISK se biometric (Annex III 1)
- **GDPR:** Art. 9 biometric data
- **DORA:** Alto - fraud prevention
- **Business Value:** Deepfake protection critical con generative AI proliferation

### 20. **CONTINUOUS_AUTHENTICATION**
- **Descrizione:** Behavioral biometrics per authentication continua durante sessione
- **AI Act:** HIGH-RISK if biometric categorization (Annex III 1(b))
- **GDPR:** Art. 9 biometric data + Art. 25 data protection by design
- **DORA:** Alto - access control critico
- **Business Value:** Fraud prevention, UX improvement

---

## **CATEGORIA 5: PAYMENTS & OPEN BANKING (5 use cases)**

### 21. **INSTANT_PAYMENT_FRAUD**
- **Descrizione:** Fraud detection sub-secondo per instant payment (10-second settlement)
- **AI Act:** Context-Dependent (se blocca payment = HIGH-RISK Annex III 5(b))
- **GDPR:** Art. 6(1)(f) legitimate interest (fraud prevention)
- **DORA:** **CRITICO** - instant payments è critical ICT service
- **Business Value:** Instant Payments Regulation compliance (phased 2025-2027)

### 22. **OPEN_BANKING_RISK_SCORING**
- **Descrizione:** Risk assessment third-party payment providers (PSD3 compliance)
- **AI Act:** Context-Dependent (se nega access = HIGH-RISK)
- **GDPR:** Processa transaction data
- **DORA:** Alto - third-party risk (Art. 28)
- **Business Value:** PSD3 compliance (expected 2026-2027)

### 23. **BNPL_CREDIT_DECISIONING**
- **Descrizione:** Instant credit approval per buy-now-pay-later
- **AI Act:** **HIGH-RISK** (Annex III 5(b) - creditworthiness natural persons)
- **GDPR:** Art. 22 automated decision-making
- **DORA:** Medio - embedded lending
- **Business Value:** $7T embedded finance market by 2026

### 24. **PAYMENT_ROUTING_OPTIMIZATION**
- **Descrizione:** AI seleziona optimal payment rails (costo, velocità, reliability)
- **AI Act:** Minimal Risk (internal optimization)
- **GDPR:** Processa transaction metadata
- **DORA:** Alto - payment processing critical
- **Business Value:** Cost reduction, improved success rate

### 25. **CRYPTO_PAYMENT_RISK**
- **Descrizione:** Risk scoring crypto transactions (MiCA compliance)
- **AI Act:** Context-Dependent (se nega transaction = HIGH-RISK)
- **GDPR:** Pseudonymous data processing
- **DORA:** Alto - crypto è ICT risk (MiCA framework)
- **Business Value:** MiCA compliance (effective 2024-2025)

---

## **CATEGORIA 6: INSURANCE INNOVATION (5 use cases)**

### 26. **PARAMETRIC_INSURANCE_TRIGGERS**
- **Descrizione:** Auto-trigger payouts basati su sensor data (weather, earthquake)
- **AI Act:** Limited Risk (transparent automated decision)
- **GDPR:** Processa IoT sensor data (Art. 6(1)(b) contract)
- **DORA:** Medio - automated claims processing
- **Business Value:** Instant payouts, customer satisfaction

### 27. **AI_TELEMATICS_PRICING**
- **Descrizione:** Usage-based insurance pricing da IoT vehicle data
- **AI Act:** Context-Dependent (motor insurance not Annex III 5(c) HIGH-RISK)
- **GDPR:** Processa location data (Art. 6(1)(a) consent)
- **DORA:** Basso
- **Business Value:** Personalized pricing, safer driving incentives

### 28. **REINSURANCE_TREATY_ANALYSIS**
- **Descrizione:** AI analizza reinsurance contracts, ottimizza coverage
- **AI Act:** Minimal Risk (B2B transaction, no natural persons affected)
- **GDPR:** Non applicabile (B2B data)
- **DORA:** Medio - reinsurance è risk transfer mechanism
- **Business Value:** Optimal risk transfer, cost reduction

### 29. **CATASTROPHE_MODELING**
- **Descrizione:** AI predice natural disaster impacts per underwriting
- **AI Act:** Minimal Risk (actuarial tool)
- **GDPR:** Non applicabile (non personal data)
- **DORA:** Basso
- **Business Value:** Climate change risk management

### 30. **INSURANCE_FRAUD_GRAPH**
- **Descrizione:** Network graph analysis per rilevare fraud rings organizzati
- **AI Act:** Context-Dependent (se nega claims = HIGH-RISK)
- **GDPR:** Processa claims data (Art. 6(1)(f) legitimate interest fraud prevention)
- **DORA:** Medio - fraud prevention
- **Business Value:** Organized fraud detection (network effects)

---

## **CATEGORIA 7: PRIVACY-ENHANCING TECHNOLOGIES (3 use cases)**

### 31. **FEDERATED_LEARNING**
- **Descrizione:** Collaborative AI training cross-institution senza condividere raw data
- **AI Act:** Minimal Risk (privacy-enhancing technology)
- **GDPR:** **Privacy by design** (Art. 25) - no data sharing
- **DORA:** Basso - ma richiede secure protocols
- **Business Value:** Fraud detection collaboration, GDPR-compliant

### 32. **SYNTHETIC_DATA_GENERATION**
- **Descrizione:** Generazione fake data per model training (GDPR-compliant)
- **AI Act:** Minimal Risk (development tool)
- **GDPR:** No personal data (synthetic = anonymous)
- **DORA:** Basso - data quality risk se synthetic leaks to production
- **Business Value:** Model training without privacy concerns

### 33. **DIFFERENTIAL_PRIVACY**
- **Descrizione:** Add noise to data per proteggere individual privacy
- **AI Act:** Minimal Risk (privacy-preserving technique)
- **GDPR:** **Privacy by design** (Art. 25)
- **DORA:** Basso
- **Business Value:** Privacy-preserving analytics

---

## **CATEGORIA 8: EXPLAINABILITY & GOVERNANCE (3 use cases)**

### 34. **EXPLAINABLE_AI_XAI**
- **Descrizione:** SHAP/LIME explanations per AI decisions (credit scoring, fraud)
- **AI Act:** Minimal Risk (transparency tool per high-risk systems)
- **GDPR:** Art. 13-15 right to explanation
- **DORA:** Basso - governance tool
- **Business Value:** AI Act Art. 13 transparency compliance

### 35. **AI_HALLUCINATION_DETECTION**
- **Descrizione:** Validazione LLM outputs vs. official sources, detect fake citations
- **AI Act:** Minimal Risk (quality assurance tool)
- **GDPR:** Non applicabile
- **DORA:** Alto - accuracy critica per regulatory guidance systems
- **Business Value:** Zero-error compliance guidance (critical for EU AI Act Navigator!)

### 36. **AI_BIAS_TESTING**
- **Descrizione:** Testing fairness metrics e discrimination (protected attributes)
- **AI Act:** Minimal Risk (compliance tool per high-risk systems)
- **GDPR:** Art. 5(1)(a) fairness principle
- **DORA:** Basso
- **Business Value:** AI Act Art. 10 data governance compliance

---

## **TOTALE USE CASES NEL SISTEMA**

| Categoria | Vecchi | Nuovi | Totale |
|-----------|--------|-------|--------|
| Credit & Lending | 12 | 0 | 12 |
| Risk & Compliance | 17 | 5 | 22 |
| Trading & Investment | 13 | 0 | 13 |
| Insurance | 15 | 5 | 20 |
| Customer Experience | 13 | 0 | 13 |
| Operations | 11 | 5 | 16 |
| Risk Models | 14 | 0 | 14 |
| HR & Employment | 19 | 0 | 19 |
| Security & Access | 6 | 5 | 11 |
| Pricing & Valuation | 4 | 0 | 4 |
| **Nuove Categorie:** |  |  |  |
| Generative AI & Agentic | 0 | 5 | 5 |
| Climate Finance & ESG | 0 | 5 | 5 |
| Identity & eKYC | 0 | 5 | 5 |
| Payments & Open Banking | 0 | 5 | 5 |
| Insurance Innovation | 0 | 0 | (già in Insurance) |
| Privacy-Enhancing Tech | 0 | 3 | 3 |
| Explainability & Governance | 0 | 3 | 3 |
| **TOTALE** | **126** | **35** | **161** |

---

## **CLASSIFICAZIONE RISCHIO (35 NUOVI USE CASES)**

| Risk Level | Count | % | Use Cases |
|------------|-------|---|-----------|
| **HIGH-RISK** | 6 | 17% | FACIAL_RECOGNITION_KYC, EIDAS_DIGITAL_IDENTITY, GREEN_LENDING_CLIMATE_RISK, BNPL_CREDIT_DECISIONING, CONTINUOUS_AUTHENTICATION, AGENTIC_AI_OPERATIONS |
| **Context-Dependent** | 10 | 29% | DYNAMIC_AML_RISK_SCORING, GENERATIVE_AI_CREDIT_MEMOS, INSTANT_PAYMENT_FRAUD, OPEN_BANKING_RISK_SCORING, CRYPTO_PAYMENT_RISK, DOCUMENT_FORGERY_DETECTION, LIVENESS_DETECTION, PARAMETRIC_INSURANCE_TRIGGERS, AI_TELEMATICS_PRICING, INSURANCE_FRAUD_GRAPH |
| **LIMITED RISK** | 0 | 0% | - |
| **MINIMAL RISK** | 19 | 54% | Tutti gli altri (RegTech, Generative AI, Climate, Privacy-Enhancing, Explainability) |

---

## **PROSSIMI PASSI**

1. ✅ **Completato:** Aggiunti 35 nuovi use cases a obligations.py
2. ⏳ **TODO:** Creare use case profiles con descrizioni complete
3. ⏳ **TODO:** Mappare obblighi specifici AI Act/GDPR/DORA per ciascun use case
4. ⏳ **TODO:** Aggiungere timeline e deadlines
5. ⏳ **TODO:** UI improvements (Task #8)

---

**Implementato:** 2026-02-07
**Use Cases Totali:** 161 (126 originali + 35 nuovi)
**Copertura:** RegTech, Generative AI, Climate Finance, eKYC, Payments, Insurance Innovation, Privacy-Enhancing Tech, Explainability
