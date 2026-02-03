import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

from .routes import chat, search, obligations

# Application metadata
APP_VERSION = "1.0.0"
APP_NAME = "EU AI Act Navigator API"

app = FastAPI(
    title=APP_NAME,
    description="""
API for navigating EU AI Act, GDPR, and DORA obligations for financial institutions.

## Features
- **Use Case Mapping**: 120+ pre-mapped financial services AI use cases
- **Risk Classification**: Automatic risk level determination based on EU AI Act Annex III
- **Obligations Mapping**: Detailed obligations from EU AI Act, GDPR, and DORA
- **Q&A Chat**: AI-powered compliance Q&A (requires user's own API key)

## Authentication
This API uses a BYOK (Bring Your Own Key) model. Users provide their own LLM API keys
via headers (X-LLM-Provider, X-LLM-API-Key, X-LLM-Model) for AI-powered features.
No server-side API keys are stored.

## Open Source
This project is open source. Visit the repository for more information.
""",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration
# In development, allows all origins. In production, set ALLOWED_ORIGINS env var.
# Example: ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    # Development default: allow localhost and common development ports
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    # In development, also allow all origins if explicitly set
    if os.getenv("ALLOW_ALL_ORIGINS", "").lower() == "true":
        allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-LLM-Provider",
        "X-LLM-API-Key",
        "X-LLM-Model",
    ],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(obligations.router, prefix="/api/obligations", tags=["Obligations"])


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring and deployment verification.

    Returns basic application status and version information.
    """
    return {
        "status": "healthy",
        "version": APP_VERSION,
        "name": APP_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint providing API information and documentation links.
    """
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "description": "API for EU AI Act, GDPR, and DORA compliance guidance",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
        },
        "endpoints": {
            "health": "/health",
            "obligations": "/api/obligations",
            "chat": "/api/chat",
            "search": "/api/search",
        },
        "note": "This API uses BYOK (Bring Your Own Key) model. AI-powered features require users to provide their own LLM API keys.",
    }


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, _exc: Exception):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested endpoint '{request.url.path}' does not exist.",
            "documentation": "/docs",
        },
    )


@app.exception_handler(500)
async def server_error_handler(_request: Request, _exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )
