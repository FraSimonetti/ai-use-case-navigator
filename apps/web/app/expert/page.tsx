'use client'

import { useState, useEffect, useMemo } from 'react'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'
import { ObligationCard } from '@/components/obligations/obligation-card'
import { TimelineView } from '@/components/obligations/timeline-view'
import { ChatWidget } from '@/components/expert/chat-widget'

// ─── Shared Data Arrays (mirrored from obligations page) ────────────────────

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
  { value: 'law_firm', label: 'Law Firm / Legal Services' },
  { value: 'other', label: 'Other Organization' },
]

const AI_ROLES = [
  { value: 'deployer', label: 'Deployer - I use AI built by others' },
  { value: 'provider', label: 'Provider - I develop AI for others' },
  { value: 'provider_and_deployer', label: 'Both - I build and use my own AI' },
  { value: 'importer', label: 'Importer - I bring non-EU AI to market' },
]

const USE_CASE_CATEGORIES = [
  { id: 'credit_lending', label: 'Credit & Lending', annex: 'III.5(b)' },
  { id: 'risk_compliance', label: 'Risk & Compliance', annex: 'Various' },
  { id: 'trading_investment', label: 'Trading & Investment', annex: 'N/A' },
  { id: 'insurance', label: 'Insurance', annex: 'III.5(c)*' },
  { id: 'hr_employment', label: 'HR & Employment', annex: 'III.4' },
  { id: 'customer_experience', label: 'Customer Experience', annex: 'Art.50' },
  { id: 'operations', label: 'Operations', annex: 'N/A' },
  { id: 'risk_models', label: 'Risk Models', annex: 'Various' },
  { id: 'security', label: 'Security & Access', annex: 'III.1' },
  { id: 'pricing', label: 'Pricing & Valuation', annex: 'Various' },
  { id: 'legal_services', label: 'Legal Services', annex: 'III.8*' },
]

const USE_CASES = [
  // Credit & Lending
  { value: 'credit_scoring', label: 'Credit Scoring (Consumer)', category: 'credit_lending', risk: 'high_risk', description: 'AI evaluating creditworthiness of natural persons. HIGH-RISK under Annex III 5(b).', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_scoring_consumer', label: 'Credit Scoring - Consumer Credit', category: 'credit_lending', risk: 'high_risk', description: 'AI scoring individuals for consumer credit products. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_scoring_corporate', label: 'Credit Scoring - Corporate/B2B', category: 'credit_lending', risk: 'minimal_risk', description: 'AI scoring businesses (not natural persons). NOT high-risk - Annex III 5(b) covers only natural persons.', annex_ref: 'Not covered' },
  { value: 'corporate_risk_opinion', label: 'Corporate Risk Opinion (Multi-Agent)', category: 'credit_lending', risk: 'minimal_risk', description: 'Multi-agent system producing B2B/corporate risk opinion. NOT high-risk.', annex_ref: 'Not covered' },
  { value: 'loan_origination', label: 'Loan Origination', category: 'credit_lending', risk: 'high_risk', description: 'AI-assisted loan application processing for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'loan_approval', label: 'Loan Approval Decision', category: 'credit_lending', risk: 'high_risk', description: 'AI making loan approval decisions for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'loan_pricing', label: 'Loan Pricing', category: 'credit_lending', risk: 'context_dependent', description: 'AI determining interest rates. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'mortgage_underwriting', label: 'Mortgage Underwriting', category: 'credit_lending', risk: 'high_risk', description: 'AI for mortgage assessment and approval. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'credit_limit_setting', label: 'Credit Limit Setting', category: 'credit_lending', risk: 'high_risk', description: 'AI determining credit limits for individuals. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'affordability_assessment', label: 'Affordability Assessment', category: 'credit_lending', risk: 'high_risk', description: 'AI assessing affordability for credit decisions. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'collections_recovery', label: 'Collections & Recovery', category: 'credit_lending', risk: 'context_dependent', description: 'AI prioritizing debt collection. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'debt_restructuring', label: 'Debt Restructuring', category: 'credit_lending', risk: 'context_dependent', description: 'AI for debt restructuring decisions. Context-dependent.', annex_ref: 'Art. 6(3)' },
  // Risk & Compliance
  { value: 'fraud_detection', label: 'Fraud Detection (General)', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting fraudulent transactions.', annex_ref: 'Art. 6(3) / Annex III 5(b)' },
  { value: 'fraud_detection_card', label: 'Card Fraud Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting credit/debit card fraud.', annex_ref: 'Art. 6(3)' },
  { value: 'fraud_detection_account', label: 'Account Takeover Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting unauthorized account access.', annex_ref: 'Art. 6(3)' },
  { value: 'fraud_detection_application', label: 'Application Fraud Detection', category: 'risk_compliance', risk: 'high_risk', description: 'AI detecting fraud in credit applications. HIGH-RISK.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'aml_kyc', label: 'AML/KYC Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI for anti-money laundering screening.', annex_ref: 'Art. 6(3) / Annex III 5(b)' },
  { value: 'aml_transaction_monitoring', label: 'AML Transaction Monitoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI monitoring for suspicious transactions.', annex_ref: 'Art. 6(3)' },
  { value: 'aml_customer_risk_scoring', label: 'AML Customer Risk Scoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI scoring customer AML risk.', annex_ref: 'Art. 6(3)' },
  { value: 'sanctions_screening', label: 'Sanctions Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI screening against sanctions lists.', annex_ref: 'Art. 6(3)' },
  { value: 'pep_screening', label: 'PEP Screening', category: 'risk_compliance', risk: 'context_dependent', description: 'AI screening for Politically Exposed Persons.', annex_ref: 'Art. 6(3)' },
  { value: 'transaction_monitoring', label: 'Transaction Monitoring', category: 'risk_compliance', risk: 'context_dependent', description: 'AI monitoring for suspicious activity patterns.', annex_ref: 'Art. 6(3)' },
  { value: 'trade_surveillance', label: 'Trade Surveillance', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting market abuse and manipulation.', annex_ref: 'Art. 6(3)' },
  { value: 'market_abuse_detection', label: 'Market Abuse Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting MAR violations.', annex_ref: 'Art. 6(3)' },
  { value: 'insider_trading_detection', label: 'Insider Trading Detection', category: 'risk_compliance', risk: 'context_dependent', description: 'AI detecting potential insider trading.', annex_ref: 'Art. 6(3)' },
  { value: 'regulatory_reporting', label: 'Regulatory Reporting', category: 'risk_compliance', risk: 'minimal_risk', description: 'AI automating regulatory report generation.', annex_ref: 'Not listed' },
  { value: 'compliance_monitoring', label: 'Compliance Monitoring', category: 'risk_compliance', risk: 'minimal_risk', description: 'AI monitoring compliance with internal policies.', annex_ref: 'Not listed' },
  // Trading & Investment
  { value: 'algorithmic_trading', label: 'Algorithmic Trading', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for automated trading. Regulated under MiFID II.', annex_ref: 'Not listed' },
  { value: 'high_frequency_trading', label: 'High Frequency Trading', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for HFT. Regulated under MiFID II Art. 17.', annex_ref: 'Not listed' },
  { value: 'robo_advisory', label: 'Robo-Advisory (General)', category: 'trading_investment', risk: 'context_dependent', description: 'AI providing investment advice.', annex_ref: 'Art. 6(3)' },
  { value: 'robo_advisory_retail', label: 'Robo-Advisory - Retail Clients', category: 'trading_investment', risk: 'context_dependent', description: 'AI investment advice for retail clients.', annex_ref: 'Art. 6(3)' },
  { value: 'robo_advisory_professional', label: 'Robo-Advisory - Professional', category: 'trading_investment', risk: 'minimal_risk', description: 'AI investment advice for professionals.', annex_ref: 'Not listed' },
  { value: 'portfolio_optimization', label: 'Portfolio Optimization', category: 'trading_investment', risk: 'minimal_risk', description: 'AI optimizing investment portfolios.', annex_ref: 'Not listed' },
  { value: 'portfolio_rebalancing', label: 'Portfolio Rebalancing', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for automatic portfolio rebalancing.', annex_ref: 'Not listed' },
  { value: 'best_execution', label: 'Best Execution', category: 'trading_investment', risk: 'minimal_risk', description: 'AI achieving best execution for orders.', annex_ref: 'Not listed' },
  { value: 'market_making', label: 'Market Making', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for liquidity provision.', annex_ref: 'Not listed' },
  { value: 'smart_order_routing', label: 'Smart Order Routing', category: 'trading_investment', risk: 'minimal_risk', description: 'AI routing orders to optimal venues.', annex_ref: 'Not listed' },
  { value: 'esg_scoring', label: 'ESG Scoring', category: 'trading_investment', risk: 'minimal_risk', description: 'AI for ESG analysis and scoring.', annex_ref: 'Not listed' },
  // Insurance
  { value: 'insurance_pricing_life', label: 'Insurance Pricing - Life', category: 'insurance', risk: 'high_risk', description: 'HIGH-RISK: AI for life insurance pricing. Annex III 5(c).', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_pricing_health', label: 'Insurance Pricing - Health', category: 'insurance', risk: 'high_risk', description: 'HIGH-RISK: AI for health insurance pricing. Annex III 5(c).', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_pricing_property', label: 'Insurance Pricing - Property', category: 'insurance', risk: 'context_dependent', description: 'AI for property insurance pricing. NOT high-risk - context-dependent.', annex_ref: 'Not listed' },
  { value: 'insurance_pricing_motor', label: 'Insurance Pricing - Motor', category: 'insurance', risk: 'context_dependent', description: 'AI for motor insurance pricing. NOT high-risk - context-dependent.', annex_ref: 'Not listed' },
  { value: 'insurance_pricing_liability', label: 'Insurance Pricing - Liability', category: 'insurance', risk: 'context_dependent', description: 'AI for liability insurance pricing. NOT high-risk.', annex_ref: 'Not listed' },
  { value: 'insurance_underwriting_life', label: 'Insurance Underwriting - Life', category: 'insurance', risk: 'high_risk', description: 'HIGH-RISK: AI for life insurance underwriting.', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_underwriting_health', label: 'Insurance Underwriting - Health', category: 'insurance', risk: 'high_risk', description: 'HIGH-RISK: AI for health insurance underwriting.', annex_ref: 'Annex III, point 5(c)' },
  { value: 'insurance_underwriting_property', label: 'Insurance Underwriting - Property', category: 'insurance', risk: 'context_dependent', description: 'AI for property insurance underwriting. Context-dependent.', annex_ref: 'Not listed' },
  { value: 'claims_processing', label: 'Claims Processing', category: 'insurance', risk: 'context_dependent', description: 'AI for claims assessment. May be high-risk if denies claims.', annex_ref: 'Art. 6(3)' },
  { value: 'claims_triage', label: 'Claims Triage', category: 'insurance', risk: 'minimal_risk', description: 'AI routing claims to appropriate handlers.', annex_ref: 'Not listed' },
  { value: 'claims_fraud_detection', label: 'Claims Fraud Detection', category: 'insurance', risk: 'context_dependent', description: 'AI detecting fraudulent claims.', annex_ref: 'Art. 6(3)' },
  { value: 'telematics_pricing', label: 'Telematics Pricing', category: 'insurance', risk: 'context_dependent', description: 'AI pricing based on driving behavior data.', annex_ref: 'Art. 6(3)' },
  // HR & Employment
  { value: 'cv_screening', label: 'CV/Resume Screening', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI filtering job applications. Annex III point 4(a).', annex_ref: 'Annex III, point 4(a)' },
  { value: 'cv_parsing', label: 'CV Parsing (Data Extraction)', category: 'hr_employment', risk: 'context_dependent', description: 'AI extracting data from CVs. May qualify for Art. 6(3) exemption.', annex_ref: 'Art. 6(3)(d)' },
  { value: 'candidate_ranking', label: 'Candidate Ranking', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI scoring/ranking candidates.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'candidate_matching', label: 'Candidate Matching', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI matching candidates to roles.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'interview_analysis', label: 'Interview Analysis', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI analyzing interviews.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'video_interview_analysis', label: 'Video Interview Analysis', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI analyzing video interviews.', annex_ref: 'Annex III, point 4(a)' },
  { value: 'employee_performance', label: 'Performance Evaluation', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI evaluating employee performance.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'performance_prediction', label: 'Performance Prediction', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI predicting employee performance.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'promotion_decisions', label: 'Promotion Decisions', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI influencing promotions.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'termination_decisions', label: 'Termination Decisions', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI involved in termination decisions.', annex_ref: 'Annex III, point 4(b)' },
  { value: 'employee_monitoring', label: 'Employee Monitoring', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI monitoring employee behavior.', annex_ref: 'Annex III, point 4(c)' },
  { value: 'productivity_monitoring', label: 'Productivity Monitoring', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI monitoring productivity.', annex_ref: 'Annex III, point 4(c)' },
  { value: 'task_allocation', label: 'Task Allocation', category: 'hr_employment', risk: 'high_risk', description: 'HIGH-RISK: AI allocating work tasks.', annex_ref: 'Annex III, point 4(c)' },
  { value: 'workforce_planning', label: 'Workforce Planning', category: 'hr_employment', risk: 'context_dependent', description: 'AI forecasting workforce needs. Context-dependent.', annex_ref: 'Art. 6(3)' },
  { value: 'compensation_analysis', label: 'Compensation Analysis', category: 'hr_employment', risk: 'context_dependent', description: 'AI analyzing compensation equity.', annex_ref: 'Art. 6(3)' },
  { value: 'talent_retention', label: 'Talent Retention', category: 'hr_employment', risk: 'context_dependent', description: 'AI predicting employee flight risk.', annex_ref: 'Art. 6(3)' },
  { value: 'learning_recommendation', label: 'Learning Recommendations', category: 'hr_employment', risk: 'minimal_risk', description: 'AI recommending training courses.', annex_ref: 'Not listed' },
  // Customer Experience
  { value: 'customer_chatbot', label: 'Customer Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'LIMITED RISK - requires transparency disclosure.', annex_ref: 'Art. 50(1)' },
  { value: 'customer_chatbot_advisory', label: 'Advisory Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'AI chatbot providing advice. Art. 50 transparency required.', annex_ref: 'Art. 50(1)' },
  { value: 'customer_chatbot_transactional', label: 'Transactional Chatbot', category: 'customer_experience', risk: 'limited_risk', description: 'AI chatbot executing transactions.', annex_ref: 'Art. 50(1)' },
  { value: 'voice_assistant', label: 'Voice Assistant', category: 'customer_experience', risk: 'limited_risk', description: 'LIMITED RISK - requires transparency.', annex_ref: 'Art. 50(1)' },
  { value: 'voice_biometric_auth', label: 'Voice Biometric Auth', category: 'customer_experience', risk: 'high_risk', description: 'Biometric identification - may be HIGH-RISK under Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'customer_onboarding', label: 'Customer Onboarding', category: 'customer_experience', risk: 'context_dependent', description: 'AI for customer verification. HIGH-RISK if can deny accounts.', annex_ref: 'Annex III, point 5(b)' },
  { value: 'customer_onboarding_identity', label: 'Identity Verification', category: 'customer_experience', risk: 'context_dependent', description: 'AI verifying customer identity.', annex_ref: 'Art. 6(3)' },
  { value: 'customer_segmentation', label: 'Customer Segmentation', category: 'customer_experience', risk: 'minimal_risk', description: 'AI segmenting customers for marketing.', annex_ref: 'Not listed' },
  { value: 'churn_prediction', label: 'Churn Prediction', category: 'customer_experience', risk: 'minimal_risk', description: 'AI predicting customer churn.', annex_ref: 'Not listed' },
  { value: 'cross_sell_upsell', label: 'Cross-sell / Upsell', category: 'customer_experience', risk: 'minimal_risk', description: 'AI for product recommendations.', annex_ref: 'Not listed' },
  { value: 'next_best_action', label: 'Next Best Action', category: 'customer_experience', risk: 'minimal_risk', description: 'AI determining optimal customer interaction.', annex_ref: 'Not listed' },
  { value: 'sentiment_analysis', label: 'Sentiment Analysis', category: 'customer_experience', risk: 'minimal_risk', description: 'AI analyzing customer sentiment.', annex_ref: 'Not listed' },
  { value: 'complaint_routing', label: 'Complaint Routing', category: 'customer_experience', risk: 'minimal_risk', description: 'AI routing complaints to handlers.', annex_ref: 'Not listed' },
  // Operations
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
  // Risk Models
  { value: 'internal_risk_models', label: 'Internal Risk Models', category: 'risk_models', risk: 'context_dependent', description: 'AI-enhanced internal capital models.', annex_ref: 'Art. 6(3)' },
  { value: 'irb_models', label: 'IRB Models', category: 'risk_models', risk: 'context_dependent', description: 'AI for Internal Ratings Based models.', annex_ref: 'Art. 6(3)' },
  { value: 'market_risk_modeling', label: 'Market Risk Modeling', category: 'risk_models', risk: 'minimal_risk', description: 'AI for market risk assessment.', annex_ref: 'Not listed' },
  { value: 'var_models', label: 'VaR Models', category: 'risk_models', risk: 'minimal_risk', description: 'AI for Value at Risk calculations.', annex_ref: 'Not listed' },
  { value: 'credit_risk_modeling', label: 'Credit Risk Modeling', category: 'risk_models', risk: 'context_dependent', description: 'AI for portfolio credit risk.', annex_ref: 'Art. 6(3)' },
  { value: 'pd_models', label: 'PD Models', category: 'risk_models', risk: 'context_dependent', description: 'AI for Probability of Default.', annex_ref: 'Art. 6(3)' },
  { value: 'lgd_models', label: 'LGD Models', category: 'risk_models', risk: 'minimal_risk', description: 'AI for Loss Given Default.', annex_ref: 'Not listed' },
  { value: 'operational_risk', label: 'Operational Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for operational risk assessment.', annex_ref: 'Not listed' },
  { value: 'liquidity_risk', label: 'Liquidity Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for liquidity risk.', annex_ref: 'Not listed' },
  { value: 'climate_risk', label: 'Climate Risk', category: 'risk_models', risk: 'minimal_risk', description: 'AI for climate risk modeling.', annex_ref: 'Not listed' },
  { value: 'stress_testing', label: 'Stress Testing', category: 'risk_models', risk: 'minimal_risk', description: 'AI for stress test scenarios.', annex_ref: 'Not listed' },
  { value: 'model_validation', label: 'Model Validation', category: 'risk_models', risk: 'minimal_risk', description: 'AI assisting model validation.', annex_ref: 'Not listed' },
  // Security & Access
  { value: 'access_control', label: 'Access Control', category: 'security', risk: 'context_dependent', description: 'AI for access control decisions.', annex_ref: 'Art. 6(3)' },
  { value: 'biometric_authentication', label: 'Biometric Authentication', category: 'security', risk: 'high_risk', description: 'HIGH-RISK: Biometric ID. Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'facial_recognition', label: 'Facial Recognition', category: 'security', risk: 'high_risk', description: 'HIGH-RISK: Biometric identification. Annex III point 1.', annex_ref: 'Annex III, point 1' },
  { value: 'behavioral_biometrics', label: 'Behavioral Biometrics', category: 'security', risk: 'context_dependent', description: 'AI analyzing behavioral patterns for auth.', annex_ref: 'Art. 6(3)' },
  { value: 'anomaly_detection_security', label: 'Security Anomaly Detection', category: 'security', risk: 'minimal_risk', description: 'AI detecting security anomalies.', annex_ref: 'Not listed' },
  { value: 'cyber_threat_detection', label: 'Cyber Threat Detection', category: 'security', risk: 'minimal_risk', description: 'AI detecting cyber threats.', annex_ref: 'Not listed' },
  // Pricing & Valuation
  { value: 'dynamic_pricing', label: 'Dynamic Pricing', category: 'pricing', risk: 'context_dependent', description: 'AI for dynamic price adjustment.', annex_ref: 'Art. 6(3)' },
  { value: 'asset_valuation', label: 'Asset Valuation', category: 'pricing', risk: 'minimal_risk', description: 'AI for asset valuation.', annex_ref: 'Not listed' },
  { value: 'collateral_valuation', label: 'Collateral Valuation', category: 'pricing', risk: 'context_dependent', description: 'AI valuing collateral.', annex_ref: 'Art. 6(3)' },
  { value: 'real_estate_valuation', label: 'Real Estate Valuation', category: 'pricing', risk: 'context_dependent', description: 'AI valuing properties.', annex_ref: 'Art. 6(3)' },
  // Legal Services
  { value: 'legal_document_review', label: 'Legal Document Review', category: 'legal_services', risk: 'minimal_risk', description: 'AI reviewing legal documents. Analysis tool with lawyer oversight.', annex_ref: 'Not listed' },
  { value: 'legal_research', label: 'Legal Research & Case Law', category: 'legal_services', risk: 'minimal_risk', description: 'AI searching case law and precedents.', annex_ref: 'Not listed' },
  { value: 'ediscovery', label: 'eDiscovery', category: 'legal_services', risk: 'minimal_risk', description: 'AI for electronic discovery in litigation.', annex_ref: 'Not listed' },
  { value: 'contract_drafting_legal', label: 'Contract Drafting (Legal)', category: 'legal_services', risk: 'minimal_risk', description: 'AI-assisted contract generation.', annex_ref: 'Not listed' },
  { value: 'due_diligence_legal', label: 'Legal Due Diligence', category: 'legal_services', risk: 'minimal_risk', description: 'AI analyzing documents for M&A.', annex_ref: 'Not listed' },
  { value: 'legal_brief_generation', label: 'Legal Brief Generation', category: 'legal_services', risk: 'minimal_risk', description: 'AI drafting legal briefs.', annex_ref: 'Not listed' },
  { value: 'case_outcome_prediction', label: 'Case Outcome Prediction', category: 'legal_services', risk: 'context_dependent', description: 'AI predicting litigation outcomes. Context-dependent.', annex_ref: 'Art. 6(3) / Annex III 8' },
  { value: 'client_intake_legal', label: 'Client Intake (Legal)', category: 'legal_services', risk: 'minimal_risk', description: 'AI triaging legal inquiries.', annex_ref: 'Not listed' },
  { value: 'legal_billing_tracking', label: 'Legal Billing & Time Tracking', category: 'legal_services', risk: 'minimal_risk', description: 'AI tracking billable hours.', annex_ref: 'Not listed' },
  { value: 'legal_compliance_monitoring', label: 'Legal Compliance Monitoring', category: 'legal_services', risk: 'minimal_risk', description: 'AI monitoring client compliance.', annex_ref: 'Not listed' },
  { value: 'court_filing_automation', label: 'Court Filing Automation', category: 'legal_services', risk: 'minimal_risk', description: 'AI preparing court filings.', annex_ref: 'Not listed' },
  { value: 'witness_credibility_analysis', label: 'Witness Credibility Analysis', category: 'legal_services', risk: 'high_risk', description: 'HIGH-RISK: AI analyzing witness testimony.', annex_ref: 'Annex III, point 8' },
]

// ─── Use-case auto-defaults ──────────────────────────────────────────────────

const USE_CASE_DEFAULTS: Record<string, Partial<FormData>> = {
  credit_scoring: { involves_natural_persons: true, is_high_impact: true },
  credit_scoring_consumer: { involves_natural_persons: true, is_high_impact: true },
  loan_origination: { involves_natural_persons: true, is_high_impact: true },
  loan_approval: { involves_natural_persons: true, is_high_impact: true, fully_automated: true, denies_service_access: true },
  mortgage_underwriting: { involves_natural_persons: true, is_high_impact: true },
  credit_limit_setting: { involves_natural_persons: true, is_high_impact: true },
  affordability_assessment: { involves_natural_persons: true, is_high_impact: true },
  insurance_pricing_life: { involves_natural_persons: true, life_health_insurance: true, is_high_impact: true },
  insurance_pricing_health: { involves_natural_persons: true, life_health_insurance: true, uses_special_category_data: true, is_high_impact: true },
  insurance_underwriting_life: { involves_natural_persons: true, life_health_insurance: true, is_high_impact: true },
  insurance_underwriting_health: { involves_natural_persons: true, life_health_insurance: true, uses_special_category_data: true, is_high_impact: true },
  cv_screening: { involves_natural_persons: true, is_high_impact: true },
  candidate_ranking: { involves_natural_persons: true, is_high_impact: true },
  employee_performance: { involves_natural_persons: true, is_high_impact: true },
  employee_monitoring: { involves_natural_persons: true },
  customer_chatbot: { involves_natural_persons: true },
  biometric_authentication: { involves_natural_persons: true, uses_special_category_data: true },
  facial_recognition: { involves_natural_persons: true, uses_special_category_data: true },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  use_case_description: string
  institution_type: string
  role: string
  use_case: string
  third_party_vendor: boolean
  involves_natural_persons: boolean
  fully_automated: boolean
  denies_service_access: boolean
  affects_legal_rights: boolean
  uses_special_category_data: boolean
  vulnerable_groups: boolean
  is_high_impact: boolean
  involves_profiling: boolean
  uses_gpai_model: boolean
  gpai_with_systemic_risk: boolean
  safety_component: boolean
  cross_border_processing: boolean
  critical_ict_service: boolean
  life_health_insurance: boolean
  provides_investment_advice: boolean
  processes_payments: boolean
  performs_aml_obligations: boolean
}

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
}

interface TimelineEvent {
  date: string
  event: string
  impact: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResults = any

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRiskBadgeClasses(risk: string): string {
  switch (risk) {
    case 'high_risk': return 'bg-red-100 text-red-800 border-red-300'
    case 'limited_risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'minimal_risk': return 'bg-green-100 text-green-800 border-green-300'
    case 'context_dependent': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'exempt_from_high_risk': return 'bg-blue-100 text-blue-800 border-blue-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function getRiskLabel(risk: string): string {
  if (risk === 'high_risk') return 'HIGH-RISK'
  if (risk === 'limited_risk') return 'LIMITED RISK'
  if (risk === 'minimal_risk') return 'MINIMAL RISK'
  if (risk === 'context_dependent') return 'CONTEXT-DEPENDENT'
  if (risk === 'exempt_from_high_risk') return 'EXEMPT FROM HIGH-RISK'
  return risk.replace(/_/g, ' ').toUpperCase()
}

function formatRiskLevel(risk: string): string {
  return risk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const INITIAL_FORM: FormData = {
  use_case_description: '',
  institution_type: '',
  role: '',
  use_case: '',
  third_party_vendor: false,
  involves_natural_persons: true,
  fully_automated: false,
  denies_service_access: false,
  affects_legal_rights: false,
  uses_special_category_data: false,
  vulnerable_groups: false,
  is_high_impact: false,
  involves_profiling: false,
  uses_gpai_model: false,
  gpai_with_systemic_risk: false,
  safety_component: false,
  cross_border_processing: false,
  critical_ict_service: false,
  life_health_insurance: false,
  provides_investment_advice: false,
  processes_payments: false,
  performs_aml_obligations: false,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpertPage() {
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM })
  const [results, setResults] = useState<ApiResults>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [useCaseSearch, setUseCaseSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSectoral, setShowSectoral] = useState(false)
  const [expandedRegulation, setExpandedRegulation] = useState<string | null>(null)

  useEffect(() => {
    setHasConfig(hasLLMConfig())
  }, [])

  // Filtered use cases
  const filteredUseCases = useMemo(() => {
    return USE_CASES.filter((uc) => {
      const matchesCategory = !selectedCategory || uc.category === selectedCategory
      const matchesSearch = !useCaseSearch ||
        uc.label.toLowerCase().includes(useCaseSearch.toLowerCase()) ||
        uc.description.toLowerCase().includes(useCaseSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, useCaseSearch])

  const selectedUseCase = USE_CASES.find(u => u.value === formData.use_case)

  // When user selects a use case, auto-set context booleans
  const handleUseCaseSelect = (value: string) => {
    const defaults = USE_CASE_DEFAULTS[value] || {}
    setFormData(prev => ({
      ...prev,
      use_case: value,
      ...defaults,
    }))
  }

  const updateForm = (key: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.use_case && !formData.use_case_description) return
    setIsLoading(true)
    setResults(null)
    try {
      const response = await fetch('/api/obligations/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const data = await response.json()
      setResults(data)
      // Scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error finding obligations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!results) return
    setIsGeneratingPDF(true)

    try {
      // Fetch narrative from backend (optional)
      let narrative = ''
      if (hasConfig) {
        try {
          const narrativeResponse = await fetch('/api/expert/generate-report', {
            method: 'POST',
            headers: getLLMHeaders(),
            body: JSON.stringify({
              classification: {
                risk_level: results.risk_classification,
                classification_basis: results.classification_basis,
                use_case: formData.use_case,
                institution_type: formData.institution_type,
                role: formData.role,
              },
              obligations: {
                ai_act: results.ai_act_obligations || [],
                gdpr: results.gdpr_obligations || [],
                dora: results.dora_obligations || [],
                gpai: results.gpai_obligations || [],
                sectoral: results.sectoral_obligations || [],
                total_count: allObligations.length,
              },
              collected_data: formData,
            }),
          })
          if (narrativeResponse.ok) {
            const narrativeData = await narrativeResponse.json()
            narrative = narrativeData.narrative || ''
          }
        } catch {
          // Continue without narrative
        }
      }

      const { generatePDFReport } = await import('@/components/expert/pdf-generator')
      generatePDFReport({
        classification: {
          risk_level: results.risk_classification || 'context_dependent',
          classification_basis: results.classification_basis || '',
          use_case: formData.use_case,
          institution_type: formData.institution_type,
          role: formData.role,
        },
        obligations: {
          ai_act: results.ai_act_obligations || [],
          gdpr: results.gdpr_obligations || [],
          dora: results.dora_obligations || [],
          gpai: results.gpai_obligations || [],
          sectoral: results.sectoral_obligations || [],
          total_count: allObligations.length,
        },
        timeline: results.timeline || [],
        warnings: results.warnings || [],
        collectedData: formData as unknown as Record<string, unknown>,
        narrative,
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM })
    setResults(null)
    setSelectedCategory(null)
    setUseCaseSearch('')
    setShowAdvanced(false)
    setShowSectoral(false)
    setExpandedRegulation(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Collect all obligations from results
  const allObligations: Obligation[] = useMemo(() => {
    if (!results) return []
    const all: Obligation[] = []
    if (results.ai_act_obligations) all.push(...results.ai_act_obligations)
    if (results.gdpr_obligations) all.push(...results.gdpr_obligations)
    if (results.dora_obligations) all.push(...results.dora_obligations)
    if (results.gpai_obligations) all.push(...results.gpai_obligations)
    if (results.sectoral_obligations) all.push(...results.sectoral_obligations)
    return all
  }, [results])

  // Extract top suggestions from highest-priority obligations
  const topSuggestions = useMemo(() => {
    if (!allObligations.length) return []
    const sorted = [...allObligations].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority || 'low'] || 4) - (order[b.priority || 'low'] || 4)
    })
    return sorted.slice(0, 5).map(ob => ({
      name: ob.name,
      priority: ob.priority || 'medium',
      action: ob.action_items?.[0] || ob.description,
      deadline: ob.deadline,
    }))
  }, [allObligations])

  // Toggle for obligation regulation sections
  const regulationSections = useMemo(() => {
    if (!results) return []
    return [
      { key: 'ai_act', label: 'EU AI Act', headerBg: 'bg-blue-600', items: results.ai_act_obligations || [] },
      { key: 'gdpr', label: 'GDPR', headerBg: 'bg-green-600', items: results.gdpr_obligations || [] },
      { key: 'dora', label: 'DORA', headerBg: 'bg-orange-600', items: results.dora_obligations || [] },
      { key: 'gpai', label: 'GPAI', headerBg: 'bg-purple-600', items: results.gpai_obligations || [] },
      { key: 'sectoral', label: 'Sectoral', headerBg: 'bg-cyan-600', items: results.sectoral_obligations || [] },
    ].filter(s => s.items.length > 0)
  }, [results])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50">
      {/* Header */}
      <div className="border-b-2 border-purple-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between bg-gradient-to-r from-white to-purple-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md text-sm">
            AI
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">RegolAI Expert</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Comprehensive AI use case assessment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {results && (
            <button
              onClick={resetForm}
              className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium transition-all shadow-sm"
            >
              New Assessment
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-32">

        {/* Section 1: Describe Your AI Use Case */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">1. Describe Your AI Use Case</h2>
          </div>
          <div className="p-5">
            <textarea
              className="w-full border-2 border-gray-200 rounded-lg p-3 text-sm min-h-[100px] focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition-colors"
              placeholder="Describe your AI system in plain language. Example: We use AI to automatically evaluate consumer loan applications based on credit history, income, and spending patterns..."
              value={formData.use_case_description}
              onChange={(e) => updateForm('use_case_description', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2">Optional free-text description to provide additional context for your assessment.</p>
          </div>
        </section>

        {/* Section 2: Organization */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">2. Organization</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Institution Type</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none bg-white"
                  value={formData.institution_type}
                  onChange={(e) => updateForm('institution_type', e.target.value)}
                >
                  <option value="">Select institution type...</option>
                  {INSTITUTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Your Role with AI</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 focus:outline-none bg-white"
                  value={formData.role}
                  onChange={(e) => updateForm('role', e.target.value)}
                >
                  <option value="">Select your role...</option>
                  {AI_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                checked={formData.third_party_vendor}
                onChange={(e) => updateForm('third_party_vendor', e.target.checked)}
              />
              <span className="text-gray-700 group-hover:text-gray-900">I'm using AI from a third-party vendor (buying/licensing AI)</span>
            </label>
          </div>
        </section>

        {/* Section 3: Use Case */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">3. Use Case</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1.5">
              <button
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${!selectedCategory ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-purple-50 border-gray-200'}`}
                onClick={() => setSelectedCategory(null)}
              >
                All ({USE_CASES.length})
              </button>
              {USE_CASE_CATEGORIES.map((cat) => {
                const count = USE_CASES.filter(u => u.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${selectedCategory === cat.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white hover:bg-purple-50 border-gray-200'}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <input
              type="text"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
              placeholder="Search use cases..."
              value={useCaseSearch}
              onChange={(e) => setUseCaseSearch(e.target.value)}
            />

            {/* Use Case Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {filteredUseCases.map((uc) => (
                <button
                  key={uc.value}
                  onClick={() => handleUseCaseSelect(uc.value)}
                  className={`text-left p-3 rounded-lg border-2 transition-all text-sm ${
                    formData.use_case === uc.value
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium text-gray-800">{uc.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 border ${getRiskBadgeClasses(uc.risk)}`}>
                      {getRiskLabel(uc.risk)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uc.description}</p>
                  {uc.annex_ref && uc.annex_ref !== 'Not listed' && uc.annex_ref !== 'Not covered' && (
                    <p className="text-xs text-purple-600 mt-1">{uc.annex_ref}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Selected use case indicator */}
            {selectedUseCase && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-purple-800">Selected:</span>
                <span className="text-sm text-purple-900 font-semibold">{selectedUseCase.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border ${getRiskBadgeClasses(selectedUseCase.risk)}`}>
                  {getRiskLabel(selectedUseCase.risk)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Impact Assessment */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
            <h2 className="text-white font-bold text-sm">4. Impact Assessment</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'involves_natural_persons' as const, label: 'Involves Natural Persons', tip: 'The AI processes data about or affects individual people' },
                { key: 'fully_automated' as const, label: 'Fully Automated Decisions', tip: 'No human in the loop - triggers GDPR Art. 22' },
                { key: 'denies_service_access' as const, label: 'Can Deny Service Access', tip: 'May reject applications or block access - Annex III 5(b)' },
                { key: 'affects_legal_rights' as const, label: 'Affects Legal Rights', tip: 'Produces legal or similarly significant effects on individuals' },
                { key: 'uses_special_category_data' as const, label: 'Special Category Data', tip: 'Processes health, biometric, race, religion data (GDPR Art. 9)' },
                { key: 'vulnerable_groups' as const, label: 'Vulnerable Groups', tip: 'Affects children, elderly, disabled, or financially vulnerable persons' },
                { key: 'is_high_impact' as const, label: 'High Impact', tip: 'Significant financial consequences (>EUR1000 or >10% income) or affects fundamental rights' },
                { key: 'involves_profiling' as const, label: 'Involves Profiling', tip: 'Automated evaluation of personal aspects (GDPR Art. 4(4))' },
              ].map(({ key, label, tip }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData[key] as boolean}
                    onChange={(e) => updateForm(key, e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800 group-hover:text-purple-800">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Technical & Regulatory (Collapsed) */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <h2 className="text-white font-bold text-sm">5. Technical & Regulatory (Advanced)</h2>
            <span className="text-white text-sm">{showAdvanced ? '▲' : '▼'}</span>
          </button>
          {showAdvanced && (
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'uses_gpai_model' as const, label: 'Uses GPAI Model', tip: 'Built on a General Purpose AI model (e.g. GPT-4, Claude)' },
                  { key: 'gpai_with_systemic_risk' as const, label: 'GPAI with Systemic Risk', tip: 'GPAI model with >10^25 FLOPs (GPT-4, Claude 3.5, etc.)' },
                  { key: 'safety_component' as const, label: 'Safety Component', tip: 'AI is a safety component of a product (Art. 6(1))' },
                  { key: 'cross_border_processing' as const, label: 'Cross-Border Processing', tip: 'Data processed across EU member state borders' },
                  { key: 'critical_ict_service' as const, label: 'Critical ICT Service (DORA)', tip: 'Supports critical banking/financial infrastructure' },
                  { key: 'life_health_insurance' as const, label: 'Life/Health Insurance', tip: 'Specifically for life or health insurance (Annex III 5(c))' },
                ].map(({ key, label, tip }) => (
                  <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={formData[key] as boolean}
                      onChange={(e) => updateForm(key, e.target.checked)}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-800">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 6: Sectoral (Collapsed) */}
        <section className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
          <button
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between"
            onClick={() => setShowSectoral(!showSectoral)}
          >
            <h2 className="text-white font-bold text-sm">6. Sectoral Regulations</h2>
            <span className="text-white text-sm">{showSectoral ? '▲' : '▼'}</span>
          </button>
          {showSectoral && (
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'provides_investment_advice' as const, label: 'Provides Investment Advice', tip: 'Subject to MiFID II suitability requirements' },
                  { key: 'processes_payments' as const, label: 'Processes Payments', tip: 'Subject to PSD2 requirements' },
                  { key: 'performs_aml_obligations' as const, label: 'Performs AML Obligations', tip: 'Subject to Anti-Money Laundering Directive' },
                ].map(({ key, label, tip }) => (
                  <label key={key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-purple-50/50 cursor-pointer transition-colors group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={formData[key] as boolean}
                      onChange={(e) => updateForm(key, e.target.checked)}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-800">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || (!formData.use_case && !formData.use_case_description)}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              Analyzing...
            </span>
          ) : (
            'Get Classification & Obligations'
          )}
        </button>

        {/* ─── Results Section ──────────────────────────────────────────── */}
        {results && (
          <div id="results-section" className="space-y-6">
            {/* Risk Classification Badge (large) */}
            <div className={`rounded-xl border-2 p-6 text-center ${getRiskBadgeClasses(results.risk_classification || 'context_dependent')}`}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-2 opacity-70">Risk Classification</p>
              <p className="text-3xl sm:text-4xl font-bold">
                {getRiskLabel(results.risk_classification || 'context_dependent')}
              </p>
              {results.classification_basis && (
                <p className="mt-2 text-sm opacity-80">{results.classification_basis}</p>
              )}
            </div>

            {/* Validation info */}
            {results.validation && (
              <div className={`rounded-lg border p-4 ${
                results.validation.confidence === 'high' ? 'bg-green-50 border-green-200' :
                results.validation.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">Classification Confidence:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    results.validation.confidence === 'high' ? 'bg-green-200 text-green-800' :
                    results.validation.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-orange-200 text-orange-800'
                  }`}>
                    {results.validation.confidence?.toUpperCase()}
                  </span>
                </div>
                {results.validation.legal_basis && (
                  <p className="text-xs text-gray-600 mt-1">Legal basis: {results.validation.legal_basis}</p>
                )}
                {results.validation.explanation && (
                  <p className="text-xs text-gray-600 mt-1">{results.validation.explanation}</p>
                )}
              </div>
            )}

            {/* Warnings */}
            {results.warnings?.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-amber-800 mb-2">Warnings</h4>
                <ul className="space-y-1">
                  {results.warnings.map((w: string, i: number) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">-</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Obligation Summary Cards */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-3">Obligations by Regulation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'AI Act', count: results.ai_act_obligations?.length || 0, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
                  { label: 'GDPR', count: results.gdpr_obligations?.length || 0, bg: 'bg-green-50 border-green-200', text: 'text-green-600' },
                  { label: 'DORA', count: results.dora_obligations?.length || 0, bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
                  { label: 'GPAI', count: results.gpai_obligations?.length || 0, bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600' },
                  { label: 'Sectoral', count: results.sectoral_obligations?.length || 0, bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-600' },
                ].map(item => (
                  <div key={item.label} className={`text-center px-3 py-3 rounded-lg border-2 ${item.bg}`}>
                    <div className={`text-2xl font-bold ${item.text}`}>{item.count}</div>
                    <div className="text-xs text-gray-600 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Suggestions */}
            {topSuggestions.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-purple-800 mb-3">Top Action Items</h3>
                <div className="space-y-3">
                  {topSuggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-purple-100">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 mt-0.5 ${
                        s.priority === 'critical' ? 'bg-red-600 text-white' :
                        s.priority === 'high' ? 'bg-orange-500 text-white' :
                        s.priority === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {s.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{s.action}</p>
                        {s.deadline && (
                          <p className="text-xs text-red-600 font-medium mt-1">Deadline: {s.deadline}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expanded Obligations by Regulation */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800">Detailed Obligations</h3>
              {regulationSections.map(section => (
                <div key={section.key} className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button
                    className={`w-full px-5 py-3 flex items-center justify-between ${section.headerBg} text-white font-bold text-sm`}
                    onClick={() => setExpandedRegulation(expandedRegulation === section.key ? null : section.key)}
                  >
                    <span>{section.label} ({section.items.length})</span>
                    <span>{expandedRegulation === section.key ? '▲' : '▼'}</span>
                  </button>
                  {expandedRegulation === section.key && (
                    <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto bg-gray-50">
                      {section.items.map((ob: Obligation) => (
                        <ObligationCard key={ob.id} obligation={ob} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Compliance Timeline */}
            {results.timeline?.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-purple-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3">
                  <h3 className="text-white font-bold text-sm">Compliance Timeline</h3>
                </div>
                <div className="p-5">
                  <TimelineView deadlines={results.timeline} />
                </div>
              </div>
            )}

            {/* Generate PDF Button */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Generating PDF Report...
                </span>
              ) : (
                'Generate PDF Report'
              )}
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center">
          Responses are generated for guidance only. Always consult legal counsel for compliance decisions.
        </p>
      </div>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  )
}
