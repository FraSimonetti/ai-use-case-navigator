import { promises as fs } from 'fs'
import path from 'path'

interface ContribItem {
  id: string
  title: string
  type: 'use_case' | 'regulation'
  filename: string
  data: Record<string, unknown>
}

async function readJsonFiles(
  folder: string,
  type: 'use_case' | 'regulation',
  titleField: string
): Promise<ContribItem[]> {
  try {
    const entries = await fs.readdir(folder, { withFileTypes: true })
    const files = entries.filter((e) => e.isFile() && e.name.endsWith('.json'))

    const items = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(folder, file.name)
        const raw = await fs.readFile(fullPath, 'utf-8')
        const parsed = JSON.parse(raw) as Record<string, unknown>

        return {
          id: String(parsed.id ?? file.name),
          title: String(parsed[titleField] ?? parsed.id ?? file.name),
          type,
          filename: file.name,
          data: parsed,
        } satisfies ContribItem
      })
    )

    return items
  } catch {
    return []
  }
}

export async function GET() {
  const repoRoot = path.resolve(process.cwd(), '..', '..')
  const useCasesDir = path.join(repoRoot, 'contrib', 'use-cases')
  const regulationsDir = path.join(repoRoot, 'contrib', 'regulations')

  const [useCases, regulations] = await Promise.all([
    readJsonFiles(useCasesDir, 'use_case', 'title'),
    readJsonFiles(regulationsDir, 'regulation', 'name'),
  ])

  return Response.json({
    use_cases: useCases,
    regulations,
  })
}

