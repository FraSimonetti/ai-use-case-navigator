# How to Contribute

Thanks for contributing to RegolAI.

This repository supports two contribution paths:
- content contributions (new use cases, regulations, mappings)
- code contributions (frontend, backend, scripts, docs)

## 1. Development Setup

### Requirements
- Node.js 20 (see `.nvmrc`)
- npm
- Python 3.11+
- `pdftotext` (Poppler) if you need to rebuild vectors

### Setup
```bash
git clone <YOUR_FORK_OR_REPO_URL>
cd AI_ACT_Navigator
./scripts/setup.sh
```

Run locally in two terminals:
```bash
# Terminal 1
make backend

# Terminal 2
make frontend
```

## 2. Branch and Commit Workflow

1. Fork the repository.
2. Create a branch from `main`:
   - `git checkout -b feature/<short-name>`
3. Keep changes scoped to one topic.
4. Write clear commits.
5. Open a Pull Request using `.github/PULL_REQUEST_TEMPLATE.md`.

## 3. Content Contributions (Use Cases / Regulations)

Add proposal files in:
- `contrib/use-cases/`
- `contrib/regulations/`

Start from examples:
- `contrib/use-cases/example.use-case.json`
- `contrib/regulations/example.regulation.json`

Use kebab-case file names, for example:
- `fraud-monitoring-small-business.use-case.json`
- `eu-ai-act-amendment-2026.regulation.json`

Validate before opening a PR:
```bash
make validate-contributions
```

For regulatory contributions, include:
- legal references (article/annex)
- official source links (EUR-Lex or equivalent primary source)
- short rationale for relevance/classification

## 4. Code Contributions

Before opening a PR:
1. Run contribution validation if you touched `contrib/`:
   - `make validate-contributions`
2. Run frontend checks/build from `apps/web`:
   - `npm run test`
   - `npm run lint`
   - `npm run build`
3. Run backend smoke tests:
   - `source .venv/bin/activate && pytest -q`
4. Update docs when behavior or setup changes.

Keep PRs small and avoid unrelated refactors.

## 5. Pull Request Expectations

- Explain what changed and why.
- Reference issues when applicable.
- Include screenshots for UI changes.
- Mention any breaking changes or migration notes.

Use the PR checklist and complete the regulatory-basis section when applicable.

## 6. Issue Templates

Use the provided templates:
- `.github/ISSUE_TEMPLATE/add-use-case.yml`
- `.github/ISSUE_TEMPLATE/add-regulation.yml`

## 7. Community and Security

- Follow `CODE_OF_CONDUCT.md` in all project interactions.
- Report vulnerabilities using the process in `SECURITY.md`.

## 8. License

By contributing, you agree your contributions are licensed under MIT (`LICENSE`).
