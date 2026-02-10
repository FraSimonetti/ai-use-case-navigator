import jsPDF from 'jspdf'

interface Classification {
  risk_level: string
  classification_basis: string
  use_case: string
  institution_type: string
  role: string
}

interface ObligationItem {
  id: string
  name: string
  description: string
  source_regulation: string
  source_articles: string[]
  deadline: string | null
  priority: string
  action_items: string[]
  category: string
}

interface Obligations {
  ai_act: ObligationItem[]
  gdpr: ObligationItem[]
  dora: ObligationItem[]
  gpai: ObligationItem[]
  sectoral: ObligationItem[]
  total_count: number
}

interface TimelineEvent {
  date: string
  event: string
  impact: string
}

interface ReportData {
  classification: Classification
  obligations: Obligations
  timeline: TimelineEvent[]
  warnings: string[]
  collectedData: Record<string, unknown>
  narrative?: string
}

const PURPLE = [88, 28, 135] as const  // Purple-900
const INDIGO = [79, 70, 229] as const  // Indigo-600
const GRAY_700 = [55, 65, 81] as const
const GRAY_500 = [107, 114, 128] as const

function getRiskColor(risk: string): readonly [number, number, number] {
  switch (risk) {
    case 'high_risk': return [220, 38, 38] // red-600
    case 'limited_risk': return [234, 179, 8] // yellow-500
    case 'minimal_risk': return [22, 163, 74] // green-600
    case 'context_dependent': return [234, 88, 12] // orange-600
    default: return [107, 114, 128] // gray-500
  }
}

function formatRiskLevel(risk: string): string {
  return risk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  function checkPageBreak(needed: number) {
    if (y + needed > 270) {
      doc.addPage()
      y = 20
    }
  }

  function addSectionTitle(title: string) {
    checkPageBreak(15)
    y += 5
    doc.setFillColor(...INDIGO)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 3, y + 5.5)
    y += 13
    doc.setTextColor(0, 0, 0)
  }

  function addText(text: string, fontSize: number = 9, color: readonly [number, number, number] = GRAY_700, bold: boolean = false) {
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)
    checkPageBreak(lines.length * (fontSize * 0.4 + 1))
    doc.text(lines, margin, y)
    y += lines.length * (fontSize * 0.4 + 1) + 1
  }

  function addObligationSection(title: string, obligations: ObligationItem[]) {
    if (obligations.length === 0) return
    checkPageBreak(20)
    y += 3
    doc.setFontSize(10)
    doc.setTextColor(...PURPLE)
    doc.setFont('helvetica', 'bold')
    doc.text(`${title} (${obligations.length})`, margin, y)
    y += 5

    for (const ob of obligations) {
      checkPageBreak(20)
      doc.setFontSize(9)
      doc.setTextColor(...GRAY_700)
      doc.setFont('helvetica', 'bold')
      doc.text(`- ${ob.name}`, margin + 2, y)
      y += 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY_500)
      const descLines = doc.splitTextToSize(ob.description, contentWidth - 6)
      const maxDesc = descLines.slice(0, 2)
      checkPageBreak(maxDesc.length * 3.5)
      doc.text(maxDesc, margin + 4, y)
      y += maxDesc.length * 3.5

      if (ob.deadline) {
        doc.setTextColor(220, 38, 38)
        doc.text(`Deadline: ${ob.deadline}`, margin + 4, y)
        y += 3.5
      }

      if (ob.action_items.length > 0) {
        doc.setTextColor(...GRAY_500)
        const items = ob.action_items.slice(0, 3).join('; ')
        const itemLines = doc.splitTextToSize(`Actions: ${items}`, contentWidth - 6)
        checkPageBreak(itemLines.length * 3.5)
        doc.text(itemLines.slice(0, 2), margin + 4, y)
        y += itemLines.slice(0, 2).length * 3.5
      }

      y += 2
    }
  }

  // === HEADER ===
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageWidth, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('RegolAI', margin, 15)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('EU AI Act Classification Report', margin, 23)

  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, 30)

  y = 45

  // === RISK CLASSIFICATION BADGE ===
  const riskColor = getRiskColor(data.classification.risk_level)
  doc.setFillColor(...riskColor)
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Risk Level: ${formatRiskLevel(data.classification.risk_level)}`, margin + 5, y + 7)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Legal basis: ${data.classification.classification_basis}`, margin + 5, y + 13)
  y += 22

  // === USE CASE DESCRIPTION ===
  addSectionTitle('1. USE CASE DESCRIPTION')
  const desc = (data.collectedData.use_case_description as string) || 'Not provided'
  addText(desc)
  y += 2

  addText(`Sector: ${(data.collectedData.sector as string) || 'Financial Services'}`, 9, GRAY_500)
  addText(`Institution Type: ${formatRiskLevel(data.classification.institution_type)}`, 9, GRAY_500)
  addText(`Role: ${formatRiskLevel(data.classification.role)}`, 9, GRAY_500)

  // === EXECUTIVE SUMMARY ===
  if (data.narrative) {
    addSectionTitle('2. EXECUTIVE SUMMARY')
    addText(data.narrative)
  }

  // === CLASSIFICATION DETAILS ===
  addSectionTitle(data.narrative ? '3. CLASSIFICATION DETAILS' : '2. CLASSIFICATION DETAILS')
  addText(`Risk Classification: ${formatRiskLevel(data.classification.risk_level)}`, 10, riskColor, true)
  addText(`Legal Basis: ${data.classification.classification_basis}`)
  addText(`Use Case Category: ${formatRiskLevel(data.classification.use_case)}`)

  if (data.warnings.length > 0) {
    y += 2
    addText('Warnings:', 9, [234, 88, 12], true)
    for (const w of data.warnings) {
      addText(`  - ${w}`, 8, [234, 88, 12])
    }
  }

  // === OBLIGATIONS ===
  const sectionNum = data.narrative ? 4 : 3
  addSectionTitle(`${sectionNum}. REGULATORY OBLIGATIONS (${data.obligations.total_count} total)`)

  addObligationSection('EU AI Act', data.obligations.ai_act)
  addObligationSection('GDPR', data.obligations.gdpr)
  addObligationSection('DORA', data.obligations.dora)
  addObligationSection('GPAI', data.obligations.gpai)
  addObligationSection('Sectoral', data.obligations.sectoral)

  // === TIMELINE ===
  if (data.timeline.length > 0) {
    addSectionTitle(`${sectionNum + 1}. COMPLIANCE TIMELINE`)
    for (const event of data.timeline) {
      checkPageBreak(8)
      doc.setFontSize(9)
      doc.setTextColor(220, 38, 38)
      doc.setFont('helvetica', 'bold')
      doc.text(event.date, margin, y)
      doc.setTextColor(...GRAY_700)
      doc.setFont('helvetica', 'normal')
      doc.text(` - ${event.event}`, margin + 25, y)
      y += 5
    }
  }

  // === FOOTER DISCLAIMER ===
  checkPageBreak(25)
  y += 8
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5
  doc.setFontSize(7)
  doc.setTextColor(...GRAY_500)
  doc.setFont('helvetica', 'italic')
  const disclaimer = 'DISCLAIMER: This report is generated by RegolAI for informational purposes only and does not constitute legal advice. Classifications are based on the EU AI Act (Regulation (EU) 2024/1689), GDPR, and DORA as interpreted by the system. Always consult qualified legal counsel for compliance decisions. RegolAI assumes no liability for actions taken based on this report.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth)
  doc.text(disclaimerLines, margin, y)

  // Save
  const filename = `RegolAI_Report_${data.classification.use_case}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
