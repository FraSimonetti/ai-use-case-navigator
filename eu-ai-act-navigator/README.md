# AI Use Case Navigator

**Free and Open Source** compliance workspace for navigating EU AI Act, GDPR, and DORA obligations.

🆓 **100% Free to Host** - No server-side API keys needed  
🔑 **BYOK (Bring Your Own Key)** - Users add their own API key in Settings  
📖 **Open Source** - MIT License  
🏦 **Bank-Ready** - 120+ pre-mapped use cases with accurate regulatory classification

## Features

- **Obligation Finder**: 120+ predefined AI use cases with complete regulatory mapping (no API key needed!)
- **Risk Classification**: Automatic AI Act risk level determination (High-Risk, Limited, Minimal)
- **Direct Article Links**: Links to EU AI Act, GDPR, and DORA articles on official sources
- **Exemption Handling**: Art. 6(3) exemptions properly mapped
- **AI Act Q&A**: Ask questions about compliance (requires user's API key)
- **Custom Use Case Analysis**: AI-powered analysis (requires user's API key)
- **Multi-Provider Support**: OpenRouter, OpenAI, Anthropic

## How It Works

1. **Core Features** (Use Case & Obligations) work without any API key
2. **AI Features** (Q&A, Custom Analysis) require users to add their own API key in Settings
3. **Your hosting is free** - you don't pay for any API usage, users use their own keys

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/ai-use-case-navigator.git
cd ai-use-case-navigator

# Frontend
cd apps/web
npm install

# Backend
cd ../../services/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run Development Servers

```bash
# Terminal 1 - Backend
cd services/api
source venv/bin/activate
python -m uvicorn services.api.main:app --reload --port 8000

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

Open http://localhost:3000

### 3. Configure API Key (Users)

Users go to **Settings** page and add their own API key:
- **OpenRouter** - Access to 100+ models (recommended)
- **OpenAI** - Direct GPT access
- **Anthropic** - Direct Claude access

## Security

- API keys are stored only in the user's browser (localStorage)
- Keys are sent directly to the AI provider, not stored on your server
- No API keys are logged or persisted server-side

## Project Structure

```
ai-use-case-navigator/
├── apps/
│   └── web/                 # Next.js frontend
│       ├── app/             # Pages (App Router)
│       │   ├── settings/    # API key configuration
│       │   ├── chat/        # Q&A page
│       │   └── obligations/ # Use Case finder
│       ├── components/      # React components
│       └── lib/             # Utilities
├── services/
│   └── api/                 # FastAPI backend
│       ├── routes/          # API endpoints
│       └── services/        # Business logic
└── .env                     # Environment variables
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions.

### Quick Deploy (Free)

**Frontend → Vercel (Free)**
1. Connect GitHub repo to Vercel
2. Set root directory: `apps/web`
3. Add env: `NEXT_PUBLIC_API_URL=https://your-backend-url`

**Backend → Railway / Render (Free tier)**
1. Connect GitHub repo
2. Set root directory: `services/api`
3. No API keys needed!

## Tech Stack

- **Frontend**: Next.js 14+, React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.11+
- **AI Providers**: OpenRouter, OpenAI, Anthropic (user provides key)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | For frontend deployment |
| `ALLOWED_ORIGINS` | CORS origins (production) | Optional |

**Note**: No LLM API keys needed on the server! Users configure their own in the app.

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT - Free to use, modify, and distribute.

## Acknowledgments

- EU AI Act text: [artificialintelligenceact.eu](https://artificialintelligenceact.eu)
- GDPR reference: [gdpr-info.eu](https://gdpr-info.eu)
