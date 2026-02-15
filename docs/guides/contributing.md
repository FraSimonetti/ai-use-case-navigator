# Contributing to RegolAI

Thank you for contributing.

This project supports two contribution tracks:
- **content contributions** (new use cases, new regulations, mapping improvements)
- **code contributions** (frontend/backend/scripts)

## Quick Workflow

1. Fork + clone the repo.
2. Run setup:
   - `./scripts/setup.sh`
3. Create a branch:
   - `git checkout -b feature/<short-name>`
4. Make your change.
5. Run checks:
   - `make validate-contributions` (for contribution JSON files)
6. Open a PR using the PR template.

## Content Contributions (Easiest Path)

If you want to propose:
- a new AI use case, or
- a new regulation

use the structured JSON contribution pack:
- `contrib/use-cases/`
- `contrib/regulations/`

Start from examples:
- `contrib/use-cases/example.use-case.json`
- `contrib/regulations/example.regulation.json`

Validate locally:

```bash
python3 scripts/validate_contributions.py
```

or:

```bash
make validate-contributions
```

### What reviewers need

For regulatory contributions, include:
- article/annex references,
- official links (EUR-Lex or equivalent primary source),
- a short rationale for classification/obligations.

## Code Contributions

### Local dev

Backend:

```bash
make backend
```

Frontend:

```bash
make frontend
```

### Expectations

- Keep PRs focused and scoped.
- Update docs for behavior changes.
- Preserve existing style and naming.
- Avoid unrelated refactors in the same PR.

## GitHub Templates

Use the built-in templates:
- Issue template: **Add AI use case**
- Issue template: **Add regulation**
- PR template: checklist + regulatory-basis section

## Legal / License

By contributing, you agree your contributions are licensed under MIT (`LICENSE`).
