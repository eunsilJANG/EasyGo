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


# Pydantic 모델 확장
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

class Weather(BaseModel):
    condition: str
    temperature: str

class TravelDay(BaseModel):
    date: str
    spots: List[TravelSpot]
    weather: Optional[Weather] = None

class TravelCourse(BaseModel):
    days: List[TravelDay]
    tags: List[str]

class TravelPreference(BaseModel):
    region: str  # 한글 지역명 (예: "제주", "서울", "부산" 등)
    areas: List[str]  # 선택된 세부 지역 목록
    startDate: str
    endDate: str
    ageGroups: List[str]  # ageGroup -> ageGroups로 변경하고 List 타입으로 수정
    travelers: dict

# 장소 상세 정보 조회 함수 수정
async def get_place_details(region: str, keyword: str, category_group_code: str = None) -> dict:
    """카카오 로컬 API를 사용하여 장소 상세 정보 조회"""
    print(f"\nSearching for: {keyword} in {region}")
    
    # 지역명을 포함한 검색어 생성
    search_keyword = f"{region} {keyword}"
    print(f"Search keyword: {search_keyword}")

    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    params = {
        "query": search_keyword,
        "page": 1,
        "size": 15
    }
    
    # 카테고리 그룹 코드 추가
    if category_group_code:
        params["category_group_code"] = category_group_code

    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            headers=headers,
            params=params
        ) as response:
            data = await response.json()
            print(f"Kakao API response: {data}")
            if not data.get("documents"):
                # 첫 번째 시도가 실패하면 카테고리 코드 없이 다시 시도
                params.pop("category_group_code", None)
                async with session.get(
                    "https://dapi.kakao.com/v2/local/search/keyword.json",
                    headers=headers,
                    params=params
                ) as retry_response:
                    retry_data = await retry_response.json()
                    if retry_data.get("documents"):
                        return retry_data["documents"][0]
            else:
                return data["documents"][0]
    return None

# 카테고리 그룹 코드 정의
CATEGORY_GROUP_CODES = {
    "관광명소": "AT4",  # 관광명소
    "숙박": "AD5",    # 숙박
    "음식점": "FD6",  # 음식점
    "카페": "CE7",    # 카페
    "지하철역": "SW8"  # 지하철역
}

async def get_place_reviews(place_name: str) -> List[str]:
    """네이버 검색 API를 사용하여 장소 리뷰 및 블로그 정보 조회"""
    print(f"\nSearching reviews for: {place_name}")
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://openapi.naver.com/v1/search/blog.json",
            headers=headers,
            params={"query": place_name, "display": 5}
        ) as response:
            data = await response.json()
            print(f"Naver API response: {data}")  # 응답 데이터 확인
            if data.get("items"):
                # HTML 태그 제거 및 텍스트 정제
                return [re.sub(r'<[^>]+>', '', item["description"]) for item in data.get("items", [])]
    return []

async def get_weather_forecast(region: str, date: str) -> dict:
    """기상청 API를 사용하여 날씨 정보 조회"""
    # 실제 기상청 API 연동 필요
    return {"condition": "맑음", "temperature": "23도"}


# GPT 프롬프트 수정
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


def are_locations_similar(naver_place: dict, kakao_place: dict) -> bool:
    """두 위치 정보가 비슷한지 확인"""
    # 주소 비교
    naver_addr = naver_place.get("roadAddress", "").split()[0:2]
    kakao_addr = kakao_place.get("road_address_name", "").split()[0:2]
    
    return bool(set(naver_addr) & set(kakao_addr))


def parse_generated_text(text: str, start_date: str, end_date: str, available_places: List[dict]) -> TravelCourse:
    print("\n=== Parsing Debug Logs ===")
    print("1. Input Text:")
    print(text)
    
    days = []
    available_place_names = {p['name'] for p in available_places}
    used_places = set()
    
    # 시작일과 종료일로 예상되는 날짜 수 계산
    start = datetime.strptime(start_date.split('T')[0], '%Y-%m-%d')
    end = datetime.strptime(end_date.split('T')[0], '%Y-%m-%d')
    expected_days = (end - start).days + 1
    print(f"\nExpected {expected_days} days of itinerary")
    
    # 일차별로 분리
    day_pattern = r'(\d+)일차\s*\(([^)]+)\)(.*?)(?=\d+일차|\Z)'
    day_matches = list(re.finditer(day_pattern, text, re.DOTALL))
    print(f"Found {len(day_matches)} days in the generated text")
    
    if len(day_matches) < expected_days:
        print(f"Warning: Generated text has fewer days ({len(day_matches)}) than expected ({expected_days})")
    
    for match in day_matches:
        day_num = match.group(1)
        date = match.group(2).split('T')[0]
        content = match.group(3)
        
        print(f"\nProcessing day {day_num} ({date})")
        
        spots = []
        spot_pattern = r'(\d{2}:\d{2})\s+([^-]+?)\s*-\s*([^-]+?)\s*-\s*(.+?)(?=\n\d{2}:\d{2}|\Z)'
        spot_matches = list(re.finditer(spot_pattern, content.strip(), re.DOTALL))
        print(f"Found {len(spot_matches)} spots for day {day_num}")
        
        for spot_match in spot_matches:
            time, name, address, description = [s.strip() for s in spot_match.groups()]
            clean_name = name.strip()
            
            print(f"\nProcessing spot: {clean_name}")
            
            if clean_name in available_place_names and clean_name not in used_places:
                place_info = next(p for p in available_places if p['name'] == clean_name)
                spots.append(TravelSpot(
                    name=clean_name,
                    time=time,
                    address=place_info['address'],
                    description=description.strip(),
                    category=place_info['category']
                ))
                used_places.add(clean_name)
                print(f"Added spot: {clean_name}")
            else:
                print(f"Skipped spot: {clean_name} (not found or already used)")
        
        # spots가 비어있어도 날짜는 추가
        days.append(TravelDay(
            date=date,
            spots=spots
        ))
        print(f"Added day {day_num} with {len(spots)} spots")
    
    print(f"\nFinal itinerary has {len(days)} days")
    for day in days:
        print(f"Day {day.date}: {len(day.spots)} spots")
    
    return TravelCourse(days=days, tags=["추천 코스"])

async def get_popular_places(region: str, category: str, areas: List[str]) -> List[dict]:
    print(f"\n=== Searching for {category} in {region} ===")
    print(f"Selected areas: {areas}")
    
    # 지역별 검색어 생성
    base_queries = get_base_queries(region, category, areas)
    
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    
    unique_places = {}
    total_api_results = 0
    
    for query in base_queries:
        print(f"\nSearching for query: {query}")
        
        for start_index in range(1, 1001, 100):
            params = {
                "query": query,
                "display": 100,
                "start": start_index,
                "sort": "sim"
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(NAVER_LOCAL_API_URL, headers=headers, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            items = data.get("items", [])
                            total = int(data.get("total", 0))
                            
                            print(f"Page {start_index//100 + 1}: Found {len(items)} items (Total: {total})")
                            
                            if not items:
                                print("No more results for this query")
                                break
                            
                            total_api_results += len(items)
                            
                            for item in items:
                                clean_title = re.sub(r'<[^>]+>', '', item["title"])
                                address = item["address"]
                                road_address = item.get("roadAddress", "")
                                
                                if clean_title not in unique_places:
                                    address_to_check = road_address if road_address else address
                                    
                                    # 지역 필터링: 주소가 선택된 지역과 세부 지역을 포함하는지 확인
                                    is_correct_region = region in address_to_check
                                    is_correct_area = any(area.replace(" ", "") in address_to_check.replace(" ", "") for area in areas)
                                    
                                    if is_correct_region and is_correct_area:
                                        unique_places[clean_title] = {
                                            "name": clean_title,
                                            "address": road_address if road_address else address,
                                            "category": category
                                        }
                                        print(f"Added: {clean_title} ({address_to_check})")
                                    else:
                                        print(f"Filtered out: {clean_title} ({address_to_check})")
                            
                            if len(items) < 100 or start_index + 100 > min(total, 1000):
                                break
                                
            except Exception as e:
                print(f"Error during API call: {e}")
                continue
            
            await asyncio.sleep(0.2)
    
    result = list(unique_places.values())
    print(f"\n=== Search Summary for {category} ===")
    print(f"Total API results processed: {total_api_results}")
    print(f"Unique places found: {len(result)}")
    
    return result

def get_region_keywords(region: str, areas: List[str]) -> List[str]:
    """지역별 검색 키워드 생성"""
    keywords = [region]
    
    # 기본 행정구역 접미사 추가
    keywords.extend([f"{region}시", f"{region}도"])
    
    # 선택된 세부 지역들 추가
    keywords.extend(areas)
    
    # 세부 지역에 시/군/구 접미사 추가
    for area in areas:
        if not any(suffix in area for suffix in ['시', '군', '구', '읍', '면', '동']):
            keywords.extend([f"{area}시", f"{area}군", f"{area}구"])
    
    return list(set(keywords))  # 중복 제거

def get_base_queries(region: str, category: str, areas: List[str]) -> List[str]:
    """카테고리별 기본 검색어 생성"""
    base_queries = []
    
    # 선택된 세부 지역들로 검색
    for area in areas:
        if category == "관광명소":
            base_queries.extend([
                f"{region} {area} 관광지",
                f"{region} {area} 명소",
                f"{area} 관광명소",
                f"{area} 여행지",
                f"{area} 가볼만한곳"
            ])
        elif category == "음식점":
            base_queries.extend([
                f"{region} {area} 맛집",
                f"{area} 맛집",
                f"{area} 음식점",
                f"{area} 식당",
                f"{area} 레스토랑"
            ])
        elif category == "카페":
            base_queries.extend([
                f"{region} {area} 카페",
                f"{area} 카페",
                f"{area} 디저트",
                f"{area} 커피숍",
                f"{area} 브런치"
            ])
    
    return list(set(base_queries))

async def verify_coordinates(place_name: str, address: str) -> Optional[Dict[str, float]]:
    """
    카카오 API를 사용하여 좌표를 검증
    """
    try:
        headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
        params = {"query": f"{address} {place_name}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(KAKAO_SEARCH_API_URL, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data["documents"]:
                        place = data["documents"][0]
                        lat = float(place["y"])
                        lng = float(place["x"])
                        return {"latitude": lat, "longitude": lng}
    except Exception as e:
        print(f"Error verifying coordinates for {place_name}: {e}")
    
    return None

async def verify_location_by_coordinates(coordinates: dict, target_region: str) -> bool:
    """카카오 API로 좌표의 실제 위치가 target_region인지 확인"""
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json",
                headers=headers,
                params={
                    "x": coordinates["lng"],
                    "y": coordinates["lat"]
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("documents"):
                        region_info = data["documents"][0]
                        # 주소에 target_region이 포함되어 있는지 확인
                        address = f"{region_info.get('region_1depth_name', '')} {region_info.get('region_2depth_name', '')}"
                        return target_region in address
        except Exception as e:
            print(f"Error verifying location: {str(e)}")
    return False

async def enhance_with_coordinates(place: dict) -> dict:
    """카카오 API로 장소의 좌표 정보만 보강"""
    print(f"\n[Kakao API] Getting coordinates for: {place['name']}")
    
    headers = {"Authorization": f"KakaoAK {KAKAO_REST_API_KEY}"}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://dapi.kakao.com/v2/local/search/keyword.json",
            headers=headers,
            params={
                "query": f"{place['address']} {place['name']}", # 주소를 포함하여 더 정확한 검색
                "size": 1
            }
        ) as response:
            if response.status == 200:
                data = await response.json()
                print(f"\n[Kakao API Call]")
                print(f"Query: {place['address']} {place['name']}")
                print(f"Status: {response.status}")
                
                if data.get("documents"):
                    kakao_place = data["documents"][0]
                    print(f"✓ Coordinates found: ({kakao_place.get('y')}, {kakao_place.get('x')})")
                    
                    place["coordinates"] = {
                        "lat": kakao_place.get("y"),
                        "lng": kakao_place.get("x")
                    }
                else:
                    print("✗ No coordinates found")
            else:
                print(f"✗ API Error: {response.status}")
    
    return place

def optimize_day_course(spots: List[TravelSpot]) -> List[TravelSpot]:
    """카카오 좌표를 기반으로 동선 최적화"""
    if len(spots) <= 2:
        return spots
    
    # 시간대별 고정 장소 (아침/점심/저녁 식사 등)는 유지
    fixed_times = ["08:00", "12:30", "18:00"]
    fixed_spots = [spot for spot in spots if any(spot.time.startswith(t) for t in fixed_times)]
    flexible_spots = [spot for spot in spots if spot not in fixed_spots]
    
    # 유동적인 장소들만 거리 기반으로 최적화
    if flexible_spots and all(spot.coordinates for spot in flexible_spots):
        # 거리 계산 및 정렬 로직
        for i in range(len(flexible_spots)-1):
            current = flexible_spots[i].coordinates
            min_dist = float('inf')
            min_idx = i + 1
            
            # 현재 지점에서 가장 가까운 다음 장소 찾기
            for j in range(i+1, len(flexible_spots)):
                next_spot = flexible_spots[j].coordinates
                if current and next_spot:  # coordinates가 None이 아닌 경우만
                    dist = ((float(current.lat) - float(next_spot.lat))**2 + 
                           (float(current.lng) - float(next_spot.lng))**2)**0.5
                    if dist < min_dist:
                        min_dist = dist
                        min_idx = j
            
            # 가장 가까운 장소를 다음 순서로 이동
            flexible_spots[i+1], flexible_spots[min_idx] = flexible_spots[min_idx], flexible_spots[i+1]
    
    # 최적화된 동선을 시간대별 고정 장소와 병합
    optimized_spots = []
    flex_idx = 0
    
    for spot in spots:
        if spot in fixed_spots:
            optimized_spots.append(spot)
        else:
            if flex_idx < len(flexible_spots):
                optimized_spots.append(flexible_spots[flex_idx])
                flex_idx += 1
            
    print(f"\n[Optimizing Route]")
    print(f"Fixed spots: {[spot.name for spot in fixed_spots]}")
    print(f"Flexible spots: {[spot.name for spot in flexible_spots]}")
    print(f"Optimized order: {[spot.name for spot in optimized_spots]}")
    
    return optimized_spots

def clean_place_name(name: str) -> str:
    # 일반적인 단어 제거
    remove_words = ["아침식사", "점심", "저녁식사", "카페"]
    for word in remove_words:
        name = name.replace(word, "").strip()
    return name

def limit_places_by_rating(places: List[dict], limit: int = 200) -> List[dict]:
    """평점이 높은 순으로 장소 제한"""
    return sorted(places, key=lambda x: float(x.get("rating", 0)), reverse=True)[:limit]

def simplify_address(address: str) -> str:
    """주소를 간단하게 만듦"""
    parts = address.split()
    return ' '.join(parts[:3]) if len(parts) > 3 else address

@router.post("", response_model=TravelCourse)
async def generate_travel_course(preferences: TravelPreference):
    try:
        print("\n=== Travel Course Generation Start ===")
        print(f"Received region: {preferences.region}")
        print(f"Selected areas: {preferences.areas}")
        
        start_date = preferences.startDate.split('T')[0]
        end_date = preferences.endDate.split('T')[0]
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        total_days = (end - start).days + 1

        # 장소 수집
        print("\n[Collecting Places]")
        tourist_spots = limit_places_by_rating(
            await get_popular_places(preferences.region, "관광명소", preferences.areas)
        )
        print(f"Tourist spots found: {len(tourist_spots)}")
        
        restaurants = limit_places_by_rating(
            await get_popular_places(preferences.region, "음식점", preferences.areas)
        )
        print(f"Restaurants found: {len(restaurants)}")
        
        cafes = limit_places_by_rating(
            await get_popular_places(preferences.region, "카페", preferences.areas)
        )
        print(f"Cafes found: {len(cafes)}")

        # 연령대 문자열 생성 (예: "20대, 30대와")
        age_groups_str = ', '.join(preferences.ageGroups)
        if age_groups_str.endswith(', '):
            age_groups_str = age_groups_str[:-2]
        age_groups_str += "와"

        prompt = f"""
당신은 {preferences.region} 지역 전문 여행 플래너입니다. 
{age_groups_str} 함께하는 {total_days}일간의 여행 일정을 만들어주세요.

여행 조건:
1. 여행객 정보:
   - 연령대: {age_groups_str}
   - 인원: {', '.join(f'{k}: {v}명' for k, v in preferences.travelers.items() if v > 0)}

2. 일정 구성 시 고려사항:
   - 아침은 호텔 조식 또는 현지 유명 식당
   - 점심과 저녁은 지역 맛집 추천
   - 관광지 사이에 휴식을 위한 카페 포함
   - 저녁에는 야경이 좋은 장소나 로컬 분위기의 장소 추천

3. 장소별 포함할 정보:
   - 정확한 도로명 주소
   - 유명한 메뉴나 볼거리
   - 예상 소요시간
   - 특별한 팁이나 주의사항
"""

        # 장소 목록을 프롬프트에 추가
        place_list = "\n실제 장소 목록:\n"
        place_list += "\n관광명소:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in tourist_spots])
        place_list += "\n\n맛집:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in restaurants])
        place_list += "\n\n카페:\n" + "\n".join([f"- {p['name']} ({simplify_address(p['address'])})" for p in cafes])
        
        prompt += place_list

        # 각 일차별 템플릿 추가
        for day in range(total_days):
            current_date = start + timedelta(days=day)
            prompt += f"""
{day+1}일차 ({current_date.strftime('%Y-%m-%d')})
08:00 [식당] - 주소 - 추천메뉴 및 설명
10:00 [관광명소] - 주소 - 주요 볼거리 및 설명
12:30 [식당] - 주소 - 추천메뉴 및 설명
14:00 [관광명소] - 주소 - 주요 볼거리 및 설명
16:00 [카페] - 주소 - 분위기 및 추천메뉴
18:00 [식당] - 주소 - 추천메뉴 및 설명
20:00 [관광명소] - 주소 - 특별한 즐길거리
"""

        # GPT 호출
        print("\n[GPT API Call for Course Generation]")
        print("System prompt:", system_prompt)
        print("User prompt length:", len(prompt))
        print("Place list sample:")
        print("- Tourist spots:", [p['name'] for p in tourist_spots[:3]])
        print("- Restaurants:", [p['name'] for p in restaurants[:3]])
        print("- Cafes:", [p['name'] for p in cafes[:3]])
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        generated_text = response.choices[0].message.content
        print("\n[GPT Response]")
        print("Response length:", len(generated_text))
        print("First 200 characters:", generated_text[:200])
        
        # 파싱
        print("\n[Parsing Response]")
        available_places = tourist_spots + restaurants + cafes
        base_course = parse_generated_text(generated_text, start_date, end_date, available_places)
        print(f"Parsed {len(base_course.days)} days")
        print(f"Total spots: {sum(len(day.spots) for day in base_course.days)}")
        
        # 각 일자별 동선 최적화
        for day in base_course.days:
            day.spots = optimize_day_course(day.spots)
        
        return base_course

    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

