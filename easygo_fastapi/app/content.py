from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import re
from typing import List, Optional
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import openai
import os
from dotenv import load_dotenv  # python-dotenv 패키지 필요
from pytube import YouTube
from youtube_transcript_api import YouTubeTranscriptApi
import logging

# .env 파일 로드
load_dotenv()

# OpenAI API 키 설정
openai.api_key = os.getenv("OPENAI_API_KEY")

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/content",
    tags=["content"]
)

class ContentRequest(BaseModel):
    url: HttpUrl
    
class TravelSpot(BaseModel):
    name: str
    description: Optional[str]
    category: Optional[str]  # 관광지, 맛집, 카페 등
    time_required: Optional[int]  # 예상 소요 시간(분)

class TravelSchedule(BaseModel):
    spots: List[TravelSpot]
    summary: str
    region: str
    recommended_days: int
    source_url: Optional[str]  # 추가

def validate_url(url: str) -> bool:
    """URL이 지원하는 플랫폼의 것인지 검증"""
    patterns = {
        'youtube': r'^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$',
        'naver_blog': r'^(https?:\/\/)?(m\.)?(blog\.naver\.com)\/.+$',
        'naver_in': r'^(https?:\/\/)?(in\.naver\.com)\/.+$',  # 네이버 인플루언서
        'naver_tv': r'^(https?:\/\/)?(tv\.naver\.com)\/.+$',  # 네이버 TV
        'tistory': r'^(https?:\/\/)?[a-zA-Z0-9-]+\.tistory\.com\/.+$'
    }
    
    return any(re.match(pattern, url) for pattern in patterns.values())

def extract_youtube_content(url: str) -> str:
    """YouTube 영상의 자막과 설명을 추출"""
    try:
        logger.info(f"입력받은 URL: {url}")

        # URL 정규화 및 video_id 추출
        if 'youtu.be' in url:
            video_id = url.split('youtu.be/')[-1].split('?')[0]
            url = f'https://www.youtube.com/watch?v={video_id}'
        elif 'youtube.com' in url:
            video_id = url.split('v=')[-1].split('&')[0]
        else:
            raise ValueError("유효하지 않은 YouTube URL입니다")

        logger.info(f"추출된 video ID: {video_id}")

        # 커스텀 세션 생성
        session = requests.Session()
        session.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }

        try:
            # 직접 페이지 내용 가져오기
            response = session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 다양한 방식으로 데이터 추출 시도
            title = "제목 없음"
            description = "설명 없음"

            # 방법 1: meta 태그에서 추출
            title_meta = soup.find('meta', property='og:title')
            if title_meta:
                title = title_meta.get('content', '제목 없음')

            desc_meta = soup.find('meta', property='og:description')
            if desc_meta:
                description = desc_meta.get('content', '설명 없음')

            # 방법 2: JSON-LD 데이터에서 추출
            if title == "제목 없음" or description == "설명 없음":
                json_ld = soup.find('script', {'type': 'application/ld+json'})
                if json_ld:
                    try:
                        data = json.loads(json_ld.string)
                        if not title or title == "제목 없음":
                            title = data.get('name', '제목 없음')
                        if not description or description == "설명 없음":
                            description = data.get('description', '설명 없음')
                    except json.JSONDecodeError:
                        pass

            logger.info(f"제목: {title}")
            logger.info(f"설명 길이: {len(description)} 글자")

            # 자막 추출 시도
            transcript_text = ""
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko'])
                transcript_text = " ".join([entry['text'] for entry in transcript_list])
                logger.info(f"자막 추출 성공: {len(transcript_text)} 글자")
            except Exception as e:
                logger.warning(f"자막 추출 실패: {str(e)}")
                transcript_text = "자막을 찾을 수 없습니다."

            # 전체 콘텐츠 조합
            full_content = f"""
제목: {title}

설명:
{description}

자막:
{transcript_text}
"""
            logger.info("콘텐츠 추출 완료")
            return full_content

        except Exception as e:
            logger.error(f"콘텐츠 추출 실패: {str(e)}")
            raise

    except Exception as e:
        logger.error(f"전체 처리 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"YouTube 콘텐츠 추출에 실패했습니다. 올바른 URL인지 확인해주세요: {str(e)}"
        )

def extract_blog_content(url: str) -> dict:
    """블로그/인플루언서/TV 콘텐츠 추출"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        }
        
        logger.info(f"콘텐츠 URL 처리 시작: {url}")
        session = requests.Session()
        session.headers.update(headers)
        
        # 네이버 인플루언서
        if 'in.naver.com' in url:
            response = session.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            content_elements = []
            title_text = "제목 없음"  # 기본값 설정
            
            # 제목 추출 시도
            title = soup.select_one('.topic_title, .tit_title')
            if title and title.get_text(strip=True):  # title이 존재하고 텍스트가 있는 경우에만
                title_text = title.get_text(strip=True)
            content_elements.append(f"제목: {title_text}")
            
            # 본문 내용 추출
            content_selectors = [
                '.content_text',
                '.topic_content',
                '#topicContent',
                '.se-main-container',
                '.se-text'
            ]
            
            found_content = False  # 컨텐츠를 찾았는지 확인하는 플래그
            for selector in content_selectors:
                contents = soup.select(selector)
                for content in contents:
                    text = content.get_text(separator='\n', strip=True)
                    if text:
                        content_elements.append(text)
                        found_content = True
            
            # 메타 데이터에서 추가 정보 추출
            meta_description = soup.find('meta', {'property': 'og:description'})
            if meta_description and meta_description.get('content'):
                content_elements.append(meta_description.get('content'))
                found_content = True
            
            final_content = '\n\n'.join(filter(None, content_elements))
            
            if not found_content:
                logger.warning("콘텐츠를 찾을 수 없음")
                raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다.")
            
            return {
                "title": title_text,
                "description": final_content,
                "source_url": url,
                "category": "관광지",
                "time_required": 60
            }

        # 네이버 TV
        elif 'tv.naver.com' in url:
            response = session.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            content_elements = []
            
            # 제목 추출
            title_selectors = [
                'meta[property="og:title"]',  # OG 태그
                '.video_info .title',  # 비디오 제목
                'h3.title'  # 일반 제목
            ]
            
            for selector in title_selectors:
                title = soup.select_one(selector)
                if title:
                    if selector.startswith('meta'):
                        content_elements.append(f"제목: {title.get('content', '')}")
                    else:
                        content_elements.append(f"제목: {title.get_text(strip=True)}")
                    break
            
            # 설명 추출
            description_selectors = [
                'meta[property="og:description"]',  # OG 태그
                '.video_description',  # 비디오 설명
                '.detail_info .info',  # 상세 정보
                '#clipInfoArea .description'  # 클립 설명
            ]
            
            for selector in description_selectors:
                description = soup.select_one(selector)
                if description:
                    if selector.startswith('meta'):
                        content_elements.append(f"설명: {description.get('content', '')}")
                    else:
                        content_elements.append(f"설명: {description.get_text(strip=True)}")
                    break
            
            final_content = '\n\n'.join(filter(None, content_elements))
            
            if not final_content:
                logger.warning("콘텐츠를 찾을 수 없음")
                raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다.")
            
            return {
                "title": title.get_text(strip=True),
                "description": final_content,
                "source_url": url,
                "category": "관광지",
                "time_required": 60
            }

        # 기존 네이버 블로그 처리
        elif 'blog.naver.com' in url:
            # 기존 네이버 블로그 처리 코드 유지
            response = session.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            if 'PostView' in response.text:
                post_id = url.split('/')[-1]
                blog_id = url.split('/')[-2]
                
                iframe_url = f'https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={post_id}&redirect=Dlog'
                logger.info(f"iframe URL 생성: {iframe_url}")
                
                iframe_response = session.get(iframe_url)
                iframe_soup = BeautifulSoup(iframe_response.text, 'html.parser')
                
                selectors = [
                    '.se-main-container',
                    '.se_component_wrap',
                    '#post-view',
                    '.post_content',
                    '#postViewArea',
                    '.post-content',
                    '.post_article'
                ]
                
                for selector in selectors:
                    content = iframe_soup.select_one(selector)
                    if content:
                        logger.info(f"컨텐츠 찾음: {selector}")
                        text = content.get_text(separator='\n', strip=True)
                        logger.info(f"추출된 텍스트 길이: {len(text)}")
                        return {
                            "title": "제목 없음",
                            "description": text,
                            "source_url": url,
                            "category": "관광지",
                            "time_required": 60
                        }
                        
            return {
                "title": "제목 없음",
                "description": "",
                "source_url": url,
                "category": "관광지",
                "time_required": 60
            }
            
        # 티스토리
        elif 'tistory.com' in url:
            response = requests.get(url)
            soup = BeautifulSoup(response.text, 'html.parser')
            content = soup.select_one('.entry-content') or soup.select_one('.article')
            return {
                "title": "제목 없음",
                "description": content.get_text(separator='\n', strip=True) if content else "",
                "source_url": url,
                "category": "관광지",
                "time_required": 60
            }
            
        return {
            "title": "제목 없음",
            "description": "",
            "source_url": url,
            "category": "관광지",
            "time_required": 60
        }
    except Exception as e:
        logger.error(f"콘텐츠 추출 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"콘텐츠 추출 실패: {str(e)}")

def analyze_content_with_gpt(content: str) -> TravelSchedule:
    """GPT를 사용하여 콘텐츠 분석 및 여행 일정 생성"""
    try:
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        system_prompt = """당신은 여행 전문 AI 어시스턴트입니다. 
여행 콘텐츠를 분석하여 반드시 JSON 형식으로만 응답해야 합니다. 
다른 텍스트는 절대 포함하지 마세요."""

        user_prompt = f"""다음 여행 콘텐츠를 분석하여 여행 일정을 JSON 형식으로만 생성해주세요:

{content}

응답은 반드시 다음 JSON 스키마를 따라야 합니다:
{{
    "region": "여행 지역명",
    "recommended_days": 숫자(일),
    "spots": [
        {{
            "name": "장소명",
            "description": "설명",
            "category": "관광지",
            "time_required": 숫자(분)
        }}
    ],
    "summary": "전체 여행 요약"
}}"""

        # OpenAI API 호출
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # 안정적인 모델로 변경
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}  # JSON 응답 강제
        )
        
        # 응답 파싱
        result = response.choices[0].message.content
        logger.info(f"GPT 응답: {result}")  # 응답 로깅
        
        try:
            data = json.loads(result)
            
            # TravelSpot 객체 리스트 생성
            spots = [
                TravelSpot(
                    name=spot['name'],
                    description=spot.get('description', ''),
                    category=spot.get('category', '관광지'),
                    time_required=spot.get('time_required', 60)
                )
                for spot in data.get('spots', [])
            ]
            
            return TravelSchedule(
                spots=spots,
                summary=data.get('summary', ''),
                region=data.get('region', ''),
                recommended_days=data.get('recommended_days', 1),
                source_url=data.get('source_url', '')
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"GPT 응답 파싱 실패: {str(e)}")
            logger.error(f"파싱 실패한 응답: {result}")
            raise HTTPException(
                status_code=500, 
                detail="GPT 응답을 JSON으로 파싱할 수 없습니다."
            )
        
    except Exception as e:
        logger.error(f"GPT 분석 실패: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"GPT 분석 중 오류가 발생했습니다: {str(e)}"
        )

@router.post("/extract", response_model=TravelSchedule)
async def extract_travel_schedule(request: ContentRequest):
    """여행 콘텐츠 URL을 받아 여행 일정 생성"""
    if not validate_url(str(request.url)):
        raise HTTPException(status_code=400, detail="지원하지 않는 URL 형식입니다.")
    
    try:
        url = str(request.url)
        logger.info(f"요청 받은 URL: {url}")
        
        if 'youtube' in url:
            content = extract_youtube_content(url)
        else:
            content = extract_blog_content(url)
            logger.info(f"추출된 콘텐츠: {content}")
            
        if not content:
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다.")
            
        # GPT로 콘텐츠 분석 및 일정 생성
        schedule = analyze_content_with_gpt(content)
        schedule.source_url = url  # URL 정보 추가
        logger.info(f"생성된 스케줄 (source_url 포함): {schedule}")
        return schedule
        
    except Exception as e:
        logger.error(f"처리 중 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-platforms")
async def get_supported_platforms():
    """지원하는 플랫폼 목록 반환"""
    return {
        "platforms": [
            {
                "name": "YouTube",
                "pattern": "youtube.com 또는 youtu.be",
                "description": "여행 브이로그 및 여행 리뷰 영상"
            },
            {
                "name": "네이버 블로그",
                "pattern": "blog.naver.com",
                "description": "여행 후기 및 여행 코스 추천"
            },
            {
                "name": "네이버 인플루언서",
                "pattern": "in.naver.com",
                "description": "인플루언서의 여행 콘텐츠"
            },
            {
                "name": "네이버 TV",
                "pattern": "tv.naver.com",
                "description": "여행 관련 동영상 콘텐츠"
            },
            {
                "name": "티스토리",
                "pattern": "*.tistory.com",
                "description": "여행 후기 및 여행지 정보"
            }
        ]
    }