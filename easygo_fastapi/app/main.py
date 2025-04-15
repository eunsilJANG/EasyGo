from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .travelcourse import router as travel_router
from .database import redis_client  # engine, Base 제거
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

@app.on_event("startup")
async def startup_event():
    try:
        redis_client.redis.ping()
        print("Successfully connected to Redis")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    # 필요한 정리 작업 수행
    pass
