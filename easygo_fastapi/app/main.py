from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .travelcourse import router as travel_router

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(travel_router, prefix="/generate_course", tags=["travel"]) 