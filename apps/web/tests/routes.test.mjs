import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function readFile(relativePath) {
  const fullPath = path.join(projectRoot, relativePath)
  assert.ok(fs.existsSync(fullPath), `Missing file: ${relativePath}`)
  return fs.readFileSync(fullPath, 'utf-8')
}

test('core app pages exist', () => {
  const requiredPages = [
    'app/page.tsx',
    'app/chat/page.tsx',
    'app/obligations/page.tsx',
    'app/settings/page.tsx',
    'app/contrib/page.tsx',
  ]

  for (const page of requiredPages) {
    const fullPath = path.join(projectRoot, page)
    assert.ok(fs.existsSync(fullPath), `Missing page route file: ${page}`)
  }
})

test('api route handlers expose expected HTTP methods', () => {
  const routes = [
    ['app/api/chat/route.ts', 'POST'],
    ['app/api/contrib/route.ts', 'GET'],
    ['app/api/obligations/find/route.ts', 'POST'],
    ['app/api/obligations/analyze-custom/route.ts', 'POST'],
    ['app/api/settings/test/route.ts', 'POST'],
  ]

  for (const [filePath, method] of routes) {
    const source = readFile(filePath)
    const pattern = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`)
    assert.match(source, pattern, `Expected ${method} handler in ${filePath}`)
  }
})
