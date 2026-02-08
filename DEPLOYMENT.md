# Deployment Guide - EU AI Act Navigator

## 🚀 Quick Start

Your code is already on GitHub! Follow these simple steps to deploy:

**1. Deploy Backend → 2. Deploy Frontend → 3. Connect them**

---

## Architecture
- **Frontend**: Next.js → Deploy to **Vercel** (Recommended)
- **Backend**: FastAPI → Deploy to **Railway** (Recommended)

---

## ✅ RECOMMENDED: Vercel + Railway

### Step 1: Deploy Backend to Railway

1. **Create Railway Account**:
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy from GitHub**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose: `FraSimonetti/ai-use-case-navigator`
   - Railway will auto-detect the Python app

3. **Configure the Service**:
   - Go to **Settings** → **Root Directory**
   - Set to: `services/api`

   - Go to **Settings** → **Deploy**
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

   - **IMPORTANT**: The embeddings (1,149 docs) are already included in the repo
   - Railway will automatically load them from `data/embeddings/`

4. **Generate Domain**:
   - Go to **Settings** → **Domains**
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://ai-act-api.railway.app`)

5. **Verify Deployment**:
   - Visit: `https://your-app.railway.app/docs`
   - You should see FastAPI documentation
   - Try the `/health` endpoint

**Note**: No environment variables needed! The app works with TF-IDF embeddings (no external API required).

---

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**:
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**:
   - Click "Add New Project"
   - Import from GitHub: `FraSimonetti/ai-use-case-navigator`

3. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add:
     - **Name**: `NEXT_PUBLIC_API_URL`
     - **Value**: `https://your-app.railway.app` (your Railway URL from Step 1)

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete

6. **Get Your URL**:
   - Vercel will provide: `https://ai-use-case-navigator.vercel.app`
   - Your site is now live!

---

### Step 3: Test Everything

1. **Test Backend**:
   ```bash
   curl https://your-app.railway.app/health
   ```
   Expected: `{"status":"healthy"}`

2. **Test Frontend**:
   - Visit your Vercel URL
   - Navigate to "Obligations Finder"
   - Select a use case (e.g., "Credit Scoring - Consumer")
   - Verify risk classification appears

3. **Test Smart Q&A**:
   - Go to "Smart Q&A" page
   - Ask: "What are high-risk AI systems in Annex III?"
   - Verify it retrieves passages from regulations
   - Check EUR-Lex links appear

---

## Alternative Option: Render (Both Services)

If you prefer a single platform for both frontend and backend:

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
