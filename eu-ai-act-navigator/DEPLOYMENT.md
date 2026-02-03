# Deployment Guide - EU AI Act Navigator

## Architecture
- **Frontend**: Next.js → Deploy to **Vercel**
- **Backend**: FastAPI → Deploy to **Railway** or **Render**

---

## Option 1: Vercel (Frontend) + Railway (Backend)

### Step 1: Deploy Backend to Railway

1. **Create Railway Account**: https://railway.app
2. **Install Railway CLI** (optional):
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Create `railway.json`** in `services/api/`:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "uvicorn services.api.main:app --host 0.0.0.0 --port $PORT",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

4. **Deploy via Dashboard**:
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Set root directory to `/services/api`
   - Add environment variables:
     - `OPENROUTER_API_KEY` = your key
     - `OPENROUTER_MODEL` = openai/gpt-4o-mini
     - `OPENROUTER_APP_URL` = (your frontend URL later)
     - `OPENROUTER_APP_NAME` = EU AI Act Navigator

5. **Get your Backend URL**: Railway will give you a URL like `https://your-app.railway.app`

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**: https://vercel.com

2. **Update Next.js config** for production API:
   
   Edit `apps/web/lib/server-api.ts` to use environment variable:
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
   ```

3. **Deploy via Vercel Dashboard**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Set root directory to `apps/web`
   - Add environment variable:
     - `NEXT_PUBLIC_API_URL` = `https://your-backend.railway.app`
   - Click Deploy

---

## Option 2: Docker (Self-hosted or any cloud)

### Backend Dockerfile
Create `services/api/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
Create `apps/web/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### Docker Compose (for testing locally)
Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  backend:
    build: ./services/api
    ports:
      - "8000:8000"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENROUTER_MODEL=openai/gpt-4o-mini

  frontend:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

---

## Option 3: Render (Both services)

1. Go to https://render.com
2. Create **Web Service** for backend:
   - Root: `services/api`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn services.api.main:app --host 0.0.0.0 --port $PORT`
   
3. Create **Static Site** or **Web Service** for frontend:
   - Root: `apps/web`
   - Build: `npm install && npm run build`
   - Start: `npm start`

---

## Environment Variables Summary

### Backend (Railway/Render)
```
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_APP_URL=https://your-frontend.vercel.app
OPENROUTER_APP_NAME=EU AI Act Navigator
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Quick Start Commands

### Local Development
```bash
# Terminal 1 - Backend
cd services/api
source venv/bin/activate
set -a && source ../../.env && set +a
uvicorn services.api.main:app --reload --port 8000

# Terminal 2 - Frontend
cd apps/web
npm run dev
```

### Production Build Test
```bash
# Frontend
cd apps/web
npm run build
npm start

# Backend
cd services/api
uvicorn services.api.main:app --host 0.0.0.0 --port 8000
```

---

## Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/month | $20/month |
| Railway | $5 credit/month | ~$5-20/month |
| Render | 750 hours/month | $7/month per service |
| OpenRouter | Pay per use | ~$0.15/1M tokens (GPT-4o-mini) |

---

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Set CORS properly in FastAPI for production domain
- [ ] Consider rate limiting for API endpoints
