from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .travelcourse import router as travel_router
from .database import redis_client
import logging
from .content import router as content_router

app = FastAPI(title="EasyGo API")

# CORS 설정 수정
origins = [
    "http://localhost:3000",    # React 개발 서버
    "http://localhost:5173",    # Vite 개발 서버
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(travel_router, prefix="/generate_course", tags=["travel"])
app.include_router(content_router)

@app.on_event("startup")
async def startup_event():
    try:
        redis_client.redis.ping()
        print("Successfully connected to Redis")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")