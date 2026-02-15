# RegolAI - EU AI Act Navigator

Open-source compliance workspace for AI use cases in financial services.

RegolAI helps teams:
- classify AI use cases under the EU AI Act,
- identify obligations across EU AI Act, GDPR, DORA, and GPAI,
- run guided regulatory Q&A grounded in official texts.

## First 5 Minutes

```bash
git clone <YOUR_REPO_URL>
cd AI_ACT_Navigator
./scripts/setup.sh
```

Then run in two terminals:

```bash
# Terminal 1
make backend

# Terminal 2
make frontend
```

Open:
- `http://127.0.0.1:3001`

## Requirements

- Node.js `20` (see `.nvmrc`)
- npm
- Python `3.11+`
- `pdftotext` (Poppler) for rebuilding vectors

macOS:
```bash
brew install poppler
```

## Core Features

- **Use Case Analysis**
  - 160+ mapped AI use cases
  - risk classification support (High-Risk, Limited, Minimal, Context-Dependent)
  - obligation mapping with implementation details
- **Smart Q&A**
  - retrieval-augmented Q&A on EU AI Act, GDPR, DORA
  - user-provided API keys (OpenRouter, OpenAI, Anthropic)
  - chat history with management actions (new, rename, restart, duplicate, delete)
- **Regulatory Context Controls**
  - role and institution-specific interpretation support
  - advanced context for DORA/GPAI and sectoral overlays

## Architecture

- **Frontend**: Next.js (App Router), React, Tailwind
- **Backend**: FastAPI
- **Retrieval**: local vector store + semantic embeddings from official regulation texts
- **Model Access**: BYOK (Bring Your Own Key) via request headers

## Repository Layout

```text
.
├── apps/
│   └── web/                  # Next.js frontend
├── services/
│   └── api/                  # FastAPI backend
├── data/
│   ├── *.pdf                 # Source regulation texts
│   └── embeddings/           # Local vector DB artifacts
├── scripts/
│   ├── setup.sh              # One-command local setup
│   └── ...                   # Utility scripts
├── docs/
│   ├── README.md             # Documentation index
│   ├── guides/               # Deployment + contributing
│   ├── archive/              # Historical notes/audits
│   └── prompts/              # Prompt assets
├── Makefile
├── requirements.txt
├── vercel.json
├── railway.json
└── README.md
```

## Local Development

### Option A: one-command setup

```bash
./scripts/setup.sh
```

### Option B: manual setup

Backend:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/api/requirements.txt
python3 -m uvicorn services.api.main:app --host 127.0.0.1 --port 8010
```

Frontend:
```bash
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## Makefile Commands

```bash
make help
make setup
make backend
make frontend
make rebuild-vectors
make validate-contributions
```

## Build / Rebuild Vector Store

If retrieval is missing or stale:

```bash
source .venv/bin/activate
python3 services/api/services/vector_store.py
```

## Environment Variables

### Frontend (`apps/web/.env.local`)

- `API_URL` - backend base URL used by server routes
- `NEXT_PUBLIC_API_URL` - backend base URL for client-side calls where needed

Default local values:

```env
API_URL=http://127.0.0.1:8010
NEXT_PUBLIC_API_URL=http://127.0.0.1:8010
```

### Backend

- `ALLOWED_ORIGINS` (optional) - comma-separated CORS allowlist

## Troubleshooting

### SSL certificate verify failed

If custom analysis or chat returns certificate errors, ensure:
- your Python environment is from `./scripts/setup.sh`
- `certifi` is installed (`pip show certifi`)

### Vector database not initialized

Run:
```bash
source .venv/bin/activate
python3 services/api/services/vector_store.py
```

### Port already in use

- Frontend default: `3001`
- Backend default: `8010`

Change ports in commands and update `apps/web/.env.local` accordingly.

### Missing dependencies after clone

Run:
```bash
./scripts/setup.sh
```

## API Key Model (BYOK)

RegolAI does not require server-side LLM keys for normal operation.
Users configure their own provider key in the UI settings:
- OpenRouter
- OpenAI
- Anthropic

## Community Contributions

To make external contributions easy, the repository includes structured contribution files:

- `contrib/use-cases/*.json`
- `contrib/regulations/*.json`

Start from:
- `contrib/use-cases/example.use-case.json`
- `contrib/regulations/example.regulation.json`

Validate proposals:

```bash
make validate-contributions
```

Then open a PR (templates in `.github/` guide required fields).

## Deployment

See:
- `docs/guides/deployment.md`

Typical setup:
- Frontend on Vercel
- Backend on Railway/Render

## Contributing

See:
- `docs/guides/contributing.md`

## Documentation

See:
- `docs/README.md` for full docs index

## License

MIT (see `LICENSE`)
