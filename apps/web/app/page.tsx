import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            EU AI Act Navigator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional compliance platform for navigating EU AI Act, GDPR, and DORA obligations with precision
          </p>
        </div>

        {/* Main Features */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Smart Q&A */}
          <Card className="border-2 border-blue-200 shadow-xl hover:shadow-2xl transition-all bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Smart Q&A
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
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

              <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 text-lg">
                <Link href="/chat">Start Smart Q&A</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Use Case Analysis */}
          <Card className="border-2 border-indigo-200 shadow-xl hover:shadow-2xl transition-all bg-white">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Use Case Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
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

              <Button asChild variant="outline" className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-6 text-lg">
                <Link href="/obligations">Analyze Use Cases</Link>
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
