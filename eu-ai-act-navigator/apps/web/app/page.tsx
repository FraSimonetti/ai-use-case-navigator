import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="p-10 max-w-5xl mx-auto space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold">AI Use Case Navigator</h1>
        <p className="text-gray-500 text-lg">
          Your compliance workspace for navigating EU AI Act, GDPR, and DORA
          obligations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">💬</span> AI Act Q&A
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Ask questions about AI Act compliance and get expert answers with
              regulatory citations.
            </p>
            <Button asChild>
              <Link href="/chat">Start Asking</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📋</span> Use Case & Obligations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">
              Explore 120+ AI use cases across industries or describe your own.
              Discover all applicable obligations instantly.
            </p>
            <Button asChild variant="outline">
              <Link href="/obligations">Find Obligations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">120+</div>
          <div className="text-sm text-gray-500">Pre-defined use cases</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">3</div>
          <div className="text-sm text-gray-500">
            Regulations mapped (AI Act, GDPR, DORA)
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-2xl font-bold">AI</div>
          <div className="text-sm text-gray-500">
            Custom use case analysis powered by AI
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Key Deadlines</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="p-4 border rounded-lg bg-red-50 border-red-200">
            <div className="font-semibold text-red-800">Feb 2, 2025</div>
            <div className="text-sm text-red-700">
              Prohibited AI practices apply (Chapter II)
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <div className="font-semibold text-yellow-800">Aug 2, 2025</div>
            <div className="text-sm text-yellow-700">
              General-Purpose AI rules apply (Chapter V)
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
            <div className="font-semibold text-orange-800">Aug 2, 2026</div>
            <div className="text-sm text-orange-700">
              Full application - High-risk AI requirements
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="font-semibold text-blue-800">Aug 2, 2027</div>
            <div className="text-sm text-blue-700">
              Annex I (product safety) requirements apply
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
