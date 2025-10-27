"""
Shinwa Agent - FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# TODO: Import routers when implemented
# from .api.routes import chat, memory, tasks, config
# from .api.websocket import router as ws_router
from .config.settings import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting Shinwa Agent...")
    yield
    # Shutdown
    print("Shutting down Shinwa Agent...")


app = FastAPI(
    title="Shinwa Agent API",
    description="Autonomous AI Agent Backend",
    version="0.1.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: ルート登録（実装後に有効化）
# app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
# app.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])
# app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
# app.include_router(config.router, prefix="/api/v1/config", tags=["config"])
# app.include_router(ws_router, prefix="/ws", tags=["websocket"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Shinwa Agent API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "shinwa-agent"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "shinwa_agent.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

