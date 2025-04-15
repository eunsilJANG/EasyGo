from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import aiohttp
import asyncio
from openai import OpenAI
import os
from dotenv import load_dotenv
import traceback
from datetime import datetime, timedelta
import re
import math
from .database import redis_client  # SQLAlchemy 대신 Redis 클라이언트 임포트

# .env 파일 로드
load_dotenv()

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# API URL 상수 정의
NAVER_LOCAL_API_URL = "https://openapi.naver.com/v1/search/local.json"
KAKAO_SEARCH_API_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# API 키 설정
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
if not KAKAO_REST_API_KEY:
    print("Warning: KAKAO_REST_API_KEY is not set in environment variables")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")

# Pydantic 모델
class Coordinates(BaseModel):
    lat: str
    lng: str

class TravelSpot(BaseModel):
    name: str
    time: str
    address: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    category: Optional[str] = None
    reviews: Optional[List[str]] = None

class TravelDay(BaseModel):
    date: str
    spots: List[TravelSpot]

class TravelCourse(BaseModel):
    days: List[TravelDay]
    tags: List[str]

class TravelPreference(BaseModel):
    region: str
    areas: List[str]
    startDate: str
    endDate: str
    ageGroups: List[str]
    budget: str

# GPT 프롬프트
system_prompt = """당신은 한국 여행 전문 플래너입니다. 
주어진 장소 목록만을 사용해서 여행 일정을 만들어야 합니다.
장소 목록에 없는 장소는 절대로 추천하지 마세요.
각 장소의 이름과 주소를 정확하게 그대로 사용하세요.
하루에 최소 4곳, 최대 7곳을 추천하되, 반드시 1개 이상의 액티비티/체험을 포함해야 합니다."""

async def get_popular_places(region: str, category: str, areas: List[str]) -> List[dict]:
    all_places = []
    cache_key = f"places:{region}:{category}:{':'.join(areas)}"
    
    # Redis 캐시 확인
    cached_data = redis_client.get_data(cache_key)
    if cached_data:
        return cached_data
    
    # API에서 데이터 가져오기
    places = await fetch_places_from_api(region, category, areas)
    if places:
        # Redis에 저장
        redis_client.set_data(cache_key, places)
        all_places.extend(places)
    
    return all_places

async def verify_coordinates(place_name: str, address: str) -> Optional[Dict[str, float]]:
    # Redis에서 좌표 확인
    coord_key = f"coords:{place_name}:{address}"
    cached_coords = redis_client.get_data(coord_key)
    if cached_coords:
        return cached_coords
    
    # API에서 좌표 가져오기
    coords = await fetch_coordinates_from_api(place_name, address)
    if coords:
        redis_client.set_data(coord_key, coords)
    
    return coords

async def verify_coordinates_batch(places: List[dict]) -> List[dict]:
    async def verify_single_place(place: dict) -> dict:
        coords = await verify_coordinates(place['name'], place['address'])
        place['coordinates'] = coords
        return place
    
    # 한 번에 최대 5개의 장소 좌표를 병렬로 확인
    batch_size = 5
    result = []
    
    for i in range(0, len(places), batch_size):
        batch = places[i:i + batch_size]
        batch_results = await asyncio.gather(
            *(verify_single_place(place) for place in batch)
        )
        result.extend(batch_results)
        await asyncio.sleep(0.1)  # 작은 딜레이
    
    return result

def optimize_travel_course(all_days: List[TravelDay]) -> List[TravelDay]:
    def calculate_distance(spot1: TravelSpot, spot2: TravelSpot) -> float:
        if not (spot1.coordinates and spot2.coordinates):
            return float('inf')
            
        lat1 = math.radians(float(spot1.coordinates.lat))
        lon1 = math.radians(float(spot1.coordinates.lng))
        lat2 = math.radians(float(spot2.coordinates.lat))
        lon2 = math.radians(float(spot2.coordinates.lng))
        
        R = 6371
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def optimize_day_spots(spots: List[TravelSpot]) -> List[TravelSpot]:
        if len(spots) <= 2:
            return spots
            
        # 시간대별 분류
        time_slots = {
            'morning': [],   # ~12:00
            'afternoon': [], # 12:00~17:00
            'evening': []    # 17:00~
        }
        
        for spot in spots:
            time = datetime.strptime(spot.time, '%H:%M').time()
            if time <= datetime.strptime('12:00', '%H:%M').time():
                time_slots['morning'].append(spot)
            elif time <= datetime.strptime('17:00', '%H:%M').time():
                time_slots['afternoon'].append(spot)
            else:
                time_slots['evening'].append(spot)
        
        # 각 시간대별로 가까운 장소끼리 묶기
        optimized_spots = []
        for slot_spots in time_slots.values():
            if not slot_spots:
                continue
                
            current = slot_spots[0]
            remaining = slot_spots[1:]
            slot_result = [current]
            
            while remaining:
                next_spot = min(remaining, key=lambda x: calculate_distance(current, x))
                slot_result.append(next_spot)
                remaining.remove(next_spot)
                current = next_spot
            
            optimized_spots.extend(slot_result)
        
        return sorted(optimized_spots, key=lambda x: datetime.strptime(x.time, '%H:%M'))
    
    return [
                TravelDay(
            date=day.date,
            spots=optimize_day_spots(day.spots)
        )
        for day in all_days
    ]

def simplify_address(address: str) -> str:
    parts = address.split()
    return ' '.join(parts[:3]) if len(parts) > 3 else address

def parse_generated_text(text: str, start_date: str, end_date: str, available_places: List[dict], used_places_global: set) -> TravelCourse:
    print("\n=== 텍스트 파싱 시작 ===")
    print(f"전체 텍스트 길이: {len(text)}")
    
    days = []
    available_place_names = {p['name'] for p in available_places}
    
    # 일차 패턴 매칭 로깅
    day_pattern = r'(\d+)일차\s*[\(\[](.*?)[\)\]](.*?)(?=\d+일차|\Z)'
    day_matches = list(re.finditer(day_pattern, text, re.DOTALL))
    print(f"찾은 일차 수: {len(day_matches)}")
    
    for match in day_matches:
        day_num = match.group(1)
        date = match.group(2).strip().split('T')[0]
        content = match.group(3)
        print(f"\n{day_num}일차 ({date}) 처리 중...")
        
        spots = []
        spot_pattern = r'(\d{1,2}:\d{2})\s*([^-\n]+)-\s*([^-\n]+)-\s*([^\n]+)'
        spot_matches = list(re.finditer(spot_pattern, content.strip(), re.DOTALL))
        print(f"- 찾은 장소 수: {len(spot_matches)}")
        
        for spot_match in spot_matches:
            time, name, address, description = [s.strip() for s in spot_match.groups()]
            clean_name = name.strip()
            print(f"  - 처리 중인 장소: {clean_name}")
            
            # 장소 매칭 로깅
            matching_place = None
            for place in available_places:
                if (clean_name in place['name'] or place['name'] in clean_name) and place['name'] not in used_places_global:
                    matching_place = place
                    break
            
            if matching_place:
                print(f"    → 매칭된 장소: {matching_place['name']}")
                spots.append(TravelSpot(
                    name=matching_place['name'],
                    time=time.zfill(5),
                    address=matching_place['address'],
                    description=description.strip(),
                    category=matching_place['category'],
                    coordinates=Coordinates(
                        lat=str(matching_place['coordinates']['latitude']),
                        lng=str(matching_place['coordinates']['longitude'])
                    ) if matching_place.get('coordinates') else None
                ))
                used_places_global.add(matching_place['name'])
            else:
                print(f"    → 매칭 실패")
        
        if spots:
            print(f"- 최종 추가된 장소 수: {len(spots)}")
            days.append(TravelDay(date=date, spots=spots))
        else:
            print("- 추가된 장소 없음")
    
    print(f"\n=== 파싱 완료 ===")
    print(f"총 생성된 일차: {len(days)}")
    return TravelCourse(days=days, tags=["추천 코스"])

@router.post("", response_model=TravelCourse)
async def generate_travel_course(preferences: TravelPreference):
    try:
        print("\n=== Starting Travel Course Generation ===")
        
        region = preferences.region.strip()
        areas = [area.strip() for area in preferences.areas]
        
        if not re.match(r'^[가-힣\s]+$', region):
            raise HTTPException(status_code=400, detail="Invalid region name")
            
        if not areas:
            raise HTTPException(status_code=400, detail="No areas specified")

        # 날짜 처리
        start_date = preferences.startDate.split('T')[0]
        end_date = preferences.endDate.split('T')[0]
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        total_days = (end - start).days + 1

        # 장소 데이터 가져오기
        tourist_spots, restaurants, cafes, activities, experiences, accommodations = await fetch_places_optimized(
            preferences.region, preferences.areas
        )

        # activities 리스트를 합치기
        activities = activities + experiences

        if not tourist_spots and not restaurants and not cafes and not accommodations:
            raise HTTPException(status_code=404, detail=f"No places found for region '{region}' and areas {areas}")

        # 액티비티 분류
        activities = [spot for spot in tourist_spots if any(keyword in spot['name'].lower() for keyword in [
            '체험', '액티비티', '투어', '관광', '공방', '클래스', '체험관', '놀이',
            '테마파크', '공원', '박물관', '미술관', '전시', '스포츠', '레저'
        ])]
        
        # 관광지에서 액티비티 제외
        tourist_spots = [spot for spot in tourist_spots if spot not in activities]

        all_days = []
        used_places = set()

        # 각 날짜별로 일정 생성
        for day_num in range(total_days):
            current_date = start + timedelta(days=day_num)
            spots = []
            
            # 아침 식당
            if restaurants:
                morning_restaurant = next((r for r in restaurants if r['name'] not in used_places), None)
                if morning_restaurant:
                    spots.append(TravelSpot(
                        name=morning_restaurant['name'],
                        time="08:00",
                        address=morning_restaurant['address'],
                        description="아침 식사",
                        category="식당",
                        coordinates=Coordinates(
                            lat=str(morning_restaurant['coordinates']['latitude']),
                            lng=str(morning_restaurant['coordinates']['longitude'])
                        ) if morning_restaurant.get('coordinates') else None
                    ))
                    used_places.add(morning_restaurant['name'])

            # 오전 액티비티
            if activities:
                morning_activity = next((a for a in activities if a['name'] not in used_places), None)
                if morning_activity:
                    spots.append(TravelSpot(
                        name=morning_activity['name'],
                        time="10:00",
                        address=morning_activity['address'],
                        description="오전 액티비티",
                        category="액티비티",
                        coordinates=Coordinates(
                            lat=str(morning_activity['coordinates']['latitude']),
                            lng=str(morning_activity['coordinates']['longitude'])
                        ) if morning_activity.get('coordinates') else None
                    ))
                    used_places.add(morning_activity['name'])

            # 점심 식당
            if restaurants:
                lunch_restaurant = next((r for r in restaurants if r['name'] not in used_places), None)
                if lunch_restaurant:
                    spots.append(TravelSpot(
                        name=lunch_restaurant['name'],
                        time="12:30",
                        address=lunch_restaurant['address'],
                        description="점심 식사",
                        category="식당",
                        coordinates=Coordinates(
                            lat=str(lunch_restaurant['coordinates']['latitude']),
                            lng=str(lunch_restaurant['coordinates']['longitude'])
                        ) if lunch_restaurant.get('coordinates') else None
                    ))
                    used_places.add(lunch_restaurant['name'])

            # 오후 관광
            if tourist_spots:
                afternoon_spot = next((t for t in tourist_spots if t['name'] not in used_places), None)
                if afternoon_spot:
                    spots.append(TravelSpot(
                        name=afternoon_spot['name'],
                        time="14:00",
                        address=afternoon_spot['address'],
                        description="오후 관광",
                        category="관광명소",
                        coordinates=Coordinates(
                            lat=str(afternoon_spot['coordinates']['latitude']),
                            lng=str(afternoon_spot['coordinates']['longitude'])
                        ) if afternoon_spot.get('coordinates') else None
                    ))
                    used_places.add(afternoon_spot['name'])

            # 카페
            if cafes:
                cafe = next((c for c in cafes if c['name'] not in used_places), None)
                if cafe:
                    spots.append(TravelSpot(
                        name=cafe['name'],
                        time="16:00",
                        address=cafe['address'],
                        description="카페 타임",
                        category="카페",
                        coordinates=Coordinates(
                            lat=str(cafe['coordinates']['latitude']),
                            lng=str(cafe['coordinates']['longitude'])
                        ) if cafe.get('coordinates') else None
                    ))
                    used_places.add(cafe['name'])

            # 저녁 식당
            if restaurants:
                dinner_restaurant = next((r for r in restaurants if r['name'] not in used_places), None)
                if dinner_restaurant:
                    spots.append(TravelSpot(
                        name=dinner_restaurant['name'],
                        time="18:00",
                        address=dinner_restaurant['address'],
                        description="저녁 식사",
                        category="식당",
                        coordinates=Coordinates(
                            lat=str(dinner_restaurant['coordinates']['latitude']),
                            lng=str(dinner_restaurant['coordinates']['longitude'])
                        ) if dinner_restaurant.get('coordinates') else None
                    ))
                    used_places.add(dinner_restaurant['name'])

            # 야간 관광
            if tourist_spots:
                night_spot = next((t for t in tourist_spots if t['name'] not in used_places), None)
                if night_spot:
                    spots.append(TravelSpot(
                        name=night_spot['name'],
                        time="20:00",
                        address=night_spot['address'],
                        description="야간 관광",
                        category="관광명소",
                        coordinates=Coordinates(
                            lat=str(night_spot['coordinates']['latitude']),
                            lng=str(night_spot['coordinates']['longitude'])
                        ) if night_spot.get('coordinates') else None
                    ))
                    used_places.add(night_spot['name'])

            # 숙박
            if accommodations:
                accommodation = next((a for a in accommodations if a['name'] not in used_places), None)
                if accommodation:
                    spots.append(TravelSpot(
                        name=accommodation['name'],
                        time="22:00",
                        address=accommodation['address'],
                        description="숙박",
                        category="숙박",
                        coordinates=Coordinates(
                            lat=str(accommodation['coordinates']['latitude']),
                            lng=str(accommodation['coordinates']['longitude'])
                        ) if accommodation.get('coordinates') else None
                    ))
                    used_places.add(accommodation['name'])

            # 최적화된 경로로 정렬
            if spots:
                optimized_spots = optimize_travel_course([TravelDay(date=current_date.strftime('%Y-%m-%d'), spots=spots)])[0].spots
                all_days.append(TravelDay(date=current_date.strftime('%Y-%m-%d'), spots=optimized_spots))

            # 장소가 부족하면 used_places 초기화
            if len(used_places) > (len(tourist_spots) + len(restaurants) + len(cafes)) * 0.7:
                used_places.clear()

        if not all_days:
            raise HTTPException(status_code=500, detail="일정 생성에 실패했습니다. 다시 시도해주세요.")

        return TravelCourse(days=all_days, tags=["추천 코스"])

    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

async def fetch_places_from_api(region: str, category: str, areas: List[str]) -> List[dict]:
    """카카오/네이버 API를 사용하여 장소 정보를 가져오는 함수"""
    places = []
    
    async with aiohttp.ClientSession() as session:
        for area in areas:
            search_query = f"{region} {area} {category}"
            
            # 카카오 API 호출
            try:
                async with session.get(
                    KAKAO_SEARCH_API_URL,
                    params={
                        "query": search_query,
                        "size": 15
                    },
                    headers={"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        for document in data.get("documents", []):
                            place = {
                                "name": document.get("place_name"),
                                "address": document.get("road_address_name") or document.get("address_name"),
                                "category": category,
                                "coordinates": {
                                    "latitude": float(document.get("y")),
                                    "longitude": float(document.get("x"))
                                }
                            }
                            if place["name"] and place["address"]:
                                places.append(place)
            except Exception as e:
                logger.error(f"Error fetching from Kakao API: {str(e)}")

            # 네이버 API 호출 (백업)
            if not places:
                try:
                    async with session.get(
                        NAVER_LOCAL_API_URL,
                        params={
                            "query": search_query,
                            "display": 15
                        },
                        headers={
                            "X-Naver-Client-Id": NAVER_CLIENT_ID,
                            "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
                        }
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            for item in data.get("items", []):
                                place = {
                                    "name": item.get("title").replace("<b>", "").replace("</b>", ""),
                                    "address": item.get("roadAddress") or item.get("address"),
                                    "category": category,
                                    "coordinates": None  # 네이버 API는 좌표를 제공하지 않음
                                }
                                if place["name"] and place["address"]:
                                    places.append(place)
                except Exception as e:
                    logger.error(f"Error fetching from Naver API: {str(e)}")

    return places

async def fetch_places_optimized(region: str, areas: List[str]):
    tasks = [
        get_popular_places(region, "관광명소", areas),
        get_popular_places(region, "음식점", areas),
        get_popular_places(region, "카페", areas),
        get_popular_places(region, "엑티비티", areas),
        get_popular_places(region, "체험", areas),
        get_popular_places(region, "숙박", areas)
    ]
    results = await asyncio.gather(*tasks)
    tourist_spots, restaurants, cafes, activities, experiences, accommodations = results
    return tourist_spots, restaurants, cafes, activities, experiences, accommodations