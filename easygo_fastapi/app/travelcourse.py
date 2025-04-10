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
    travelers: dict

# GPT 프롬프트
system_prompt = """당신은 한국 여행 전문 플래너입니다. 
다음 규칙을 반드시 준수해주세요:

1. 절대로 제공된 장소 목록에 없는 장소를 추천하지 마세요.
2. 장소 목록에 있는 정확한 이름과 주소를 그대로 사용해야 합니다.
3. 장소명이나 주소를 임의로 수정하거나 창작하지 마세요.
4. 제공된 목록에서 장소를 찾을 수 없다면, 다른 유사한 장소를 선택하세요.

각 장소는 반드시 다음 형식을 지켜주세요:
시간 장소명 - 도로명주소 - 설명

예시:
08:00 남동공단떡볶이 - 인천광역시 남동구 논현동 450 - 추천메뉴: 고추장떡볶이, 특징: 30년 전통의 맛집, 주변 관광지와 가까움

5. 하루 일정은 최소 3곳, 최대 7곳을 추천해주세요.
6. 각 일차는 반드시 다음 형식으로 시작해야 합니다:
   N일차 (YYYY-MM-DD)
7. 장소명에 카테고리 태그([식당], [관광명소] 등)를 포함하지 마세요.
8. 각 장소의 설명은 자세하게 작성해주세요. 메뉴, 특징, 주변 정보 등을 포함할 수 있습니다.
"""

async def get_popular_places(region: str, category: str, areas: List[str]) -> List[dict]:
    print(f"\n=== Searching for {category} in {region} ===")
    print(f"Selected areas: {areas}")
    
    async def process_query(query: str) -> List[dict]:
        unique_places = {}
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "X-Naver-Client-Id": NAVER_CLIENT_ID,
                    "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
                }
                params = {
                    "query": query,
                    "display": 15,
                    "start": 1,
                    "sort": "sim"
                }
                
                async with session.get(NAVER_LOCAL_API_URL, headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"API Response for {query}:", data)
                        items = data.get("items", [])
                        
                        for item in items:
                            clean_title = re.sub(r'<[^>]+>', '', item["title"])
                            if clean_title not in unique_places:
                                road_address = item.get("roadAddress", "")
                                address = road_address if road_address else item["address"]
                                
                                if any(area.lower() in address.lower() for area in [region, *areas]):
                                    unique_places[clean_title] = {
                                        "name": clean_title,
                                        "address": address,
                                        "category": category
                                    }
                    else:
                        print(f"API Error for {query}: {response.status}")
                        
        except Exception as e:
            print(f"Error processing query {query}: {e}")
            print(f"Traceback: {traceback.format_exc()}")
        
        return list(unique_places.values())
    
    # 검색 쿼리 생성
    queries = []
    for area in areas:
        area = area.strip()
        if category == "관광명소":
            queries.append(f"{region} {area} 관광지")
            queries.append(f"{area} 명소")  # 대안 검색어 추가
        elif category == "음식점":
            queries.append(f"{area} 맛집")
            queries.append(f"{area} 식당")  # 대안 검색어 추가
        else:  # 카페
            queries.append(f"{area} 카페")
            queries.append(f"{area} 커피")  # 대안 검색어 추가
    
    # 병렬 처리
    tasks = [process_query(query) for query in queries]
    results = await asyncio.gather(*tasks)
    
    # 결과 병합
    all_places = {}
    for places in results:
        for place in places:
            if place['name'] not in all_places:
                all_places[place['name']] = place
    
    # 좌표 검증
    places_with_coords = await verify_coordinates_batch(list(all_places.values()))
    
    print(f"Found {len(places_with_coords)} places for {category}")
    return places_with_coords

async def verify_coordinates(place_name: str, address: str) -> Optional[Dict[str, float]]:
    try:
        # 주소 정제
        address_parts = address.split()
        simple_address = ' '.join(address_parts[:3])
        detailed_address = ' '.join(address_parts[:4]) if len(address_parts) > 3 else simple_address
        
        headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
        params = {"query": place_name}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(KAKAO_SEARCH_API_URL, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data["documents"]:
                        # 주소 매칭 개선
                        for place in data["documents"]:
                            # 1. 도로명 주소 또는 지번 주소 확인
                            if (simple_address in place["address_name"] or 
                                simple_address in place["road_address_name"]):
                                return {
                                    "latitude": float(place["y"]),
                                    "longitude": float(place["x"])
                                }
                            
                            # 2. 시/군/구 레벨에서 매칭
                            if all(part in place["address_name"] for part in address_parts[1:3]):
                                return {
                                    "latitude": float(place["y"]),
                                    "longitude": float(place["x"])
                                }
                    
                    # 3. 주소 + 장소명으로 재시도
                    params = {"query": f"{detailed_address} {place_name}"}
                    async with session.get(KAKAO_SEARCH_API_URL, headers=headers, params=params) as retry_response:
                        if retry_response.status == 200:
                            retry_data = await retry_response.json()
                            if retry_data["documents"]:
                                return {
                                    "latitude": float(retry_data["documents"][0]["y"]),
                                    "longitude": float(retry_data["documents"][0]["x"])
                                }
    except Exception as e:
        print(f"Error verifying coordinates for {place_name}: {e}")
    
    return None

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
    days = []
    available_place_names = {p['name'] for p in available_places}
    
    day_pattern = r'(\d+)일차\s*\(([^)]+)\)(.*?)(?=\d+일차|\Z)'
    day_matches = list(re.finditer(day_pattern, text, re.DOTALL))
    
    for match in day_matches:
        day_num = match.group(1)
        date = match.group(2).split('T')[0]
        content = match.group(3)
        
        spots = []
        spot_pattern = r'(\d{2}:\d{2})\s+([^-]+?)\s*-\s*([^-]+?)\s*-\s*(.+?)(?=\n\d{2}:\d{2}|\Z)'
        spot_matches = list(re.finditer(spot_pattern, content.strip(), re.DOTALL))
        
        for spot_match in spot_matches:
            time, name, address, description = [s.strip() for s in spot_match.groups()]
            clean_name = name.strip()
            
            if clean_name in available_place_names and clean_name not in used_places_global:
                place_info = next(p for p in available_places if p['name'] == clean_name)
                coordinates = None
                if place_info.get('coordinates'):
                    coordinates = Coordinates(
                        lat=str(place_info['coordinates']['latitude']),
                        lng=str(place_info['coordinates']['longitude'])
                    )
                
                spots.append(TravelSpot(
                    name=clean_name,
                    time=time,
                    address=place_info['address'],
                    description=description.strip(),
                    category=place_info['category'],
                    coordinates=coordinates
                ))
                used_places_global.add(clean_name)
        
        days.append(TravelDay(
            date=date,
            spots=spots
        ))
    
    return TravelCourse(days=days, tags=["추천 코스"])

@router.post("", response_model=TravelCourse)
async def generate_travel_course(preferences: TravelPreference):
    try:
        print("\n=== Starting Travel Course Generation ===")
        print(f"Received preferences: {preferences.dict()}")  # 로그 추가
        
        # 지역명 정규화
        region = preferences.region.strip()
        areas = [area.strip() for area in preferences.areas]
        
        # 지역명이 한글이 아닌 경우 처리
        if not re.match(r'^[가-힣\s]+$', region):
            raise HTTPException(status_code=400, detail="Invalid region name")
            
        # 빈 지역 리스트 체크
        if not areas:
            raise HTTPException(status_code=400, detail="No areas specified")

        # 장소 검색
        tourist_spots = await get_popular_places(region, "관광명소", areas)
        print(f"Found {len(tourist_spots)} tourist spots")  # 로그 추가
        
        restaurants = await get_popular_places(region, "음식점", areas)
        print(f"Found {len(restaurants)} restaurants")  # 로그 추가
        
        cafes = await get_popular_places(region, "카페", areas)
        print(f"Found {len(cafes)} cafes")  # 로그 추가

        if not tourist_spots and not restaurants and not cafes:
            raise HTTPException(
                status_code=404, 
                detail=f"No places found for region '{region}' and areas {areas}"
            )

        start_date = preferences.startDate.split('T')[0]
        end_date = preferences.endDate.split('T')[0]
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        total_days = (end - start).days + 1

        print(f"\nFetching places for {total_days} days...")
        tourist_spots = await get_popular_places(preferences.region, "관광명소", preferences.areas)
        restaurants = await get_popular_places(preferences.region, "음식점", preferences.areas)
        cafes = await get_popular_places(preferences.region, "카페", preferences.areas)

        used_places_global = set()
        all_days = []
        batch_size = 5
        available_places = tourist_spots + restaurants + cafes
        
        for batch_start in range(0, total_days, batch_size):
            batch_end = min(batch_start + batch_size, total_days)
            current_days = batch_end - batch_start
            
            current_start = start + timedelta(days=batch_start)
            current_end = start + timedelta(days=batch_end - 1)
            
            available_tourist_spots = [p for p in tourist_spots[:50] if p['name'] not in used_places_global]
            available_restaurants = [p for p in restaurants[:50] if p['name'] not in used_places_global]
            available_cafes = [p for p in cafes[:50] if p['name'] not in used_places_global]
            
            place_list = "\n사용 가능한 장소 목록:\n"
            place_list += "\n관광명소:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in available_tourist_spots])
            place_list += "\n\n맛집:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in available_restaurants])
            place_list += "\n\n카페:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in available_cafes])
            
            batch_prompt = f"""
{preferences.region} 지역의 {batch_start + 1}일차부터 {batch_end}일차까지의 일정입니다.
연령대: {', '.join(f'{k}: {v}명' for k, v in preferences.travelers.items() if v > 0)}

규칙:
- 아침(8시), 점심(12:30), 저녁(18시)은 맛집 위주
- 오전/오후는 관광명소
- 중간에 카페 휴식 포함
- 저녁 이후는 야경이나 로컬 분위기 장소

{place_list}

일정 템플릿:"""

            for day in range(current_days):
                current_date = current_start + timedelta(days=day)
                batch_prompt += f"""

{batch_start + day + 1}일차 ({current_date.strftime('%Y-%m-%d')})
08:00 [아침식사] - 주소 - 설명
10:00 [관광] - 주소 - 설명
12:30 [점심식사] - 주소 - 설명
14:00 [관광] - 주소 - 설명
16:00 [카페] - 주소 - 설명
18:00 [저녁식사] - 주소 - 설명
20:00 [야간관광] - 주소 - 설명"""
            
 
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": batch_prompt}
                ],
                temperature=0.7,
                max_tokens=3000
            )
            
            generated_text = response.choices[0].message.content
            batch_course = parse_generated_text(
                generated_text, 
                current_start.strftime('%Y-%m-%d'), 
                current_end.strftime('%Y-%m-%d'), 
                available_places,
                used_places_global
            )
            
            for day in batch_course.days:
                day.spots = optimize_travel_course([day])[0].spots
                all_days.append(day)
            
            await asyncio.sleep(1.5)
        
        print(f"\nSuccessfully generated {len(all_days)} days of travel itinerary")
        return TravelCourse(days=all_days, tags=["추천 코스"])

    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
