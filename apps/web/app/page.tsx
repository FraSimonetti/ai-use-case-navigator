import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl w-full space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-6 sm:space-y-8">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-2">
            RegolAI
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Professional compliance platform for navigating EU AI Act, GDPR, and DORA obligations with precision
          </p>
        </div>

        {/* Main Features */}
        <div className="grid gap-6 md:gap-8 md:grid-cols-3 max-w-7xl mx-auto">
          {/* Smart Q&A */}
          <Card className="border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                Smart Q&A
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Ask questions about AI Act compliance and receive expert answers with direct citations from official EUR-Lex sources.
                Powered by RAG technology over 1,149 regulatory documents.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wide">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Retrieve-Augmented Generation from official regulatory texts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Confidence scoring for every response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Direct links to source articles in EUR-Lex</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Context-aware answers based on your role and institution</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-5 sm:py-6 text-base sm:text-lg">
                <Link href="/chat">Start Smart Q&A</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Use Case Analysis */}
          <Card className="border-2 border-indigo-200 shadow-xl hover:shadow-2xl transition-all bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                Use Case Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Select from 161 pre-mapped AI use cases or describe your own to discover all applicable regulatory obligations
                across AI Act, GDPR, and DORA with zero-error validation.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wide">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold mt-0.5">•</span>
                    <span>161 pre-mapped use cases across financial services and legal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold mt-0.5">•</span>
                    <span>Automatic risk classification with legal basis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold mt-0.5">•</span>
                    <span>Comprehensive obligation mapping with deadlines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 font-bold mt-0.5">•</span>
                    <span>Custom use case analysis powered by AI</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-5 sm:py-6 text-base sm:text-lg">
                <Link href="/obligations">Analyze Use Cases</Link>
              </Button>
            </CardContent>
          </Card>
          {/* RegolAI Expert */}
          <Card className="border-2 border-purple-200 shadow-xl hover:shadow-2xl transition-all bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-violet-50 p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                RegolAI Expert
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Complete a comprehensive assessment form to classify your AI system
                and receive full regulatory obligations with an actionable compliance report.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-900 uppercase tracking-wide">Key Features</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold mt-0.5">•</span>
                    <span>Comprehensive assessment form with all relevant factors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold mt-0.5">•</span>
                    <span>Automatic risk assessment with legal basis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold mt-0.5">•</span>
                    <span>Full obligation mapping across all regulations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold mt-0.5">•</span>
                    <span>Downloadable PDF compliance report</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold py-5 sm:py-6 text-base sm:text-lg">
                <Link href="/expert">Start Expert Assessment</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Professional regulatory compliance platform • Updated February 2026
          </p>
        </div>
      </div>
    </div>
  )
}
