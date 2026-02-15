# Contribution Data Pack

This folder makes it easy for external contributors to propose:
- new AI use cases
- new regulations

Contributors should add JSON files in the folders below and open a PR.

## Folders

- `contrib/use-cases/`
  - One JSON file per proposed use case.
- `contrib/regulations/`
  - One JSON file per proposed regulation.

## File naming

Use lowercase kebab-case names:
- `fraud-monitoring-small-business.use-case.json`
- `eu-ai-act-amendment-2026.regulation.json`

## Validate before PR

```bash
python3 scripts/validate_contributions.py
```

or

```bash
make validate-contributions
```

## Important

- A contribution file is a proposal, not an automatic runtime integration.
- Maintainers review legal basis and mapping quality before integrating into app logic.
- Include official legal references and links.
