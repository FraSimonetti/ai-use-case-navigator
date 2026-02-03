'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { TimelineView } from '@/components/obligations/timeline-view'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'

// Direct article links - using specialized websites with article-level navigation
const ARTICLE_BASES = {
  ai_act: 'https://artificialintelligenceact.eu/article/',  // e.g., /article/7/
  gdpr: 'https://gdpr-info.eu/art-',  // e.g., /art-22-gdpr/
  dora: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2554',
}

// EUR-Lex full text links
const EURLEX_LINKS = {
  ai_act: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
  gdpr: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679',
  dora: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554',
}

// Generate direct link to specific article
function getArticleUrl(regulation: string, articleNumber: string): string {
  // Extract just the article number (e.g., "9(1)" -> "9", "Art. 22" -> "22")
  const numMatch = articleNumber.match(/^(\d+)/)
  if (!numMatch) return EURLEX_LINKS[regulation as keyof typeof EURLEX_LINKS] || '#'
  const num = numMatch[1]
  
  if (regulation === 'eu_ai_act') {
    return `${ARTICLE_BASES.ai_act}${num}/`
  } else if (regulation === 'gdpr') {
    return `${ARTICLE_BASES.gdpr}${num}-gdpr/`
  } else if (regulation === 'dora') {
    // DORA doesn't have a dedicated article site, use EUR-Lex
    return EURLEX_LINKS.dora
  }
  return '#'
}

const INSTITUTION_TYPES = [
  { value: 'bank', label: 'Bank / Credit Institution' },
  { value: 'insurer', label: 'Insurance Company' },
  { value: 'investment_firm', label: 'Investment Firm' },
  { value: 'payment_provider', label: 'Payment Service Provider' },
  { value: 'crypto_provider', label: 'Crypto Asset Service Provider' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'pension_fund', label: 'Pension Fund' },
  { value: 'fintech', label: 'Fintech Company' },
  { value: 'regtech', label: 'RegTech Provider' },
  { value: 'other', label: 'Other Organization' },
]

const AI_ROLES = [
  { value: 'deployer', label: 'Deployer - I use AI built by others', description: 'You deploy/use AI systems in your operations' },
  { value: 'provider', label: 'Provider - I develop AI for others', description: 'You develop AI systems for third parties' },
  { value: 'provider_and_deployer', label: 'Both - I build and use my own AI', description: 'You develop AND deploy your own AI' },
  { value: 'importer', label: 'Importer - I bring non-EU AI to market', description: 'You import AI from outside the EU' },
]

const USE_CASE_CATEGORIES = [
  { id: 'credit_lending', label: 'Credit & Lending', icon: '💳', annex: 'III.5(b)' },
  { id: 'risk_compliance', label: 'Risk & Compliance', icon: '🛡️', annex: 'Various' },
  { id: 'trading_investment', label: 'Trading & Investment', icon: '📈', annex: 'N/A' },
  { id: 'insurance', label: 'Insurance', icon: '🏥', annex: 'III.5(c)*' },
  { id: 'hr_employment', label: 'HR & Employment', icon: '👥', annex: 'III.4' },
  { id: 'customer_experience', label: 'Customer Experience', icon: '💬', annex: 'Art.50' },
  { id: 'operations', label: 'Operations', icon: '⚙️', annex: 'N/A' },
  { id: 'risk_models', label: 'Risk Models', icon: '📊', annex: 'Various' },
  { id: 'security', label: 'Security & Access', icon: '🔒', annex: 'III.1' },
  { id: 'pricing', label: 'Pricing & Valuation', icon: '💰', annex: 'Various' },
]

// Comprehensive use case list with detailed descriptions
const USE_CASES = [
  // === CREDIT & LENDING (Annex III 5(b) - HIGH-RISK) ===
  { value: 'credit_scoring', label: 'Credit Scoring (Consumer)', category: 'credit_lending', risk: 'high_risk', description: 'AI evaluating creditworthiness of natural persons. HIGH-RISK under Annex III 5(b).', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_scoring_consumer', label: 'Credit Scoring - Consumer Credit', category: 'credit_lending', risk: 'high_risk', description: 'AI scoring individuals for consumer credit products. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_scoring_corporate', label: 'Credit Scoring - Corporate/B2B', category: 'credit_lending', risk: 'minimal_risk', description: 'AI scoring businesses (not natural persons). NOT high-risk - Annex III 5(b) covers only natural persons.', annex_ref: 'Not covered' },
  { value: 'corporate_risk_opinion', label: 'Corporate Risk Opinion (Multi-Agent)', category: 'credit_lending', risk: 'minimal_risk', description: 'Multi-agent system (financial, ESG, sectoral, past decisions) producing a B2B/corporate risk opinion for credit officers. Human decides. NOT high-risk - Annex III 5(b) covers only natural persons.', annex_ref: 'Not covered' },
  { value: 'loan_origination', label: 'Loan Origination', category: 'credit_lending', risk: 'high_risk', description: 'AI-assisted loan application processing and approval for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'loan_approval', label: 'Loan Approval Decision', category: 'credit_lending', risk: 'high_risk', description: 'AI making or influencing loan approval decisions for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'loan_pricing', label: 'Loan Pricing', category: 'credit_lending', risk: 'context_dependent', description: 'AI determining interest rates. Context-dependent - may be high-risk if discriminatory impact.', annex_ref: 'Art. 6(3)' },
  { value: 'mortgage_underwriting', label: 'Mortgage Underwriting', category: 'credit_lending', risk: 'high_risk', description: 'AI for mortgage assessment and approval. HIGH-RISK under Annex III 5(b).', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_limit_setting', label: 'Credit Limit Setting', category: 'credit_lending', risk: 'high_risk', description: 'AI determining credit limits for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'affordability_assessment', label: 'Affordability Assessment', category: 'credit_lending', risk: 'high_risk', description: 'AI assessing affordability for credit decisions. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'collections_recovery', label: 'Collections & Recovery', category: 'credit_lending', risk: 'context_dependent', description: 'AI prioritizing debt collection. May be high-risk if significantly impacts individuals.', annex_ref: 'Art. 6(3)' },
  { value: 'debt_restructuring', label: 'Debt Restructuring', category: 'credit_lending', risk: 'context_dependent', description: 'AI for debt restructuring decisions. Context-dependent.', annex_ref: 'Art. 6(3)' },

  // === RISK & COMPLIANCE ===
  { value: 'fraud_detection', label: 'Fraud Detection (General)', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting fraudulent transactions. HIGH-RISK if can deny service access.', annex_ref: 'Art. 6(3) / Annex III 5(b)' },
  { value: 'fraud_detection_card', label: 'Card Fraud Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting credit/debit card fraud. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'fraud_detection_account', label: 'Account Takeover Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting unauthorized account access.', annex_ref: 'Art. 6(3)' },
  { value: 'fraud_detection_application', label: 'Application Fraud Detection', category: 'risk_compliance', risk: 'high_risk', description: 'AI detecting fraud in credit applications. If rejects applications → HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'aml_kyc', label: 'AML/KYC Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI for anti-money laundering. HIGH-RISK if denies account opening.', annex_ref: 'Art. 6(3) / Annex III 5(b)' },
  { value: 'aml_transaction_monitoring', label: 'AML Transaction Monitoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI monitoring for suspicious transactions. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'aml_customer_risk_scoring', label: 'AML Customer Risk Scoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI scoring customer AML risk. May affect service access.', annex_ref: 'Art. 6(3)' },
  { value: 'sanctions_screening', label: 'Sanctions Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI screening against sanctions lists.', annex_ref: 'Art. 6(3)' },
  { value: 'pep_screening', label: 'PEP Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI screening for Politically Exposed Persons.', annex_ref: 'Art. 6(3)' },
  { value: 'transaction_monitoring', label: 'Transaction Monitoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI monitoring for suspicious activity patterns.', annex_ref: 'Art. 6(3)' },
  { value: 'trade_surveillance', label: 'Trade Surveillance', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting market abuse and manipulation.', annex_ref: 'Art. 6(3)' },
  { value: 'market_abuse_detection', label: 'Market Abuse Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting MAR violations.', annex_ref: 'Art. 6(3)' },
  { value: 'insider_trading_detection', label: 'Insider Trading Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting potential insider trading.', annex_ref: 'Art. 6(3)' },
  { value: 'regulatory_reporting', label: 'Regulatory Reporting', category: 'risk_compliance', risk: 'minimal_risk', description: 'AI automating regulatory report generation.', annex_ref: 'Not listed' },
  { value: 'compliance_monitoring', label: 'Compliance Monitoring', category: 'risk_compliance', risk: 'minimal_risk', description: 'AI monitoring compliance with internal policies.', annex_ref: 'Not listed' },

  // === TRADING & INVESTMENT ===
  { value: 'algorithmic_trading', label: 'Algorithmic Trading', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for automated trading. Not high-risk under AI Act (regulated under MiFID II).', annex_ref: 'Not listed' },
  { value: 'high_frequency_trading', label: 'High Frequency Trading', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for HFT. Regulated under MiFID II Art. 17.', annex_ref: 'Not listed' },
  { value: 'robo_advisory', label: 'Robo-Advisory (General)', category: 'trading_investment', risk: 'context_dependent', description: 'AI providing investment advice. May be high-risk for retail if affects access.', annex_ref: 'Art. 6(3)' },
  { value: 'robo_advisory_retail', label: 'Robo-Advisory - Retail Clients', category: 'trading_investment', risk: 'context_dependent', description: 'AI investment advice for retail. Heightened suitability requirements.', annex_ref: 'Art. 6(3)' },
  { value: 'robo_advisory_professional', label: 'Robo-Advisory - Professional', category: 'trading_investment', risk: 'minimal_risk', description: 'AI investment advice for professionals. Lower protection requirements.', annex_ref: 'Not listed' },
  { value: 'portfolio_optimization', label: 'Portfolio Optimization', category: 'trading_investment', risk: 'minimal_risk', description: 'AI optimizing investment portfolios.', annex_ref: 'Not listed' },
  { value: 'portfolio_rebalancing', label: 'Portfolio Rebalancing', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for automatic portfolio rebalancing.', annex_ref: 'Not listed' },
  { value: 'best_execution', label: 'Best Execution', category: 'trading_investment', risk: 'minimal_risk', description: 'AI achieving best execution for orders.', annex_ref: 'Not listed' },
  { value: 'market_making', label: 'Market Making', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for liquidity provision.', annex_ref: 'Not listed' },
  { value: 'smart_order_routing', label: 'Smart Order Routing', category: 'trading_investment', risk: 'minimal_risk', description: 'AI routing orders to optimal venues.', annex_ref: 'Not listed' },
  { value: 'esg_scoring', label: 'ESG Scoring', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for ESG analysis and scoring.', annex_ref: 'Not listed' },

  // === INSURANCE (Only life/health is HIGH-RISK under Annex III 5(c)) ===
  { value: 'insurance_pricing_life', label: 'Insurance Pricing - Life', category: 'insurance', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI for life insurance pricing. Explicitly covered by Annex III 5(c).', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_pricing_health', label: 'Insurance Pricing - Health', category: 'insurance', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI for health insurance pricing. Explicitly covered by Annex III 5(c).', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_pricing_property', label: 'Insurance Pricing - Property', category: 'insurance', risk: 'context_dependent', description: 'AI for property insurance pricing. NOT explicitly high-risk - context-dependent.', annex_ref: 'Not listed' },
  { value: 'insurance_pricing_motor', label: 'Insurance Pricing - Motor', category: 'insurance', risk: 'context_dependent', description: 'AI for motor insurance pricing. NOT explicitly high-risk - context-dependent.', annex_ref: 'Not listed' },
  { value: 'insurance_pricing_liability', label: 'Insurance Pricing - Liability', category: 'insurance', risk: 'context_dependent', description: 'AI for liability insurance pricing. NOT high-risk.', annex_ref: 'Not listed' },
  { value: 'insurance_underwriting_life', label: 'Insurance Underwriting - Life', category: 'insurance', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI for life insurance underwriting.', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_underwriting_health', label: 'Insurance Underwriting - Health', category: 'insurance', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI for health insurance underwriting.', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_underwriting_property', label: 'Insurance Underwriting - Property', category: 'insurance', risk: 'context_dependent', description: 'AI for property insurance underwriting. Context-dependent.', annex_ref: 'Not listed' },
  { value: 'claims_processing', label: 'Claims Processing', category: 'insurance', risk: 'context_dependent', description: 'AI for claims assessment. May be high-risk if denies claims.', annex_ref: 'Art. 6(3)' },
  { value: 'claims_triage', label: 'Claims Triage', category: 'insurance', risk: 'minimal_risk', description: 'AI routing claims to appropriate handlers.', annex_ref: 'Not listed' },
  { value: 'claims_fraud_detection', label: 'Claims Fraud Detection', category: 'insurance', risk: 'context_dependent', description: 'AI detecting fraudulent claims.', annex_ref: 'Art. 6(3)' },
  { value: 'telematics_pricing', label: 'Telematics Pricing', category: 'insurance', risk: 'context_dependent', description: 'AI pricing based on driving behavior data.', annex_ref: 'Art. 6(3)' },

  // === HR & EMPLOYMENT (Annex III point 4 - HIGH-RISK) ===
  { value: 'cv_screening', label: 'CV/Resume Screening', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI filtering job applications. Annex III point 4(a).', annex_ref: 'Annex III, point 4(a)' },
  { value: 'cv_parsing', label: 'CV Parsing (Data Extraction)', category: 'hr_employment', risk: 'context_dependent', description: 'AI extracting data from CVs. May qualify for Art. 6(3) exemption if preparatory only.', annex_ref: 'Art. 6(3)(d)' },
  { value: 'candidate_ranking', label: 'Candidate Ranking', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI scoring/ranking candidates. Annex III point 4(a).', annex_ref: 'Annex III, point 4(a)' },
  { value: 'candidate_matching', label: 'Candidate Matching', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI matching candidates to roles.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'interview_analysis', label: 'Interview Analysis', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI analyzing interviews.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'video_interview_analysis', label: 'Video Interview Analysis', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI analyzing video interviews (may include emotion recognition).', annex_ref: 'Annex III, point 4(a)' },
  { value: 'employee_performance', label: 'Performance Evaluation', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI evaluating employee performance. Annex III point 4(b).', annex_ref: 'Annex III, point 4(b)' },
  { value: 'performance_prediction', label: 'Performance Prediction', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI predicting employee performance.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'promotion_decisions', label: 'Promotion Decisions', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI influencing promotions. Annex III point 4(b).', annex_ref: 'Annex III, point 4(b)' },
  { value: 'termination_decisions', label: 'Termination Decisions', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI involved in termination decisions.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'employee_monitoring', label: 'Employee Monitoring', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI monitoring employee behavior. Annex III point 4(c).', annex_ref: 'Annex III, point 4(c)' },
  { value: 'productivity_monitoring', label: 'Productivity Monitoring', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI monitoring productivity.', annex_ref: 'Annex III, point 4(c)' },
  { value: 'task_allocation', label: 'Task Allocation', category: 'hr_employment', risk: 'high_risk', description: '⚠️ HIGH-RISK: AI allocating work tasks. Annex III point 4(c).', annex_ref: 'Annex III, point 4(c)' },
  { value: 'workforce_planning', label: 'Workforce Planning', category: 'hr_employment', risk: 'context_dependent', description: 'AI forecasting workforce needs. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'compensation_analysis', label: 'Compensation Analysis', category: 'hr_employment', risk: 'context_dependent', description: 'AI analyzing compensation equity.', annex_ref: 'Art. 6(3)' },
  { value: 'talent_retention', label: 'Talent Retention', category: 'hr_employment', risk: 'context_dependent', description: 'AI predicting employee flight risk.', annex_ref: 'Art. 6(3)' },
  { value: 'learning_recommendation', label: 'Learning Recommendations', category: 'hr_employment', risk: 'minimal_risk', description: 'AI recommending training courses.', annex_ref: 'Not listed' },

  // === CUSTOMER EXPERIENCE (Art. 50 - LIMITED RISK for chatbots) ===
  { value: 'customer_chatbot', label: 'Customer Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'AI chatbots for customers. LIMITED RISK - requires transparency disclosure.', annex_ref: 'Art. 50(1)' },
  { value: 'customer_chatbot_advisory', label: 'Advisory Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'AI chatbot providing advice. Art. 50 transparency required.', annex_ref: 'Art. 50(1)' },
  { value: 'customer_chatbot_transactional', label: 'Transactional Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'AI chatbot executing transactions. Art. 50 + service-specific requirements.', annex_ref: 'Art. 50(1)' },
  { value: 'voice_assistant', label: 'Voice Assistant', category: 'customer_experience', risk: 'limited_risk', description: 'AI voice assistants. LIMITED RISK - requires transparency.', annex_ref: 'Art. 50(1)' },
  { value: 'voice_biometric_auth', label: 'Voice Biometric Auth', category: 'customer_experience', risk: 'high_risk', description: '⚠️ Biometric identification - may be HIGH-RISK under Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'customer_onboarding', label: 'Customer Onboarding', category: 'customer_experience', risk: 'context_dependent', description: 'AI for customer verification. HIGH-RISK if can deny accounts.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'customer_onboarding_identity', label: 'Identity Verification', category: 'customer_experience', risk: 'context_dependent', description: 'AI verifying customer identity. May involve biometrics.', annex_ref: 'Art. 6(3)' },
  { value: 'customer_segmentation', label: 'Customer Segmentation', category: 'customer_experience', risk: 'minimal_risk', description: 'AI segmenting customers for marketing.', annex_ref: 'Not listed' },
  { value: 'churn_prediction', label: 'Churn Prediction', category: 'customer_experience', risk: 'minimal_risk', description: 'AI predicting customer churn.', annex_ref: 'Not listed' },
  { value: 'cross_sell_upsell', label: 'Cross-sell / Upsell', category: 'customer_experience', risk: 'minimal_risk', description: 'AI for product recommendations.', annex_ref: 'Not listed' },
  { value: 'next_best_action', label: 'Next Best Action', category: 'customer_experience', risk: 'minimal_risk', description: 'AI determining optimal customer interaction.', annex_ref: 'Not listed' },
  { value: 'sentiment_analysis', label: 'Sentiment Analysis', category: 'customer_experience', risk: 'minimal_risk', description: 'AI analyzing customer sentiment.', annex_ref: 'Not listed' },
  { value: 'complaint_routing', label: 'Complaint Routing', category: 'customer_experience', risk: 'minimal_risk', description: 'AI routing complaints to handlers.', annex_ref: 'Not listed' },

  // === OPERATIONS ===
  { value: 'document_processing', label: 'Document Processing', category: 'operations', risk: 'minimal_risk', description: 'AI extracting data from documents.', annex_ref: 'Not listed' },
  { value: 'document_classification', label: 'Document Classification', category: 'operations', risk: 'minimal_risk', description: 'AI categorizing documents.', annex_ref: 'Not listed' },
  { value: 'ocr_data_extraction', label: 'OCR Data Extraction', category: 'operations', risk: 'minimal_risk', description: 'AI extracting text from images.', annex_ref: 'Not listed' },
  { value: 'email_screening', label: 'Email Screening', category: 'operations', risk: 'minimal_risk', description: 'AI screening incoming emails.', annex_ref: 'Not listed' },
  { value: 'contract_analysis', label: 'Contract Analysis', category: 'operations', risk: 'minimal_risk', description: 'AI analyzing contract terms.', annex_ref: 'Not listed' },
  { value: 'contract_review', label: 'Contract Review', category: 'operations', risk: 'minimal_risk', description: 'AI reviewing contracts for issues.', annex_ref: 'Not listed' },
  { value: 'process_automation', label: 'Process Automation', category: 'operations', risk: 'minimal_risk', description: 'AI-enhanced RPA.', annex_ref: 'Not listed' },
  { value: 'intelligent_automation', label: 'Intelligent Automation', category: 'operations', risk: 'minimal_risk', description: 'AI for complex process automation.', annex_ref: 'Not listed' },
  { value: 'data_quality_monitoring', label: 'Data Quality Monitoring', category: 'operations', risk: 'minimal_risk', description: 'AI monitoring data quality.', annex_ref: 'Not listed' },
  { value: 'reconciliation', label: 'Reconciliation', category: 'operations', risk: 'minimal_risk', description: 'AI for automated reconciliation.', annex_ref: 'Not listed' },

  // === RISK MODELS ===
  { value: 'internal_risk_models', label: 'Internal Risk Models', category: 'risk_models', risk: 'context_dependent', description: 'AI-enhanced internal capital models.', annex_ref: 'Art. 6(3)' },
  { value: 'irb_models', label: 'IRB Models', category: 'risk_models', risk: 'context_dependent', description: 'AI for Internal Ratings Based models.', annex_ref: 'Art. 6(3)' },
  { value: 'market_risk_modeling', label: 'Market Risk Modeling', category: 'risk_models', risk: 'minimal_risk', description: 'AI for market risk assessment.', annex_ref: 'Not listed' },
  { value: 'var_models', label: 'VaR Models', category: 'risk_models', risk: 'minimal_risk', description: 'AI for Value at Risk calculations.', annex_ref: 'Not listed' },
  { value: 'credit_risk_modeling', label: 'Credit Risk Modeling', category: 'risk_models', risk: 'context_dependent', description: 'AI for portfolio credit risk. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'pd_models', label: 'PD Models', category: 'risk_models', risk: 'context_dependent', description: 'AI for Probability of Default.', annex_ref: 'Art. 6(3)' },
  { value: 'lgd_models', label: 'LGD Models', category: 'risk_models', risk: 'minimal_risk', description: 'AI for Loss Given Default.', annex_ref: 'Not listed' },
  { value: 'operational_risk', label: 'Operational Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for operational risk assessment.', annex_ref: 'Not listed' },
  { value: 'liquidity_risk', label: 'Liquidity Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for liquidity risk.', annex_ref: 'Not listed' },
  { value: 'climate_risk', label: 'Climate Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for climate risk modeling.', annex_ref: 'Not listed' },
  { value: 'stress_testing', label: 'Stress Testing', category: 'risk_models', risk: 'minimal_risk', description: 'AI for stress test scenarios.', annex_ref: 'Not listed' },
  { value: 'model_validation', label: 'Model Validation', category: 'risk_models', risk: 'minimal_risk', description: 'AI assisting model validation.', annex_ref: 'Not listed' },

  // === SECURITY & ACCESS ===
  { value: 'access_control', label: 'Access Control', category: 'security', risk: 'context_dependent', description: 'AI for access control decisions.', annex_ref: 'Art. 6(3)' },
  { value: 'biometric_authentication', label: 'Biometric Authentication', category: 'security', risk: 'high_risk', description: '⚠️ Biometric ID may be HIGH-RISK under Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'facial_recognition', label: 'Facial Recognition', category: 'security', risk: 'high_risk', description: '⚠️ HIGH-RISK: Biometric identification. Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'behavioral_biometrics', label: 'Behavioral Biometrics', category: 'security', risk: 'context_dependent', description: 'AI analyzing behavioral patterns for auth.', annex_ref: 'Art. 6(3)' },
  { value: 'anomaly_detection_security', label: 'Security Anomaly Detection', category: 'security', risk: 'minimal_risk', description: 'AI detecting security anomalies.', annex_ref: 'Not listed' },
  { value: 'cyber_threat_detection', label: 'Cyber Threat Detection', category: 'security', risk: 'minimal_risk', description: 'AI detecting cyber threats.', annex_ref: 'Not listed' },

  // === PRICING & VALUATION ===
  { value: 'dynamic_pricing', label: 'Dynamic Pricing', category: 'pricing', risk: 'context_dependent', description: 'AI for dynamic price adjustment.', annex_ref: 'Art. 6(3)' },
  { value: 'asset_valuation', label: 'Asset Valuation', category: 'pricing', risk: 'minimal_risk', description: 'AI for asset valuation.', annex_ref: 'Not listed' },
  { value: 'collateral_valuation', label: 'Collateral Valuation', category: 'pricing', risk: 'context_dependent', description: 'AI valuing collateral. May affect credit decisions.', annex_ref: 'Art. 6(3)' },
  { value: 'real_estate_valuation', label: 'Real Estate Valuation', category: 'pricing', risk: 'context_dependent', description: 'AI valuing properties. May affect mortgage decisions.', annex_ref: 'Art. 6(3)' },
]

// Obligation interface
interface Obligation {
  id: string
  name: string
  description: string
  priority?: string
  source_articles?: string[]
  source_regulation?: string
  category?: string
  deadline?: string
  action_items?: string[]
  applies_to?: string[]
  summary?: string
  effort_level?: string
  legal_basis?: string
  what_it_means?: string
  implementation_steps?: string[]
  evidence_required?: string[]
  penalties?: string
  common_pitfalls?: string[]
  related_obligations?: string[]
  tools_and_templates?: string[]
  article_links?: { article: string; url: string }[]
}

export default function ObligationsPage() {
  const [formData, setFormData] = useState({
    institution_type: '',
    role: '',
    use_case: '',
    // Core contextual factors
    involves_natural_persons: true,
    involves_profiling: false,
    is_high_impact: false,
    fully_automated: false,
    uses_special_category_data: false,
    third_party_vendor: false,
    // Extended regulatory context
    cross_border_processing: false,
    large_scale_processing: false,
    systematic_monitoring: false,
    vulnerable_groups: false,
    safety_component: false,
    real_time_processing: false,
    affects_legal_rights: false,
    denies_service_access: false,
    // Art. 6(3) exemptions
    narrow_procedural_task: false,
    improves_human_activity: false,
    detects_patterns_only: false,
    preparatory_task: false,
    // Insurance specific
    life_health_insurance: false,
    // DORA specific
    critical_ict_service: false,
    outsourced_to_cloud: false,
    // GPAI specific (Art. 51-56)
    uses_gpai_model: false,
    gpai_with_systemic_risk: false,
    fine_tuned_gpai: false,
    // Sectoral regulation triggers
    provides_investment_advice: false,
    processes_payments: false,
    performs_aml_obligations: false,
  })
  
  const [customDescription, setCustomDescription] = useState('')
  const [modifyDescription, setModifyDescription] = useState('')
  const [results, setResults] = useState<any>(null)
  const [customResults, setCustomResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCustomLoading, setIsCustomLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [useCaseSearch, setUseCaseSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined')
  const [viewMode, setViewMode] = useState<'all' | 'by_regulation'>('all')
  const [showExemptions, setShowExemptions] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [modifyingUseCase, setModifyingUseCase] = useState<typeof USE_CASES[0] | null>(null)

  const filteredUseCases = USE_CASES.filter((uc) => {
    const matchesCategory = !selectedCategory || uc.category === selectedCategory
    const matchesSearch = !useCaseSearch || 
      uc.label.toLowerCase().includes(useCaseSearch.toLowerCase()) || 
      uc.description.toLowerCase().includes(useCaseSearch.toLowerCase()) ||
      (uc.annex_ref && uc.annex_ref.toLowerCase().includes(useCaseSearch.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const handleSubmit = async () => {
    if (!formData.use_case) return
    setIsLoading(true)
    setCustomResults(null)
    try {
      const response = await fetch('/api/obligations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error finding obligations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomSubmit = async () => {
    const description = modifyingUseCase 
      ? `Based on: ${modifyingUseCase.label}. ${modifyingUseCase.description}. User modification: ${modifyDescription}`
      : customDescription
    
    if (!description.trim()) return
    setIsCustomLoading(true)
    setResults(null)
    try {
      const response = await fetch('/api/obligations/analyze-custom', {
        method: 'POST',
        headers: getLLMHeaders(),
        body: JSON.stringify({
          description: description,
          institution_type: formData.institution_type || 'other',
          role: formData.role || 'deployer',
        }),
      })
      const data = await response.json()
      setCustomResults(data)
    } catch (error) {
      console.error('Error analyzing custom use case:', error)
    } finally {
      setIsCustomLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    if (risk === 'high_risk') return 'bg-red-100 text-red-800 border-red-300'
    if (risk === 'limited_risk') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (risk === 'minimal_risk') return 'bg-green-100 text-green-800 border-green-300'
    if (risk === 'exempt_from_high_risk') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getPriorityColor = (priority: string | undefined) => {
    if (priority === 'critical') return 'border-l-red-600 bg-red-50'
    if (priority === 'high') return 'border-l-orange-500 bg-orange-50'
    if (priority === 'medium') return 'border-l-yellow-500 bg-yellow-50'
    return 'border-l-gray-400 bg-gray-50'
  }

  const getAppliesTo = (obligation: Obligation) => {
    const roles = obligation.applies_to || []
    return roles.map(role => {
      if (role === 'provider') return { label: 'Provider', color: 'bg-blue-100 text-blue-700' }
      if (role === 'deployer') return { label: 'Deployer', color: 'bg-green-100 text-green-700' }
      if (role === 'third_party_user') return { label: 'Third-Party', color: 'bg-purple-100 text-purple-700' }
      return { label: role, color: 'bg-gray-100 text-gray-700' }
    })
  }

  const getRegulationLink = (regulation: string) => {
    if (regulation === 'eu_ai_act') return EURLEX_LINKS.ai_act
    if (regulation === 'gdpr') return EURLEX_LINKS.gdpr
    if (regulation === 'dora') return EURLEX_LINKS.dora
    return '#'
  }

  const getAllObligations = () => {
    if (!results) return []
    const all: Obligation[] = []
    if (results.ai_act_obligations) all.push(...results.ai_act_obligations)
    if (results.gdpr_obligations) all.push(...results.gdpr_obligations)
    if (results.dora_obligations) all.push(...results.dora_obligations)
    if (results.gpai_obligations) all.push(...results.gpai_obligations)
    if (results.sectoral_obligations) all.push(...results.sectoral_obligations)
    return all
  }

  const allObligations = getAllObligations()
  const selectedUseCase = USE_CASES.find(u => u.value === formData.use_case)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">AI Use Case Navigator</h1>
        <p className="text-gray-600">Comprehensive regulatory mapping for EU AI Act, GDPR, DORA, GPAI, and sectoral regulations. {USE_CASES.length} use cases mapped.</p>
      </div>

      {/* Legal Disclaimer */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
        <p className="font-semibold text-amber-800 mb-1">⚖️ Important Disclaimer</p>
        <p className="text-amber-700">
          This tool provides regulatory guidance based on EU AI Act (Regulation 2024/1689), GDPR, and DORA. 
          It does not constitute legal advice. Always consult your legal/compliance team.
        </p>
        <div className="mt-2 flex gap-2 flex-wrap">
          <a href={EURLEX_LINKS.ai_act} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            📜 AI Act Full Text (EUR-Lex)
          </a>
          <a href={EURLEX_LINKS.gdpr} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            📜 GDPR Full Text
          </a>
          <a href={EURLEX_LINKS.dora} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
            📜 DORA Full Text
          </a>
        </div>
      </div>

      {/* Step 1: Organization & Role */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step 1: Your Organization & Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Organization Type</label>
              <Select value={formData.institution_type} onValueChange={(v) => setFormData({ ...formData, institution_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {INSTITUTION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Your Role with AI</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {AI_ROLES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Checkbox checked={formData.third_party_vendor} onCheckedChange={(c) => setFormData({ ...formData, third_party_vendor: !!c })} />
            <label className="text-sm">I'm using AI from a third-party vendor (buying/licensing AI)</label>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Use Case Selection */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step 2: Select Your AI Use Case</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs - simplified to just predefined and custom */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant={activeTab === 'predefined' ? 'default' : 'outline'} onClick={() => { setActiveTab('predefined'); setModifyingUseCase(null); }} className="text-sm">
              📋 Choose from List ({USE_CASES.length})
            </Button>
            <Button variant={activeTab === 'custom' ? 'default' : 'outline'} onClick={() => { setActiveTab('custom'); setModifyingUseCase(null); }} className="text-sm">
              🆕 Describe Custom Use Case
            </Button>
          </div>

          {activeTab === 'predefined' && !modifyingUseCase && (
            <>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  className={`px-3 py-1 rounded-full text-xs border ${!selectedCategory ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({USE_CASES.length})
                </button>
                {USE_CASE_CATEGORIES.map((cat) => {
                  const count = USE_CASES.filter(u => u.category === cat.id).length
                  return (
                    <button
                      key={cat.id}
                      className={`px-3 py-1 rounded-full text-xs border ${selectedCategory === cat.id ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.icon} {cat.label} ({count})
                    </button>
                  )
                })}
              </div>

              {/* Search */}
              <Input
                value={useCaseSearch}
                onChange={(e) => setUseCaseSearch(e.target.value)}
                placeholder="Search use cases (e.g., 'credit', 'Annex III')..."
                className="mb-3 max-w-md"
              />

              {/* Use Case Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {filteredUseCases.map((uc) => (
                  <div
                    key={uc.value}
                    className={`relative p-3 rounded border transition-all ${formData.use_case === uc.value ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-gray-400'}`}
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => setFormData({ ...formData, use_case: uc.value })}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm">{uc.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${getRiskColor(uc.risk)}`}>
                          {uc.risk.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{uc.description}</p>
                      {uc.annex_ref && (
                        <p className="text-xs text-blue-600 mt-1">📌 {uc.annex_ref}</p>
                      )}
                    </div>
                    {/* Modify Button */}
                    <button
                      className="absolute bottom-2 right-2 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFormData({ ...formData, use_case: uc.value })
                        setModifyingUseCase(uc)
                        setModifyDescription('')
                      }}
                    >
                      ✏️ Modify
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Modify Mode - shown when a use case is being modified */}
          {modifyingUseCase && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setModifyingUseCase(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to list
                </button>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800">Base Use Case: {modifyingUseCase.label}</p>
                <p className="text-xs text-blue-700 mt-1">{modifyingUseCase.description}</p>
                <p className="text-xs text-blue-600 mt-1">Reference: {modifyingUseCase.annex_ref}</p>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Describe how your use case differs:</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
                  placeholder="Example: Our version also includes biometric verification, or: We only use it for corporate clients, not individuals..."
                  value={modifyDescription}
                  onChange={(e) => setModifyDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCustomSubmit} disabled={isCustomLoading || !modifyDescription.trim()}>
                  {isCustomLoading ? 'Analyzing...' : 'Analyze Modified Use Case'}
                </Button>
                <Button variant="outline" onClick={() => { setModifyingUseCase(null); handleSubmit(); }}>
                  Use Original Instead
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Describe your AI system and we'll identify applicable obligations.</p>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
                placeholder="Example: We use an AI model to analyze customer transaction patterns and flag accounts for potential fraud investigation..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
              <Button onClick={handleCustomSubmit} disabled={isCustomLoading || !customDescription.trim()}>
                {isCustomLoading ? 'Analyzing...' : 'Analyze Use Case'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Context Filters */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Step 3: Regulatory Context</span>
            <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="text-xs">
              {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'} ▼
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Core GDPR/AI Act Factors */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.involves_natural_persons} onCheckedChange={(c) => setFormData({ ...formData, involves_natural_persons: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">Affects Individuals</span>
                <p className="text-xs text-gray-500">Processes data about natural persons</p>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.involves_profiling} onCheckedChange={(c) => setFormData({ ...formData, involves_profiling: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">Involves Profiling</span>
                <p className="text-xs text-gray-500">GDPR Art. 4(4) - automated evaluation</p>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.fully_automated} onCheckedChange={(c) => setFormData({ ...formData, fully_automated: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">Fully Automated</span>
                <p className="text-xs text-gray-500">No human in the loop - triggers GDPR Art. 22</p>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.denies_service_access} onCheckedChange={(c) => setFormData({ ...formData, denies_service_access: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">⚠️ Can Deny Service</span>
                <p className="text-xs text-gray-500">May make use case HIGH-RISK (Annex III 5b)</p>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.affects_legal_rights} onCheckedChange={(c) => setFormData({ ...formData, affects_legal_rights: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">Affects Legal Rights</span>
                <p className="text-xs text-gray-500">Produces legal or significant effects</p>
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm p-2 border rounded hover:bg-gray-50">
              <Checkbox checked={formData.uses_special_category_data} onCheckedChange={(c) => setFormData({ ...formData, uses_special_category_data: !!c })} className="mt-0.5" />
              <div>
                <span className="font-medium">Special Category Data</span>
                <p className="text-xs text-gray-500">Health, biometric, race (GDPR Art. 9)</p>
              </div>
            </label>
          </div>

          {/* Art. 6(3) Exemptions */}
          <div className="mb-4">
            <button 
              className="flex items-center gap-2 text-sm font-medium text-blue-700"
              onClick={() => setShowExemptions(!showExemptions)}
            >
              {showExemptions ? '▼' : '▶'} Article 6(3) Exemptions - When HIGH-RISK may NOT apply
            </button>
            {showExemptions && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800 mb-2">
                  Even if listed in Annex III, an AI system is NOT high-risk if any of these apply:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={formData.narrow_procedural_task} onCheckedChange={(c) => setFormData({ ...formData, narrow_procedural_task: !!c })} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Art. 6(3)(a): Narrow Procedural Task</span>
                      <p className="text-xs text-gray-600">Performs a narrow procedural task only</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={formData.improves_human_activity} onCheckedChange={(c) => setFormData({ ...formData, improves_human_activity: !!c })} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Art. 6(3)(b): Improves Human Work</span>
                      <p className="text-xs text-gray-600">Improves result of completed human activity</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={formData.detects_patterns_only} onCheckedChange={(c) => setFormData({ ...formData, detects_patterns_only: !!c })} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Art. 6(3)(c): Pattern Detection Only</span>
                      <p className="text-xs text-gray-600">Detects patterns without replacing human assessment</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={formData.preparatory_task} onCheckedChange={(c) => setFormData({ ...formData, preparatory_task: !!c })} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Art. 6(3)(d): Preparatory Task</span>
                      <p className="text-xs text-gray-600">Preparatory task for human assessment</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Advanced Context (GDPR/DORA specific)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.cross_border_processing} onCheckedChange={(c) => setFormData({ ...formData, cross_border_processing: !!c })} />
                  Cross-border processing (GDPR Art. 56)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.large_scale_processing} onCheckedChange={(c) => setFormData({ ...formData, large_scale_processing: !!c })} />
                  Large-scale processing (DPIA trigger)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.systematic_monitoring} onCheckedChange={(c) => setFormData({ ...formData, systematic_monitoring: !!c })} />
                  Systematic monitoring (DPIA trigger)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.vulnerable_groups} onCheckedChange={(c) => setFormData({ ...formData, vulnerable_groups: !!c })} />
                  Affects vulnerable groups
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.safety_component} onCheckedChange={(c) => setFormData({ ...formData, safety_component: !!c })} />
                  Safety component (Art. 6(1))
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.real_time_processing} onCheckedChange={(c) => setFormData({ ...formData, real_time_processing: !!c })} />
                  Real-time processing
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.life_health_insurance} onCheckedChange={(c) => setFormData({ ...formData, life_health_insurance: !!c })} />
                  Life/health insurance (Annex III 5c)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.critical_ict_service} onCheckedChange={(c) => setFormData({ ...formData, critical_ict_service: !!c })} />
                  Critical ICT service (DORA Art. 28)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.outsourced_to_cloud} onCheckedChange={(c) => setFormData({ ...formData, outsourced_to_cloud: !!c })} />
                  Outsourced to cloud
                </label>
              </div>

              {/* GPAI (Foundation Models) Context */}
              <p className="text-sm font-medium mb-2 mt-4">GPAI / Foundation Models (Art. 51-56)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.uses_gpai_model} onCheckedChange={(c) => setFormData({ ...formData, uses_gpai_model: !!c })} />
                  Uses GPAI (GPT-4, Claude, etc.)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.gpai_with_systemic_risk} onCheckedChange={(c) => setFormData({ ...formData, gpai_with_systemic_risk: !!c })} />
                  GPAI with systemic risk (&gt;10^25 FLOPs)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.fine_tuned_gpai} onCheckedChange={(c) => setFormData({ ...formData, fine_tuned_gpai: !!c })} />
                  Fine-tuned GPAI model
                </label>
              </div>

              {/* Sectoral Regulation Triggers */}
              <p className="text-sm font-medium mb-2 mt-4">Sectoral Regulation Triggers</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.provides_investment_advice} onCheckedChange={(c) => setFormData({ ...formData, provides_investment_advice: !!c })} />
                  Investment advice (MiFID II)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.processes_payments} onCheckedChange={(c) => setFormData({ ...formData, processes_payments: !!c })} />
                  Processes payments (PSD2)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.performs_aml_obligations} onCheckedChange={(c) => setFormData({ ...formData, performs_aml_obligations: !!c })} />
                  AML/KYC obligations (AMLD6)
                </label>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isLoading || !formData.use_case} className="mt-4">
            {isLoading ? 'Finding Obligations...' : 'Find All Obligations'}
          </Button>
        </CardContent>
      </Card>

      {/* Custom/Modified Results */}
      {customResults && (
        <Card className="mb-4 border-2 border-purple-200">
          <CardHeader>
            <CardTitle>AI Analysis: {customResults.use_case_name || 'Custom Use Case'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(customResults.risk_classification || 'context_dependent')}`}>
                {(customResults.risk_classification || 'context_dependent').replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">{customResults.classification_basis}</span>
            </div>
            {customResults.ai_analysis && <p className="text-sm bg-blue-50 p-3 rounded">{customResults.ai_analysis}</p>}
            {customResults.warnings?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="font-medium text-yellow-800 text-sm mb-1">⚠️ Warnings</p>
                <ul className="text-sm text-yellow-700 list-disc pl-4">
                  {customResults.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {customResults.obligations?.length > 0 && (
              <div>
                <p className="font-medium mb-2">{customResults.obligations.length} Obligations Identified</p>
                <div className="space-y-2">
                  {customResults.obligations.map((ob: Obligation) => (
                    <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500">Risk Classification</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(results.risk_classification || 'context_dependent')}`}>
                    {(results.risk_classification || 'CONTEXT DEPENDENT').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Classification Basis</p>
                  <p className="text-sm font-medium">{results.classification_basis || 'Requires assessment'}</p>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{results.ai_act_obligations?.length || 0}</p>
                    <p className="text-xs text-gray-500">AI Act</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{results.gdpr_obligations?.length || 0}</p>
                    <p className="text-xs text-gray-500">GDPR</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{results.dora_obligations?.length || 0}</p>
                    <p className="text-xs text-gray-500">DORA</p>
                  </div>
                  {results.gpai_obligations?.length > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{results.gpai_obligations.length}</p>
                      <p className="text-xs text-gray-500">GPAI</p>
                    </div>
                  )}
                  {results.sectoral_obligations?.length > 0 && (
                    <div>
                      <p className="text-2xl font-bold text-cyan-600">{results.sectoral_obligations.length}</p>
                      <p className="text-xs text-gray-500">Sectoral</p>
                    </div>
                  )}
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{allObligations.length}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Legend with EUR-Lex links */}
          <div className="flex flex-wrap items-center gap-4 px-2 justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span className="text-sm"><strong>Provider</strong> = You develop/train AI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-500"></span>
                <span className="text-sm"><strong>Deployer</strong> = You use AI in operations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-500"></span>
                <span className="text-sm"><strong>Third-Party</strong> = You buy AI from vendor</span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {results.warnings?.length > 0 && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="py-3">
                <p className="font-medium text-yellow-800 text-sm mb-1">⚠️ Important Considerations</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {results.warnings.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* View Toggle */}
          <div className="flex gap-2">
            <Button variant={viewMode === 'all' ? 'default' : 'outline'} onClick={() => setViewMode('all')} className="text-sm">
              All Obligations ({allObligations.length})
            </Button>
            <Button variant={viewMode === 'by_regulation' ? 'default' : 'outline'} onClick={() => setViewMode('by_regulation')} className="text-sm">
              By Regulation
            </Button>
          </div>

          {/* All Obligations View */}
          {viewMode === 'all' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 mb-2">Showing all {allObligations.length} obligations, sorted by priority:</p>
              {allObligations
                .sort((a, b) => {
                  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
                  return (order[a.priority || 'low'] || 4) - (order[b.priority || 'low'] || 4)
                })
                .map((ob) => (
                  <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} />
                ))}
            </div>
          )}

          {/* By Regulation View */}
          {viewMode === 'by_regulation' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* AI Act */}
              <div>
                <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg font-bold text-sm flex justify-between items-center">
                  <span>EU AI ACT ({results.ai_act_obligations?.length || 0})</span>
                  <a href={EURLEX_LINKS.ai_act} target="_blank" rel="noopener noreferrer" className="text-white hover:underline text-xs">
                    📜 EUR-Lex
                  </a>
                </div>
                <div className="border border-t-0 rounded-b-lg p-2 space-y-2 max-h-[600px] overflow-y-auto">
                  {(results.ai_act_obligations || []).map((ob: Obligation) => (
                    <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} compact />
                  ))}
                  {(!results.ai_act_obligations || results.ai_act_obligations.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No AI Act obligations for this use case</p>
                  )}
                </div>
              </div>
              {/* GDPR */}
              <div>
                <div className="bg-green-600 text-white px-3 py-2 rounded-t-lg font-bold text-sm flex justify-between items-center">
                  <span>GDPR ({results.gdpr_obligations?.length || 0})</span>
                  <a href={EURLEX_LINKS.gdpr} target="_blank" rel="noopener noreferrer" className="text-white hover:underline text-xs">
                    📜 EUR-Lex
                  </a>
                </div>
                <div className="border border-t-0 rounded-b-lg p-2 space-y-2 max-h-[600px] overflow-y-auto">
                  {(results.gdpr_obligations || []).map((ob: Obligation) => (
                    <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} compact />
                  ))}
                  {(!results.gdpr_obligations || results.gdpr_obligations.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No GDPR obligations for this use case</p>
                  )}
                </div>
              </div>
              {/* DORA */}
              <div>
                <div className="bg-orange-600 text-white px-3 py-2 rounded-t-lg font-bold text-sm flex justify-between items-center">
                  <span>DORA ({results.dora_obligations?.length || 0})</span>
                  <a href={EURLEX_LINKS.dora} target="_blank" rel="noopener noreferrer" className="text-white hover:underline text-xs">
                    📜 EUR-Lex
                  </a>
                </div>
                <div className="border border-t-0 rounded-b-lg p-2 space-y-2 max-h-[600px] overflow-y-auto">
                  {(results.dora_obligations || []).map((ob: Obligation) => (
                    <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} compact />
                  ))}
                  {(!results.dora_obligations || results.dora_obligations.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-4">No DORA obligations for this use case</p>
                  )}
                </div>
              </div>

              {/* GPAI Obligations Column */}
              {results.gpai_obligations?.length > 0 && (
                <div>
                  <div className="bg-purple-600 text-white px-3 py-2 rounded-t-lg font-medium text-sm flex items-center justify-between">
                    <span>GPAI / Foundation Models ({results.gpai_obligations.length})</span>
                    <span className="text-xs">Art. 51-56</span>
                  </div>
                  <div className="border border-t-0 rounded-b-lg p-2 space-y-2 max-h-[600px] overflow-y-auto">
                    {results.gpai_obligations.map((ob: Obligation) => (
                      <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Sectoral Obligations Column */}
              {results.sectoral_obligations?.length > 0 && (
                <div>
                  <div className="bg-cyan-600 text-white px-3 py-2 rounded-t-lg font-medium text-sm flex items-center justify-between">
                    <span>Sectoral Regulations ({results.sectoral_obligations.length})</span>
                    <span className="text-xs">MiFID/PSD2/AML/etc.</span>
                  </div>
                  <div className="border border-t-0 rounded-b-lg p-2 space-y-2 max-h-[600px] overflow-y-auto">
                    {results.sectoral_obligations.map((ob: Obligation) => (
                      <ObligationItem key={ob.id} obligation={ob} getPriorityColor={getPriorityColor} getAppliesTo={getAppliesTo} getRegulationLink={getRegulationLink} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {results.timeline?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Compliance Timeline</CardTitle></CardHeader>
              <CardContent><TimelineView deadlines={results.timeline} /></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// Obligation Item Component
function ObligationItem({ 
  obligation, 
  getPriorityColor, 
  getAppliesTo,
  getRegulationLink,
  compact = false 
}: { 
  obligation: Obligation
  getPriorityColor: (p: string | undefined) => string
  getAppliesTo: (o: Obligation) => { label: string; color: string }[]
  getRegulationLink: (r: string) => string
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const roles = getAppliesTo(obligation)
  const regLabel = obligation.source_regulation === 'eu_ai_act' ? 'AI Act' : obligation.source_regulation?.toUpperCase()
  const regLink = getRegulationLink(obligation.source_regulation || '')

  return (
    <div className={`border-l-4 rounded-r ${getPriorityColor(obligation.priority)} ${compact ? 'p-2' : 'p-3'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              obligation.priority === 'critical' ? 'bg-red-600 text-white' :
              obligation.priority === 'high' ? 'bg-orange-500 text-white' :
              obligation.priority === 'medium' ? 'bg-yellow-600 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {obligation.priority || 'medium'}
            </span>
            {!compact && regLabel && (
              <a href={regLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-300">
                {regLabel} ↗
              </a>
            )}
            {roles.map(r => (
              <span key={r.label} className={`text-xs px-1.5 py-0.5 rounded ${r.color}`}>{r.label}</span>
            ))}
          </div>
          <h4 className={`font-semibold ${compact ? 'text-xs mt-1' : 'text-sm mt-1'}`}>{obligation.name}</h4>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 text-xs shrink-0">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Summary */}
      {obligation.summary && <p className={`text-gray-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{obligation.summary}</p>}
      {!obligation.summary && <p className={`text-gray-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{obligation.description}</p>}

      {/* Articles & Deadline - with direct article links */}
      <div className="flex flex-wrap gap-2 mt-2">
        {obligation.source_articles?.slice(0, 4).map(art => {
          const articleUrl = getArticleUrl(obligation.source_regulation || '', art)
          return (
            <a 
              key={art} 
              href={articleUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs bg-white border px-1.5 py-0.5 rounded hover:bg-blue-50 hover:border-blue-300"
              title={`View Article ${art} on official source`}
            >
              Art. {art} ↗
            </a>
          )
        })}
        {(obligation.source_articles?.length || 0) > 4 && (
          <span className="text-xs text-gray-400">+{(obligation.source_articles?.length || 0) - 4}</span>
        )}
        {obligation.deadline && (
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">📅 {obligation.deadline}</span>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3 text-sm">
          {/* What it means */}
          {obligation.what_it_means && (
            <div className="bg-blue-50 p-2 rounded">
              <p className="font-medium text-blue-800 text-xs mb-1">💡 What This Means</p>
              <p className="text-blue-900 text-xs">{obligation.what_it_means}</p>
            </div>
          )}

          {/* Action Items */}
          {obligation.action_items && obligation.action_items.length > 0 && (
            <div>
              <p className="font-medium text-xs mb-1">✅ Action Items</p>
              <ul className="text-xs space-y-0.5">
                {obligation.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-gray-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Implementation Steps */}
          {obligation.implementation_steps && obligation.implementation_steps.length > 0 && (
            <details className="group">
              <summary className="font-medium text-xs cursor-pointer">📋 Implementation Steps</summary>
              <div className="mt-1 text-xs space-y-0.5 pl-3 border-l-2 border-green-300">
                {obligation.implementation_steps.map((step, i) => <p key={i}>{step}</p>)}
              </div>
            </details>
          )}

          {/* Evidence Required */}
          {obligation.evidence_required && obligation.evidence_required.length > 0 && (
            <details className="group">
              <summary className="font-medium text-xs cursor-pointer">📁 Documentation Required</summary>
              <ul className="mt-1 text-xs space-y-0.5">
                {obligation.evidence_required.map((item, i) => (
                  <li key={i} className="flex items-start gap-1"><span className="text-green-500">✓</span>{item}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Pitfalls */}
          {obligation.common_pitfalls && obligation.common_pitfalls.length > 0 && (
            <details className="group">
              <summary className="font-medium text-xs cursor-pointer text-red-700">⚠️ Common Mistakes</summary>
              <ul className="mt-1 text-xs space-y-0.5 bg-red-50 p-2 rounded">
                {obligation.common_pitfalls.map((item, i) => (
                  <li key={i} className="flex items-start gap-1 text-red-700"><span>✗</span>{item}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Legal Basis */}
          {obligation.legal_basis && (
            <details className="group">
              <summary className="font-medium text-xs cursor-pointer">⚖️ Legal Text</summary>
              <p className="mt-1 text-xs text-gray-600 italic bg-gray-50 p-2 rounded">"{obligation.legal_basis}"</p>
            </details>
          )}

          {/* Penalties */}
          {obligation.penalties && (
            <div className="bg-red-50 p-2 rounded flex items-center gap-2">
              <span>💰</span>
              <span className="text-xs text-red-700"><strong>Penalty:</strong> {obligation.penalties}</span>
            </div>
          )}

          {/* Direct Link to Legislation */}
          <div className="flex gap-2">
            <a 
              href={regLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              📜 View full regulation on EUR-Lex ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
